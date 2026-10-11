const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function resolveExcelPath(defaultWindowsPath, filename) {
  try {
    if (process.platform === 'win32' && fs.existsSync(path.dirname(defaultWindowsPath))) {
      return defaultWindowsPath;
    }
  } catch (e) {}

  const targetDir = process.env.VERCEL ? '/tmp' : path.join(__dirname, 'data');
  if (!fs.existsSync(targetDir)) {
    try {
      fs.mkdirSync(targetDir, { recursive: true });
    } catch (e) {}
  }
  return path.join(targetDir, filename);
}

const DEFAULT_WINDOWS_LOGIN_PATH = 'C:\\Users\\Pranesh\\OneDrive\\Documents\\login_details.xlsx';
const DEFAULT_WINDOWS_MENU_PATH = 'C:\\Users\\Pranesh\\OneDrive\\Documents\\MENU.xlsx';

class ExcelStore {
  constructor() {
    this.loginFilePath = resolveExcelPath(DEFAULT_WINDOWS_LOGIN_PATH, 'login_details.xlsx');
    this.menuFilePath = resolveExcelPath(DEFAULT_WINDOWS_MENU_PATH, 'MENU.xlsx');
  }

  // ========================================================
  // LOGIN DETAILS EXCEL HELPERS (With Lunch Slot 12:05 / 12:55)
  // ========================================================
  readLoginDetails() {
    try {
      if (!fs.existsSync(this.loginFilePath)) {
        return [];
      }
      const wb = XLSX.readFile(this.loginFilePath);
      const sheetName = wb.SheetNames[0] || 'Sheet1';
      const sheet = wb.Sheets[sheetName];
      if (!sheet) return [];
      
      const rows = XLSX.utils.sheet_to_json(sheet);
      return rows.map(r => ({
        name: r['NAME'] || '',
        email: r['EMAIL_NAME'] || '',
        password: r['PASSWORD'] || '',
        phone: r['PHONE_NUMBER'] ? String(r['PHONE_NUMBER']) : '',
        userType: r['USERTYPE(CANTEEN_OWNER/CUSTOMER)'] || 'CUSTOMER',
        lunchSlot: r['LUNCH_SLOT'] || 'Slot 1: 12:05 PM'
      }));
    } catch (err) {
      console.error('Error reading login_details.xlsx:', err.message);
      return [];
    }
  }

  saveLoginDetails(users) {
    try {
      const rows = users.map(u => ({
        'NAME': u.name,
        'EMAIL_NAME': u.email,
        'PASSWORD': u.password || 'password123',
        'PHONE_NUMBER': u.phone || '9876543210',
        'USERTYPE(CANTEEN_OWNER/CUSTOMER)': u.userType || (u.role === 'admin' ? 'CANTEEN_OWNER' : 'CUSTOMER'),
        'LUNCH_SLOT': u.lunchSlot || (u.slotId === 'slot2' ? 'Slot 2: 12:55 PM' : 'Slot 1: 12:05 PM')
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows, {
        header: ['NAME', 'EMAIL_NAME', 'PASSWORD', 'PHONE_NUMBER', 'USERTYPE(CANTEEN_OWNER/CUSTOMER)', 'LUNCH_SLOT']
      });
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, this.loginFilePath);
      console.log(`[ExcelStore] Saved ${rows.length} users with slots to login_details.xlsx`);
      return true;
    } catch (err) {
      console.error('Error saving login_details.xlsx:', err.message);
      return false;
    }
  }

  addUserToLoginDetails(newUser) {
    try {
      const existing = this.readLoginDetails();
      const idx = existing.findIndex(u => (u.email || '').toLowerCase() === (newUser.email || '').toLowerCase());
      const formattedSlot = newUser.lunchSlot || (newUser.slotId === 'slot2' ? 'Slot 2: 12:55 PM' : 'Slot 1: 12:05 PM');
      
      const record = {
        name: newUser.name,
        email: newUser.email,
        password: newUser.password || 'student123',
        phone: newUser.phone || '9876543210',
        userType: newUser.userType || (newUser.role === 'admin' ? 'CANTEEN_OWNER' : 'CUSTOMER'),
        lunchSlot: formattedSlot
      };

      if (idx !== -1) {
        existing[idx] = { ...existing[idx], ...record };
      } else {
        existing.push(record);
      }
      return this.saveLoginDetails(existing);
    } catch (err) {
      console.error('Error adding user to login_details.xlsx:', err.message);
      return false;
    }
  }

  // ========================================================
  // MENU EXCEL HELPERS (Orders, Catalog, Food-Specific Feedback)
  // ========================================================
  readMenuOrders() {
    try {
      if (!fs.existsSync(this.menuFilePath)) {
        return [];
      }
      const wb = XLSX.readFile(this.menuFilePath);
      const sheet = wb.Sheets['Sheet1'];
      if (!sheet) return [];
      const rows = XLSX.utils.sheet_to_json(sheet);
      return rows;
    } catch (err) {
      console.error('Error reading orders from MENU.xlsx:', err.message);
      return [];
    }
  }

  readMenuCatalog() {
    try {
      if (!fs.existsSync(this.menuFilePath)) {
        return [];
      }
      const wb = XLSX.readFile(this.menuFilePath);
      const sheet = wb.Sheets['Menu_Catalog'];
      if (!sheet) return [];
      const rows = XLSX.utils.sheet_to_json(sheet);
      return rows.map(r => ({
        id: r['ITEM_ID'] || `menu-${Date.now()}`,
        name: r['FOOD_NAME'] || '',
        category: r['CATEGORY'] || 'Combos',
        type: (r['DIET_TYPE'] || 'veg').toLowerCase(),
        price: parseFloat(r['PRICE']) || 50,
        stock: parseInt(r['STOCK'], 10) || 30,
        dailyLimit: parseInt(r['DAILY_LIMIT'], 10) || 40,
        description: r['DESCRIPTION'] || ''
      }));
    } catch (err) {
      console.error('Error reading catalog from MENU.xlsx:', err.message);
      return [];
    }
  }

  saveFullMenuExcel(orders, menuCatalog, feedbacks) {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Orders / Token Preparation Log as defined by user's headers:
      // 'S.NO' | 'DATE' | 'TOKEN NUMBER' | 'FOOD NAME' | 'STATUS(PREPARED/NOT PREPARED)' | 'PAYMENT(PAID)'
      const orderRows = (orders || []).map((o, idx) => {
        const foodSummary = o.items ? o.items.map(i => `${i.name} (x${i.quantity})`).join(', ') : 'Assorted Meal';
        let status = 'NOT PREPARED';
        if (o.tokenStatus === 'REDEEMED') status = 'PREPARED & PICKED UP';
        else if (o.tokenStatus === 'ACTIVE') status = 'NOT PREPARED (QUEUED)';
        else if (o.tokenStatus === 'CANCELLED') status = 'CANCELLED';

        return {
          'S.NO': idx + 1,
          'DATE': o.orderDate,
          'TOKEN NUMBER': o.tokenCode,
          'FOOD NAME': foodSummary,
          'STATUS(PREPARED/NOT PREPARED)': status,
          'PAYMENT(PAID)': o.paymentStatus || 'PAID'
        };
      });

      const wsOrders = XLSX.utils.json_to_sheet(orderRows, {
        header: ['S.NO', 'DATE', 'TOKEN NUMBER', 'FOOD NAME', 'STATUS(PREPARED/NOT PREPARED)', 'PAYMENT(PAID)']
      });
      XLSX.utils.book_append_sheet(wb, wsOrders, 'Sheet1');

      // Sheet 2: Menu Items Catalog entered by Canteen Incharge
      if (menuCatalog && menuCatalog.length > 0) {
        const catalogRows = menuCatalog.map(m => ({
          'ITEM_ID': m.id,
          'FOOD_NAME': m.name,
          'CATEGORY': m.category,
          'DIET_TYPE': m.type,
          'PRICE': m.price,
          'STOCK': m.stock,
          'DAILY_LIMIT': m.dailyLimit,
          'DESCRIPTION': m.description || ''
        }));
        const wsCatalog = XLSX.utils.json_to_sheet(catalogRows, {
          header: ['ITEM_ID', 'FOOD_NAME', 'CATEGORY', 'DIET_TYPE', 'PRICE', 'STOCK', 'DAILY_LIMIT', 'DESCRIPTION']
        });
        XLSX.utils.book_append_sheet(wb, wsCatalog, 'Menu_Catalog');
      }

      // Sheet 3: Feedback Corner for Particular Food
      if (feedbacks && feedbacks.length > 0) {
        const feedbackRows = feedbacks.map(f => ({
          'FEEDBACK_ID': f.id,
          'FOOD_NAME': f.foodName || 'General Meal',
          'CUSTOMER_NAME': f.customerName,
          'ROLE': f.customerRole,
          'QUANTITY_RATING': f.quantityRating,
          'QUALITY_RATING': f.qualityRating,
          'COMMENT': f.comment,
          'DATE': f.orderDate
        }));
        const wsFeedback = XLSX.utils.json_to_sheet(feedbackRows, {
          header: ['FEEDBACK_ID', 'FOOD_NAME', 'CUSTOMER_NAME', 'ROLE', 'QUANTITY_RATING', 'QUALITY_RATING', 'COMMENT', 'DATE']
        });
        XLSX.utils.book_append_sheet(wb, wsFeedback, 'Food_Feedback');
      }

      XLSX.writeFile(wb, this.menuFilePath);
      console.log(`[ExcelStore] Updated MENU.xlsx (Sheet1: ${orderRows.length} order logs, Menu_Catalog: ${menuCatalog ? menuCatalog.length : 0} items)`);
      return true;
    } catch (err) {
      console.error('Error saving MENU.xlsx:', err.message);
      return false;
    }
  }

  syncOrderCreated(order, fullOrdersList, menuCatalog, feedbacks) {
    this.saveFullMenuExcel(fullOrdersList, menuCatalog, feedbacks);
  }

  syncTokenRedeemed(tokenCode, fullOrdersList, menuCatalog, feedbacks) {
    this.saveFullMenuExcel(fullOrdersList, menuCatalog, feedbacks);
  }

  ensureSeeded(defaultUsers, defaultOrders, defaultMenu, feedbacks) {
    try {
      const users = this.readLoginDetails();
      if (!users || users.length === 0) {
        console.log('[ExcelStore] Seeding initial users into login_details.xlsx...');
        this.saveLoginDetails(defaultUsers);
      } else {
        // Ensure any new users in database are merged
        console.log(`[ExcelStore] Found ${users.length} existing users in login_details.xlsx`);
      }

      const menuOrders = this.readMenuOrders();
      if (!menuOrders || menuOrders.length === 0) {
        console.log('[ExcelStore] Seeding initial orders and menu catalog into MENU.xlsx...');
        this.saveFullMenuExcel(defaultOrders, defaultMenu, feedbacks);
      }
    } catch (err) {
      console.error('[ExcelStore] Error during ensureSeeded:', err.message);
    }
  }
}

const excelStore = new ExcelStore();
module.exports = excelStore;
