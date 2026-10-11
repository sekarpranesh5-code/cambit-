const express = require('express');
const cors = require('cors');
const path = require('path');
const store = require('./dataStore');

const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Ensure public/uploads directory exists for food photos
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Request logger
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
  }
  next();
});

// ==========================================
// CAPTIVE PORTAL & CONNECTIVITY CHECK ROUTES
// Supports: http://.../generate_204, hotspot login, and friendly URL aliases
// ==========================================
app.get([
  '/generate_204',
  '/gen_204',
  '/connectivitycheck',
  '/hotspot-detect.html',
  '/canonical.html',
  '/ncsi.txt',
  '/connecttest.txt',
  '/cambit',
  '/canteen',
  '/menu',
  '/preorder'
], (req, res) => {
  res.redirect('/');
});

// ==========================================
// SYSTEM & CONFIGURATION ENDPOINTS
// ==========================================
app.get('/api/system', (req, res) => {
  try {
    const effectiveTime = store.getEffectiveTime();
    const capacities = store.getSlotCapacities(effectiveTime.date);
    const advanceSlot1 = store.checkAdvanceRule(effectiveTime.date, 'slot1');
    const advanceSlot2 = store.checkAdvanceRule(effectiveTime.date, 'slot2');

    res.json({
      success: true,
      system: store.data.system,
      effectiveTime,
      capacities,
      advanceRuleStatus: {
        slot1: advanceSlot1,
        slot2: advanceSlot2
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/system', (req, res) => {
  try {
    const updated = store.updateSystem(req.body);
    res.json({ success: true, system: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/system/reset-demo', (req, res) => {
  try {
    store.resetToDefault();
    res.json({ success: true, message: "Demo data reset successfully." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// FOOD IMAGE UPLOAD ENDPOINT
// Accepts food pictures from Laptop (Pictures/Downloads) or Phone (Gallery/Camera)
// ==========================================
app.post('/api/upload', (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, error: 'No image provided' });
    }

    // If it's already an existing relative path or web URL, return as is
    if (image.startsWith('/uploads/') || image.startsWith('http://') || image.startsWith('https://')) {
      return res.json({ success: true, imageUrl: image });
    }

    // On Vercel / serverless environment, data URLs work without persistent disk
    if (process.env.VERCEL) {
      return res.json({ success: true, imageUrl: image });
    }

    // Parse base64 Data URL
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ success: false, error: 'Invalid image format. Expected valid image data.' });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    let ext = 'jpg';
    if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('webp')) ext = 'webp';
    else if (mimeType.includes('gif')) ext = 'gif';

    const filename = `food-${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);

    fs.writeFileSync(filePath, buffer);
    const imageUrl = `/uploads/${filename}`;
    console.log(`[Upload] Food photo saved: ${imageUrl} (${Math.round(buffer.length / 1024)} KB)`);
    res.json({ success: true, imageUrl });
  } catch (err) {
    console.error('Upload error in /api/upload:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// MENU & INVENTORY ENDPOINTS
// ==========================================
app.get('/api/menu', (req, res) => {
  try {
    res.json({
      success: true,
      menu: store.data.menu
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/menu', (req, res) => {
  try {
    const { name, category, type, price, stock, dailyLimit, description, image, tag } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ success: false, error: "Name and Price are required" });
    }
    const item = store.addMenuItem({ name, category, type, price, stock, dailyLimit, description, image, tag });
    res.json({ success: true, item });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put('/api/menu/:id', (req, res) => {
  try {
    const updated = store.updateMenuItem(req.params.id, req.body);
    res.json({ success: true, item: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/menu/:id', (req, res) => {
  try {
    const deleted = store.deleteMenuItem(req.params.id);
    res.json({ success: true, deleted });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/menu/reset-stock', (req, res) => {
  try {
    const menu = store.resetDailyStock();
    res.json({ success: true, menu, message: "All item stock reset to daily limits." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// ORDERS & DIGITAL TOKEN ENDPOINTS
// ==========================================
app.get('/api/orders', (req, res) => {
  try {
    const { customerId, slotId, date } = req.query;
    let list = store.data.orders;
    if (customerId) {
      list = list.filter(o => o.customerId.toLowerCase() === customerId.toLowerCase());
    }
    if (slotId) {
      list = list.filter(o => o.slotId === slotId);
    }
    if (date) {
      list = list.filter(o => o.orderDate === date);
    }
    res.json({ success: true, orders: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { customerId, customerName, customerRole, customerEmail, slotId, orderDate, items, paymentMethod } = req.body;
    const order = await store.createOrder({
      customerId,
      customerName,
      customerRole,
      customerEmail,
      slotId,
      orderDate,
      items,
      paymentMethod
    });
    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Look up token
app.get('/api/tokens/:tokenCode', (req, res) => {
  try {
    const result = store.verifyToken(req.params.tokenCode);
    if (!result.found) {
      return res.status(404).json({ success: false, error: result.message });
    }
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Counter verification
app.post('/api/tokens/:tokenCode/verify', (req, res) => {
  try {
    const result = store.verifyToken(req.params.tokenCode);
    if (!result.found) {
      return res.status(404).json({ success: false, error: result.message });
    }
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Counter redemption / pickup handoff
app.post('/api/tokens/:tokenCode/redeem', (req, res) => {
  try {
    const staffName = req.body.staffName || "Counter Staff";
    const redeemedOrder = store.redeemToken(req.params.tokenCode, staffName);
    res.json({
      success: true,
      message: `Token ${redeemedOrder.tokenCode} marked as picked up successfully.`,
      order: redeemedOrder
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// KITCHEN BATCH PREP DASHBOARD ENDPOINT
// ==========================================
app.get('/api/admin/kitchen-batch', (req, res) => {
  try {
    const date = req.query.date || store.getEffectiveTime().date;
    const summary = store.getKitchenBatchSummary(date);
    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// FEEDBACK CORNER ENDPOINTS
// ==========================================
app.get('/api/feedback', (req, res) => {
  try {
    const analytics = store.getFeedbackAnalytics();
    res.json({ success: true, ...analytics });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/feedback', (req, res) => {
  try {
    const { orderId, tokenCode, foodName, customerName, customerRole, customerId, quantityRating, qualityRating, comment } = req.body;
    if (!quantityRating || !qualityRating) {
      return res.status(400).json({ success: false, error: "Both Quantity and Quality ratings are required." });
    }
    const feedback = store.addFeedback({
      orderId,
      tokenCode,
      foodName,
      customerName,
      customerRole,
      customerId,
      quantityRating,
      qualityRating,
      comment
    });
    res.status(201).json({ success: true, feedback });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// CANTEEN INCHARGE MESSAGING & NOTIFICATION
// ==========================================
app.post('/api/orders/notify-incharge', (req, res) => {
  try {
    const { tokenCode, slotName, customerName, items, totalPlates, totalAmount } = req.body;
    const itemsText = items ? items.map(i => `${i.quantity}x ${i.name}`).join(', ') : 'Assorted Dish';
    const message = `🔔 *CANTEEN KITCHEN PREPARATION ORDER*\nToken: ${tokenCode}\nShift: ${slotName}\nPlates: ${totalPlates}\nCustomer: ${customerName}\nItems: ${itemsText}\nAmount: Rs.${totalAmount}\nStatus: Please start preparation immediately!`;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=919876543212&text=${encodeURIComponent(message)}`;

    res.json({
      success: true,
      message: `Preparation alert dispatched to Canteen Incharge (+91 98765 43212) for Token ${tokenCode}.`,
      alertDetails: {
        tokenCode,
        slotName,
        customerName,
        itemsText,
        totalPlates,
        timestamp: new Date().toLocaleTimeString(),
        recipient: "Chef Sundaram M. (Canteen Incharge)",
        recipientPhone: "+91 98765 43212",
        whatsappUrl
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// AUTHENTICATION & LOGIN DETAILS EXCEL ENDPOINTS
// ==========================================
app.get('/api/auth/users', (req, res) => {
  try {
    const users = store.getUsers();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password, phone, role, userType, id, lunchSlot, slotId } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, error: "Name and Email are required." });
    }
    const user = store.registerUser({ name, email, password, phone, role, userType, id, lunchSlot, slotId });
    res.status(201).json({ success: true, user, message: "Account registered successfully." });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const users = store.getUsers();
    const user = users.find(u => 
      (u.email || '').toLowerCase() === (email || '').toLowerCase()
    );

    if (!user) {
      return res.status(404).json({ success: false, error: "Account not found with this email." });
    }

    if (user.password && password && user.password !== password) {
      return res.status(401).json({ success: false, error: "Invalid password." });
    }

    const role = user.role || (user.userType === 'CANTEEN_OWNER' ? 'admin' : 'student');
    const userToSend = {
      ...user,
      role,
      id: user.id || (role === 'admin' ? 'STAFF-01' : (user.phone ? 'STU-' + user.phone.slice(-4) : 'STU-1001'))
    };

    res.json({ success: true, user: userToSend, message: "Login successful." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// EXCEL STORAGE DIAGNOSTICS & SYNC ENDPOINT
// ==========================================
app.get('/api/excel-status', (req, res) => {
  try {
    const excelStore = require('./excelStore');
    const fs = require('fs');
    const loginExists = fs.existsSync(excelStore.loginFilePath);
    const menuExists = fs.existsSync(excelStore.menuFilePath);
    const users = excelStore.readLoginDetails();
    const orders = excelStore.readMenuOrders();

    res.json({
      success: true,
      loginExcel: {
        path: excelStore.loginFilePath,
        exists: loginExists,
        userCount: users.length,
        users
      },
      menuExcel: {
        path: excelStore.menuFilePath,
        exists: menuExists,
        ordersCount: orders.length,
        catalogCount: store.data.menu.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/excel-sync', (req, res) => {
  try {
    const excelStore = require('./excelStore');
    excelStore.saveLoginDetails(store.data.users);
    excelStore.saveFullMenuExcel(store.data.orders, store.data.menu);
    res.json({ success: true, message: "Both login_details.xlsx and MENU.xlsx synchronized successfully." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Catch-all route to serve SPA
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const os = require('os');

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254')) {
        addresses.push({ name, ip: iface.address });
      }
    }
  }
  return addresses;
}

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    const ips = getLocalIpAddresses();
    const hostName = os.hostname();
    console.log(`=======================================================`);
    console.log(`  🚀 Cambit Real-Time Canteen Pre-Order System LIVE!   `);
    console.log(`  💻 Host Machine URL : http://localhost:${PORT}        `);
    console.log(`  🌐 Network Link     : http://${hostName}.local:${PORT} `);
    ips.forEach(i => {
      console.log(`  📱 Mobile IP Link (${i.name}): http://${i.ip}:${PORT}`);
      console.log(`  🔗 Captive Link   : http://${i.ip}:${PORT}/generate_204`);
    });
    console.log(`=======================================================`);
  });
}

module.exports = app;
