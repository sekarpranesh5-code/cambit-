const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const excelStore = require('./excelStore');

const DATA_FILE = path.join(__dirname, 'data', 'database.json');

const DEFAULT_USERS = [
  {
    name: "Aarav Sharma",
    email: "aarav.cs23@college.edu",
    password: "student123",
    phone: "9876543210",
    role: "student",
    userType: "CUSTOMER",
    lunchSlot: "Slot 1: 12:05 PM",
    slotId: "slot1"
  },
  {
    name: "Dr. Meenakshi Raman",
    email: "m.raman@college.edu",
    password: "faculty123",
    phone: "9876543211",
    role: "faculty",
    userType: "CUSTOMER",
    lunchSlot: "Slot 1: 12:05 PM",
    slotId: "slot1"
  },
  {
    name: "Sundaram M. (Owner)",
    email: "canteen.owner@college.edu",
    password: "admin123",
    phone: "9876543212",
    role: "admin",
    userType: "CANTEEN_OWNER",
    lunchSlot: "Slot 1: 12:05 PM",
    slotId: "slot1"
  }
];

// Helper to get today's date formatted as YYYY-MM-DD
function getTodayString() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Initial seed dataset
function getInitialData() {
  const today = getTodayString();
  return {
    system: {
      holidayMode: false,
      eventMode: false,
      holidayReason: "Sunday / Scheduled Campus Holiday. Canteen pre-ordering is currently offline.",
      eventReason: "Annual Tech Symposium 'INNOVENT 2026' in progress. Regular canteen pre-orders temporarily suspended.",
      slot1: {
        id: "slot1",
        name: "Slot 1: 12:05 PM",
        time: "12:05",
        cutoffTime: "11:05",
        description: "Lighter crowd window (Early Lunch)",
        capacity: 45
      },
      slot2: {
        id: "slot2",
        name: "Slot 2: 12:55 PM",
        time: "12:55",
        cutoffTime: "11:55",
        description: "Heavy crowd window (Peak Lunch)",
        capacity: 60
      },
      // Simulation mode allows testing at any time of day
      useSimulationTime: true,
      simulationTime: "10:30", // 10:30 AM allows ordering for both slots by default
      simulationDate: today
    },
    menu: [
      {
        id: "menu-1",
        name: "Hyderabadi Chicken Dum Biryani",
        category: "Rice & Biryani",
        type: "non-veg",
        price: 140,
        stock: 42,
        dailyLimit: 50,
        description: "Authentic dum-cooked spiced basmati rice with tender marinated chicken, served with onion raita & mirchi ka salan.",
        image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80",
        tag: "Bestseller"
      },
      {
        id: "menu-2",
        name: "Royal Paneer Dum Biryani",
        category: "Rice & Biryani",
        type: "veg",
        price: 120,
        stock: 32,
        dailyLimit: 40,
        description: "Aromatic basmati rice layered with seasoned paneer cubes, saffron, mint and crispy fried onions.",
        image: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=500&auto=format&fit=crop&q=80",
        tag: "Popular"
      },
      {
        id: "menu-3",
        name: "South Indian Executive Thali",
        category: "Thali & Meals",
        type: "veg",
        price: 90,
        stock: 35,
        dailyLimit: 45,
        description: "Steamed Ponni rice, Sambar, Rasam, Kara Kuzhambu, Poriyal, Kootu, Appalam, Curd & Payasam sweet.",
        image: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=500&auto=format&fit=crop&q=80",
        tag: "Healthy"
      },
      {
        id: "menu-4",
        name: "Deluxe North Indian Thali",
        category: "Thali & Meals",
        type: "veg",
        price: 130,
        stock: 28,
        dailyLimit: 35,
        description: "Paneer Butter Masala, Dal Makhani, 3 Soft Butter Rotis, Jeera Rice, Salad, Pickle & Gulab Jamun.",
        image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&auto=format&fit=crop&q=80",
        tag: "Chef Special"
      },
      {
        id: "menu-5",
        name: "Schezwan Veg Fried Rice & Manchurian",
        category: "Combos",
        type: "veg",
        price: 105,
        stock: 22,
        dailyLimit: 30,
        description: "Spicy wok-tossed Schezwan vegetable rice served with 4 vegetable Manchurian balls in rich savory gravy.",
        image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=500&auto=format&fit=crop&q=80",
        tag: "Campus Hit"
      },
      {
        id: "menu-6",
        name: "Egg Fried Rice & Chilli Chicken",
        category: "Combos",
        type: "non-veg",
        price: 135,
        stock: 19,
        dailyLimit: 25,
        description: "Fluffy egg fried rice paired with spicy Indo-Chinese dry chilli chicken with bell peppers & spring onions.",
        image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=80",
        tag: "Staff Choice"
      },
      {
        id: "menu-7",
        name: "Ghee Podi Masala Dosa",
        category: "Quick Bites",
        type: "veg",
        price: 65,
        stock: 14,
        dailyLimit: 25,
        description: "Golden crispy crepe smeared with aromatic gunpowder podi and desi ghee, stuffed with seasoned potato masala.",
        image: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&auto=format&fit=crop&q=80",
        tag: "Crispy"
      },
      {
        id: "menu-8",
        name: "Crispy Samosa Chaat (2 Pcs)",
        category: "Quick Bites",
        type: "veg",
        price: 50,
        stock: 0, // Demonstrates sold out lockout
        dailyLimit: 30,
        description: "Crushed potato samosas topped with warm chana masala, sweet tamarind chutney, spicy mint chutney & sev.",
        image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80",
        tag: "Sold Out Demo"
      },
      {
        id: "menu-9",
        name: "Chilled Mango Lassi (300ml)",
        category: "Beverages",
        type: "veg",
        price: 45,
        stock: 24,
        dailyLimit: 30,
        description: "Thick, creamy yogurt shake prepared with sweet Alphonso mango pulp, cardamom, and pistachio slivers.",
        image: "https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=500&auto=format&fit=crop&q=80",
        tag: "Chilled"
      },
      {
        id: "menu-10",
        name: "Cold-Pressed Sweet Lime Juice",
        category: "Beverages",
        type: "veg",
        price: 40,
        stock: 20,
        dailyLimit: 25,
        description: "Freshly squeezed sweet lime (Mosambi) juice with black salt and a dash of chaat masala. Zero added sugar.",
        image: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&auto=format&fit=crop&q=80",
        tag: "Natural"
      }
    ],
    orders: [
      {
        id: "ORD-9821",
        tokenCode: "TKN-1205-9821",
        customerId: "CS2023-084",
        customerName: "Aarav Sharma",
        customerRole: "student",
        customerEmail: "aarav.cs23@college.edu",
        orderDate: today,
        slotId: "slot1",
        slotName: "Slot 1: 12:05 PM",
        orderPlacedAt: `${today} 10:12:00`,
        items: [
          { menuId: "menu-1", name: "Hyderabadi Chicken Dum Biryani", price: 140, quantity: 2 },
          { menuId: "menu-9", name: "Chilled Mango Lassi (300ml)", price: 45, quantity: 2 }
        ],
        totalPlates: 2,
        totalAmount: 370,
        paymentStatus: "PAID",
        paymentMethod: "UPI (Google Pay)",
        transactionId: "TXN-UPI-88492041",
        tokenStatus: "ACTIVE", // ACTIVE | REDEEMED | CANCELLED
        redeemedAt: null,
        verifiedBy: null
      },
      {
        id: "ORD-9822",
        tokenCode: "TKN-1205-9822",
        customerId: "FAC-ECE-12",
        customerName: "Dr. Meenakshi Raman",
        customerRole: "faculty",
        customerEmail: "m.raman@college.edu",
        orderDate: today,
        slotId: "slot1",
        slotName: "Slot 1: 12:05 PM",
        orderPlacedAt: `${today} 09:45:00`,
        items: [
          { menuId: "menu-3", name: "South Indian Executive Thali", price: 90, quantity: 1 }
        ],
        totalPlates: 1,
        totalAmount: 90,
        paymentStatus: "PAID",
        paymentMethod: "Campus Smartcard",
        transactionId: "TXN-CARD-9921441",
        tokenStatus: "ACTIVE",
        redeemedAt: null,
        verifiedBy: null
      },
      {
        id: "ORD-9823",
        tokenCode: "TKN-1255-9823",
        customerId: "ME2022-105",
        customerName: "Rohan Varma",
        customerRole: "student",
        customerEmail: "rohan.me22@college.edu",
        orderDate: today,
        slotId: "slot2",
        slotName: "Slot 2: 12:55 PM",
        orderPlacedAt: `${today} 10:40:00`,
        items: [
          { menuId: "menu-2", name: "Royal Paneer Dum Biryani", price: 120, quantity: 1 },
          { menuId: "menu-5", name: "Schezwan Veg Fried Rice & Manchurian", price: 105, quantity: 1 }
        ],
        totalPlates: 2,
        totalAmount: 225,
        paymentStatus: "PAID",
        paymentMethod: "UPI (PhonePe)",
        transactionId: "TXN-UPI-33910811",
        tokenStatus: "ACTIVE",
        redeemedAt: null,
        verifiedBy: null
      },
      {
        id: "ORD-9818",
        tokenCode: "TKN-1205-9818",
        customerId: "CS2023-019",
        customerName: "Pooja Krishnan",
        customerRole: "student",
        customerEmail: "pooja.cs23@college.edu",
        orderDate: today,
        slotId: "slot1",
        slotName: "Slot 1: 12:05 PM",
        orderPlacedAt: `${today} 09:20:00`,
        items: [
          { menuId: "menu-4", name: "Deluxe North Indian Thali", price: 130, quantity: 1 }
        ],
        totalPlates: 1,
        totalAmount: 130,
        paymentStatus: "PAID",
        paymentMethod: "UPI (Paytm)",
        transactionId: "TXN-UPI-11940293",
        tokenStatus: "REDEEMED",
        redeemedAt: `${today} 12:08:15`,
        verifiedBy: "Counter 2 (Kavitha S.)"
      }
    ],
    feedbacks: [
      {
        id: "FB-101",
        orderId: "ORD-9818",
        tokenCode: "TKN-1205-9818",
        foodName: "Deluxe North Indian Thali",
        customerName: "Pooja Krishnan",
        customerRole: "student",
        customerId: "CS2023-019",
        orderDate: today,
        slotName: "Slot 1: 12:05 PM",
        quantityRating: 5,
        qualityRating: 5,
        comment: "North Indian Thali portion was very generous! Rotis were piping hot and paneer gravy was rich. Pre-ordering saved 25 minutes of break time.",
        createdAt: `${today} 12:45:00`
      },
      {
        id: "FB-102",
        orderId: "ORD-9810",
        tokenCode: "TKN-1255-9810",
        foodName: "South Indian Executive Thali",
        customerName: "Prof. Arvind Swaminathan",
        customerRole: "faculty",
        customerId: "FAC-MECH-04",
        orderDate: today,
        slotName: "Slot 2: 12:55 PM",
        quantityRating: 4,
        qualityRating: 5,
        comment: "Excellent food quality and seamless token counter verification. App eliminated the peak lunch rush completely.",
        createdAt: `${today} 13:20:00`
      },
      {
        id: "FB-103",
        orderId: "ORD-9805",
        tokenCode: "TKN-1205-9805",
        foodName: "Hyderabadi Chicken Dum Biryani",
        customerName: "Divya Nambiar",
        customerRole: "student",
        customerId: "BT2024-031",
        orderDate: today,
        slotName: "Slot 1: 12:05 PM",
        quantityRating: 5,
        qualityRating: 4,
        comment: "The Hyderabadi Chicken Biryani had generous pieces and aromatic basmati. Fast pickup with token QR scan.",
        createdAt: `${today} 12:35:00`
      }
    ],
    users: DEFAULT_USERS
  };
}

class DataStore {
  constructor() {
    this.data = null;
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        if (!this.data.users) {
          this.data.users = DEFAULT_USERS;
        }
      } else {
        this.resetToDefault();
      }
      // Ensure both Excel files are seeded & synchronized
      excelStore.ensureSeeded(this.data.users || DEFAULT_USERS, this.data.orders, this.data.menu);
    } catch (err) {
      console.error("Error reading database file, resetting to default:", err);
      this.resetToDefault();
    }
  }

  resetToDefault() {
    this.data = getInitialData();
    this.save();
    excelStore.saveLoginDetails(this.data.users);
    excelStore.saveFullMenuExcel(this.data.orders, this.data.menu);
  }

  save() {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error("Failed to write database file:", err);
    }
  }

  // User management synced with login_details.xlsx
  registerUser(userData) {
    if (!this.data.users) this.data.users = [];
    const idx = this.data.users.findIndex(u => (u.email || '').toLowerCase() === (userData.email || '').toLowerCase());
    const formattedSlot = userData.lunchSlot || (userData.slotId === 'slot2' ? 'Slot 2: 12:55 PM' : 'Slot 1: 12:05 PM');
    const userObj = {
      name: userData.name,
      email: userData.email,
      password: userData.password || 'password123',
      phone: userData.phone || '9876543210',
      role: userData.role || (userData.userType === 'CANTEEN_OWNER' ? 'admin' : 'student'),
      userType: userData.userType || (userData.role === 'admin' ? 'CANTEEN_OWNER' : 'CUSTOMER'),
      lunchSlot: formattedSlot,
      slotId: userData.slotId || (formattedSlot.includes('12:55') ? 'slot2' : 'slot1'),
      id: userData.id || userData.collegeId || `USR-${Math.floor(1000 + Math.random() * 9000)}`
    };

    if (idx !== -1) {
      this.data.users[idx] = { ...this.data.users[idx], ...userObj };
    } else {
      this.data.users.push(userObj);
    }
    this.save();
    excelStore.addUserToLoginDetails(userObj);
    return userObj;
  }

  getUsers() {
    const excelUsers = excelStore.readLoginDetails();
    if (excelUsers && excelUsers.length > 0) {
      return excelUsers;
    }
    return this.data.users || DEFAULT_USERS;
  }

  // Get current system effective date and time (supporting simulator)
  getEffectiveTime() {
    const sys = this.data.system;
    if (sys.useSimulationTime && sys.simulationTime) {
      return {
        isSimulated: true,
        date: sys.simulationDate || getTodayString(),
        time: sys.simulationTime, // e.g. "10:30"
        timestamp: `${sys.simulationDate || getTodayString()}T${sys.simulationTime}:00`
      };
    }
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return {
      isSimulated: false,
      date: getTodayString(),
      time: `${hours}:${minutes}`,
      timestamp: now.toISOString()
    };
  }

  // Evaluate strict 1-hour advance ordering rule
  // For targetDate & targetSlot (slot1: 12:05 -> cutoff 11:05; slot2: 12:55 -> cutoff 11:55)
  checkAdvanceRule(targetDate, slotId) {
    const effective = this.getEffectiveTime();
    const slot = this.data.system[slotId];
    if (!slot) {
      return { allowed: false, reason: "Invalid lunch slot selected." };
    }

    // If ordering for a future day, advance rule is automatically satisfied
    if (targetDate > effective.date) {
      return { allowed: true, reason: "Order is for future date, advance notice verified." };
    }

    // If order date is in the past
    if (targetDate < effective.date) {
      return { allowed: false, reason: "Cannot place orders for past dates." };
    }

    // Same date: Compare current time with slot cutoff
    // Cutoff time format: "11:05" or "11:55"
    const currentMins = this.timeToMinutes(effective.time);
    const cutoffMins = this.timeToMinutes(slot.cutoffTime);
    const slotMins = this.timeToMinutes(slot.time);

    if (currentMins >= cutoffMins) {
      return {
        allowed: false,
        reason: `Strict 1-Hour Rule: Orders for ${slot.name} closed at ${slot.cutoffTime}. Orders must be placed at least 60 minutes prior to pickup window. Current campus time is ${effective.time}.`,
        cutoffTime: slot.cutoffTime,
        currentTime: effective.time
      };
    }

    const minsRemaining = cutoffMins - currentMins;
    return {
      allowed: true,
      reason: `Advance ordering open. Closes in ${minsRemaining} minutes (at ${slot.cutoffTime}).`,
      minsRemaining
    };
  }

  timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  // Calculate current slot booking capacities
  getSlotCapacities(targetDate) {
    const date = targetDate || this.getEffectiveTime().date;
    const slot1Orders = this.data.orders.filter(o => o.orderDate === date && o.slotId === 'slot1' && o.tokenStatus !== 'CANCELLED');
    const slot2Orders = this.data.orders.filter(o => o.orderDate === date && o.slotId === 'slot2' && o.tokenStatus !== 'CANCELLED');

    const slot1Plates = slot1Orders.reduce((sum, o) => sum + (o.totalPlates || 1), 0);
    const slot2Plates = slot2Orders.reduce((sum, o) => sum + (o.totalPlates || 1), 0);

    const cap1 = this.data.system.slot1.capacity || 45;
    const cap2 = this.data.system.slot2.capacity || 60;

    return {
      date,
      slot1: {
        capacity: cap1,
        booked: slot1Plates,
        ordersCount: slot1Orders.length,
        available: Math.max(0, cap1 - slot1Plates),
        isFull: slot1Plates >= cap1
      },
      slot2: {
        capacity: cap2,
        booked: slot2Plates,
        ordersCount: slot2Orders.length,
        available: Math.max(0, cap2 - slot2Plates),
        isFull: slot2Plates >= cap2
      }
    };
  }

  // Kitchen batch preparation calculation
  getKitchenBatchSummary(targetDate) {
    const date = targetDate || this.getEffectiveTime().date;
    const activeOrders = this.data.orders.filter(o => o.orderDate === date && o.tokenStatus !== 'CANCELLED');

    const result = {
      date,
      slot1: {
        slotInfo: this.data.system.slot1,
        totalOrders: 0,
        totalPlates: 0,
        itemsMap: {},
        orders: []
      },
      slot2: {
        slotInfo: this.data.system.slot2,
        totalOrders: 0,
        totalPlates: 0,
        itemsMap: {},
        orders: []
      }
    };

    activeOrders.forEach(order => {
      const targetSlot = order.slotId === 'slot1' ? result.slot1 : result.slot2;
      targetSlot.totalOrders += 1;
      targetSlot.totalPlates += (order.totalPlates || 1);
      targetSlot.orders.push(order);

      order.items.forEach(item => {
        if (!targetSlot.itemsMap[item.name]) {
          targetSlot.itemsMap[item.name] = {
            menuId: item.menuId,
            name: item.name,
            totalQuantity: 0,
            unitPrice: item.price
          };
        }
        targetSlot.itemsMap[item.name].totalQuantity += item.quantity;
      });
    });

    // Convert itemsMap to array
    result.slot1.items = Object.values(result.slot1.itemsMap);
    result.slot2.items = Object.values(result.slot2.itemsMap);

    return result;
  }

  // Generate QR Data URL for a token
  async generateTokenQR(tokenCode, metadata) {
    try {
      const qrPayload = JSON.stringify({
        token: tokenCode,
        date: metadata.orderDate,
        slot: metadata.slotId,
        plates: metadata.totalPlates,
        customer: metadata.customerId,
        amount: metadata.totalAmount,
        status: metadata.tokenStatus || "ACTIVE"
      });
      return await QRCode.toDataURL(qrPayload, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 256,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
    } catch (err) {
      console.error("QR Code generation error:", err);
      return null;
    }
  }

  // Create a new order with token
  async createOrder({ customerId, customerName, customerRole, customerEmail, slotId, orderDate, items, paymentMethod }) {
    // 1. Check System Toggles
    if (this.data.system.holidayMode) {
      throw new Error(`Ordering disabled: ${this.data.system.holidayReason}`);
    }
    if (this.data.system.eventMode) {
      throw new Error(`Ordering disabled: ${this.data.system.eventReason}`);
    }

    // 2. Validate Slot
    const slot = this.data.system[slotId];
    if (!slot) {
      throw new Error("Invalid lunch time-slot.");
    }

    const effectiveDate = orderDate || this.getEffectiveTime().date;

    // 3. Validate Strict 1-Hour Advance Ordering Rule
    const advanceCheck = this.checkAdvanceRule(effectiveDate, slotId);
    if (!advanceCheck.allowed) {
      throw new Error(advanceCheck.reason);
    }

    // 4. Validate Items & Stock
    if (!items || !items.length) {
      throw new Error("Cart is empty. Please select food items.");
    }

    let calculatedTotal = 0;
    let totalPlatesCount = 0;
    const validatedItems = [];

    for (const orderItem of items) {
      const menuItem = this.data.menu.find(m => m.id === orderItem.menuId);
      if (!menuItem) {
        throw new Error(`Menu item not found: ${orderItem.menuId}`);
      }
      if (menuItem.stock < orderItem.quantity) {
        throw new Error(`Insufficient stock for "${menuItem.name}". Only ${menuItem.stock} plates remaining.`);
      }
      calculatedTotal += menuItem.price * orderItem.quantity;
      if (menuItem.category.includes('Thali') || menuItem.category.includes('Biryani') || menuItem.category.includes('Combos')) {
        totalPlatesCount += orderItem.quantity;
      } else {
        totalPlatesCount += orderItem.quantity;
      }
      validatedItems.push({
        menuId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: orderItem.quantity
      });
    }

    // 5. Check Slot Capacity
    const capacityStatus = this.getSlotCapacities(effectiveDate);
    const targetSlotStatus = capacityStatus[slotId];
    if (targetSlotStatus.booked + totalPlatesCount > targetSlotStatus.capacity) {
      throw new Error(`Time slot "${slot.name}" has reached maximum kitchen capacity (${targetSlotStatus.booked}/${targetSlotStatus.capacity} plates booked). Please select another slot.`);
    }

    // 6. Deduct inventory stock
    for (const orderItem of items) {
      const menuItem = this.data.menu.find(m => m.id === orderItem.menuId);
      if (menuItem) {
        menuItem.stock = Math.max(0, menuItem.stock - orderItem.quantity);
      }
    }

    // 7. Generate Unique Digital Token
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const slotPrefix = slotId === 'slot1' ? '1205' : '1255';
    const tokenCode = `TKN-${slotPrefix}-${randomSuffix}`;
    const orderId = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
    const effective = this.getEffectiveTime();

    const newOrder = {
      id: orderId,
      tokenCode,
      customerId: customerId || "CS2024-999",
      customerName: customerName || "Campus Guest",
      customerRole: customerRole || "student",
      customerEmail: customerEmail || "guest@college.edu",
      orderDate: effectiveDate,
      slotId,
      slotName: slot.name,
      orderPlacedAt: `${effective.date} ${effective.time}:00`,
      items: validatedItems,
      totalPlates: totalPlatesCount,
      totalAmount: calculatedTotal,
      paymentStatus: "PAID",
      paymentMethod: paymentMethod || "UPI (Prepaid)",
      transactionId: `TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      tokenStatus: "ACTIVE",
      redeemedAt: null,
      verifiedBy: null
    };

    // Generate QR Code data URL
    newOrder.qrCodeUrl = await this.generateTokenQR(tokenCode, newOrder);

    this.data.orders.unshift(newOrder);
    this.save();
    // Synchronize newly created order with MENU.xlsx
    excelStore.syncOrderCreated(newOrder, this.data.orders, this.data.menu);

    return newOrder;
  }

  // Token counter verification & redemption
  verifyToken(tokenCode) {
    const order = this.data.orders.find(o => o.tokenCode.toUpperCase() === tokenCode.trim().toUpperCase());
    if (!order) {
      return { found: false, message: "Token not found in canteen database." };
    }

    const effective = this.getEffectiveTime();
    const isDateMatch = order.orderDate === effective.date;

    return {
      found: true,
      order,
      isDateMatch,
      currentCampusDate: effective.date,
      status: order.tokenStatus
    };
  }

  redeemToken(tokenCode, verifiedByStaff = "Counter Staff") {
    const verification = this.verifyToken(tokenCode);
    if (!verification.found) {
      throw new Error("Invalid Token Code");
    }

    const order = verification.order;
    if (order.tokenStatus === "REDEEMED") {
      throw new Error(`Token already redeemed at ${order.redeemedAt} by ${order.verifiedBy || 'staff'}. Duplicate pickup blocked!`);
    }

    if (order.tokenStatus === "CANCELLED") {
      throw new Error("Token was cancelled or refunded.");
    }

    const effective = this.getEffectiveTime();
    order.tokenStatus = "REDEEMED";
    order.redeemedAt = `${effective.date} ${effective.time}`;
    order.verifiedBy = verifiedByStaff;

    this.save();
    // Synchronize redeemed status in MENU.xlsx
    excelStore.syncTokenRedeemed(order.tokenCode, this.data.orders, this.data.menu);

    return order;
  }

  // Add feedback
  addFeedback({ orderId, tokenCode, foodName, customerName, customerRole, customerId, quantityRating, qualityRating, comment }) {
    const effective = this.getEffectiveTime();
    const feedback = {
      id: `FB-${Math.floor(100 + Math.random() * 900)}`,
      orderId: orderId || null,
      tokenCode: tokenCode || null,
      foodName: foodName || "General Meal",
      customerName: customerName || "Anonymous",
      customerRole: customerRole || "student",
      customerId: customerId || "CAMPUS-USER",
      orderDate: effective.date,
      quantityRating: parseInt(quantityRating, 10) || 5,
      qualityRating: parseInt(qualityRating, 10) || 5,
      comment: comment ? comment.trim() : "Great food and prompt service!",
      createdAt: `${effective.date} ${effective.time}`
    };

    this.data.feedbacks.unshift(feedback);
    this.save();
    // Synchronize Sheet 3 in MENU.xlsx
    excelStore.saveFullMenuExcel(this.data.orders, this.data.menu, this.data.feedbacks);
    return feedback;
  }

  // Aggregate feedback analytics & item-specific ratings
  getFeedbackAnalytics() {
    const list = this.data.feedbacks;
    if (!list.length) {
      return {
        totalReviews: 0,
        avgQuantity: 5.0,
        avgQuality: 5.0,
        overallAvg: 5.0,
        byFood: {},
        feedbacks: []
      };
    }

    const totalQty = list.reduce((sum, f) => sum + f.quantityRating, 0);
    const totalQlt = list.reduce((sum, f) => sum + f.qualityRating, 0);

    const byFood = {};
    list.forEach(f => {
      const fname = f.foodName || "General Meal";
      if (!byFood[fname]) {
        byFood[fname] = { count: 0, totalQty: 0, totalQlt: 0 };
      }
      byFood[fname].count += 1;
      byFood[fname].totalQty += f.quantityRating;
      byFood[fname].totalQlt += f.qualityRating;
    });

    Object.keys(byFood).forEach(fname => {
      const b = byFood[fname];
      b.avgQty = (b.totalQty / b.count).toFixed(1);
      b.avgQlt = (b.totalQlt / b.count).toFixed(1);
      b.overall = (((b.totalQty + b.totalQlt) / (b.count * 2))).toFixed(1);
    });

    return {
      totalReviews: list.length,
      avgQuantity: (totalQty / list.length).toFixed(1),
      avgQuality: (totalQlt / list.length).toFixed(1),
      overallAvg: (((totalQty + totalQlt) / (list.length * 2))).toFixed(1),
      byFood,
      feedbacks: list
    };
  }

  // Menu inventory operations
  addMenuItem(itemData) {
    const newItem = {
      id: `menu-${Date.now()}`,
      name: itemData.name,
      category: itemData.category || "Combos",
      type: itemData.type || "veg",
      price: parseFloat(itemData.price) || 50,
      stock: parseInt(itemData.stock, 10) || 30,
      dailyLimit: parseInt(itemData.dailyLimit, 10) || parseInt(itemData.stock, 10) || 30,
      description: itemData.description || "",
      image: itemData.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80",
      tag: itemData.tag || "New"
    };
    this.data.menu.push(newItem);
    this.save();
    excelStore.saveFullMenuExcel(this.data.orders, this.data.menu);
    return newItem;
  }

  updateMenuItem(id, updates) {
    const item = this.data.menu.find(m => m.id === id);
    if (!item) throw new Error("Item not found");

    if (updates.name !== undefined) item.name = updates.name;
    if (updates.category !== undefined) item.category = updates.category;
    if (updates.type !== undefined) item.type = updates.type;
    if (updates.price !== undefined) item.price = parseFloat(updates.price);
    if (updates.stock !== undefined) item.stock = parseInt(updates.stock, 10);
    if (updates.dailyLimit !== undefined) item.dailyLimit = parseInt(updates.dailyLimit, 10);
    if (updates.description !== undefined) item.description = updates.description;
    if (updates.image !== undefined) item.image = updates.image;
    if (updates.tag !== undefined) item.tag = updates.tag;

    this.save();
    excelStore.saveFullMenuExcel(this.data.orders, this.data.menu);
    return item;
  }

  deleteMenuItem(id) {
    const idx = this.data.menu.findIndex(m => m.id === id);
    if (idx === -1) throw new Error("Item not found");
    const deleted = this.data.menu.splice(idx, 1);
    this.save();
    excelStore.saveFullMenuExcel(this.data.orders, this.data.menu);
    return deleted[0];
  }

  resetDailyStock() {
    this.data.menu.forEach(item => {
      item.stock = item.dailyLimit || 30;
    });
    this.save();
    excelStore.saveFullMenuExcel(this.data.orders, this.data.menu);
    return this.data.menu;
  }

  // Update System Controls
  updateSystem(settings) {
    if (settings.holidayMode !== undefined) this.data.system.holidayMode = Boolean(settings.holidayMode);
    if (settings.eventMode !== undefined) this.data.system.eventMode = Boolean(settings.eventMode);
    if (settings.holidayReason) this.data.system.holidayReason = settings.holidayReason;
    if (settings.eventReason) this.data.system.eventReason = settings.eventReason;

    if (settings.useSimulationTime !== undefined) this.data.system.useSimulationTime = Boolean(settings.useSimulationTime);
    if (settings.simulationTime) this.data.system.simulationTime = settings.simulationTime;
    if (settings.simulationDate) this.data.system.simulationDate = settings.simulationDate;

    if (settings.slot1Capacity !== undefined) {
      this.data.system.slot1.capacity = parseInt(settings.slot1Capacity, 10);
    }
    if (settings.slot2Capacity !== undefined) {
      this.data.system.slot2.capacity = parseInt(settings.slot2Capacity, 10);
    }

    this.save();
    return this.data.system;
  }
}

const store = new DataStore();
module.exports = store;
