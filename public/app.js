/**
 * Cambit - College Canteen Pre-Order & Kitchen Management
 * Frontend Client Application
 * Flow: Auth Gate with Slot -> Food Menu -> Canteen Incharge Alert -> Sample QR -> Unique Token -> Staff Phone Alert -> Particular Food Feedback
 */

// Application State
const state = {
  currentUser: null, // Starts null to display Auth Gate initially, or loads from session
  system: null,
  menu: [],
  cart: [],
  orders: [],
  feedbacks: [],
  feedbackAnalytics: { overallAvg: 4.7, avgQuantity: 4.7, avgQuality: 4.7, totalReviews: 3, byFood: {}, feedbacks: [] },
  selectedSlot: 'slot1', // 'slot1' (12:05 PM) or 'slot2' (12:55 PM)
  selectedDate: 'today',
  selectedPayMethod: 'Sample UPI (QR Payment)',
  activeCategory: 'ALL',
  activeDiet: 'ALL',
  searchQuery: '',
  activeAdminSubtab: 'kitchenBatch',
  staffAlertsStream: [],
  ratings: {
    quantityRating: 5,
    qualityRating: 5
  }
};

// ========================================================
// INITIALIZATION
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadInitialData();
  // Poll system and orders every 3.5 seconds to maintain real-time sync across all connected student devices
  setInterval(refreshSystemAndCapacities, 3500);
});

async function loadInitialData() {
  await fetchSystemInfo();
  await fetchMenu();
  await fetchFeedback();
  await fetchOrders();
  await fetchExcelStatus();
  updateHeroSlotRules();

  // Check if session user exists
  const storedUser = sessionStorage.getItem('cambit_user') || sessionStorage.getItem('campusbite_user');
  if (storedUser) {
    try {
      state.currentUser = JSON.parse(storedUser);
      if (state.currentUser.slotId) state.selectedSlot = state.currentUser.slotId;
    } catch (e) {
      state.currentUser = null;
    }
  }

  // Display initial screen: Auth Gate or Dashboard
  if (!state.currentUser) {
    showView('authGate');
  } else {
    renderUserProfile();
    if (state.currentUser.role === 'admin') {
      showView('admin');
    } else {
      showView('customer');
    }
  }
}

// ========================================================
// API DATA FETCHING
// ========================================================
async function fetchSystemInfo() {
  try {
    const res = await fetch('/api/system');
    const data = await res.json();
    if (data.success) {
      state.system = data;
      renderSystemBanners();
      updateSimulatorDisplay();
      updateHeroSlotRules();
      updateCheckoutSlotCards();
    }
  } catch (err) {
    console.error('Error fetching system info:', err);
  }
}

async function fetchMenu() {
  try {
    const res = await fetch('/api/menu');
    const data = await res.json();
    if (data.success) {
      state.menu = data.menu;
      renderMenu();
      populateParticularFoodDropdown();
      if (document.getElementById('subtabInventoryControl').classList.contains('active')) {
        renderAdminInventory();
      }
    }
  } catch (err) {
    console.error('Error fetching menu:', err);
  }
}

async function fetchFeedback() {
  try {
    const res = await fetch('/api/feedback');
    const data = await res.json();
    if (data.success) {
      state.feedbacks = data.feedbacks;
      state.feedbackAnalytics = data;
      renderFeedbackSummary();
      renderAdminFeedback();
      renderMenu(); // Re-render menu to update item-specific star ratings
    }
  } catch (err) {
    console.error('Error fetching feedback:', err);
  }
}

async function fetchOrders() {
  try {
    const res = await fetch('/api/orders');
    const data = await res.json();
    if (data.success) {
      state.orders = data.orders;
      updateActiveTokensBadge();
      updateStaffPhoneStreamFromOrders();
      if (document.getElementById('adminView').classList.contains('active')) {
        renderAdminKitchenBatch();
        renderAdminOrdersTable();
      }
    }
  } catch (err) {
    console.error('Error fetching orders:', err);
  }
}

async function refreshSystemAndCapacities() {
  await fetchSystemInfo();
  await fetchOrders();
}

async function fetchExcelStatus() {
  try {
    const res = await fetch('/api/excel-status');
    const data = await res.json();
    if (data.success) {
      const uEl = document.getElementById('excelUsersStatus');
      const mEl = document.getElementById('excelMenuStatus');
      if (uEl) uEl.innerHTML = `<span style="color: #16a34a; font-weight: 700;">Connected (${data.loginExcel.userCount} users in login_details.xlsx)</span>`;
      if (mEl) mEl.innerHTML = `<span style="color: #16a34a; font-weight: 700;">Connected (${data.menuExcel.ordersCount} orders in MENU.xlsx)</span>`;
    }
  } catch (err) {
    console.error('Error fetching Excel status:', err);
  }
}

async function triggerManualExcelSync() {
  try {
    const res = await fetch('/api/excel-sync', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Both login_details.xlsx & MENU.xlsx synchronized!', 'success');
      fetchExcelStatus();
    }
  } catch (err) {
    showToast('Failed to sync Excel files.', 'error');
  }
}

// ========================================================
// VIEW CONTROLLER
// ========================================================
function showView(viewName) {
  const gateView = document.getElementById('authGateView');
  const custView = document.getElementById('customerView');
  const adminView = document.getElementById('adminView');
  const navTabs = document.getElementById('navPortalTabs');
  const userProfileBtn = document.getElementById('userProfileBtn');
  const tabCust = document.getElementById('tabCustomerPortal');
  const tabAdmin = document.getElementById('tabAdminPortal');
  const simBar = document.getElementById('campusSimulatorBar');

  gateView.classList.remove('active');
  custView.classList.remove('active');
  adminView.classList.remove('active');

  if (viewName === 'authGate') {
    gateView.classList.add('active');
    if (navTabs) navTabs.classList.add('hidden');
    if (userProfileBtn) userProfileBtn.classList.add('hidden');
    if (simBar) simBar.classList.add('hidden');
  } else {
    if (simBar) simBar.classList.remove('hidden');
    if (navTabs) navTabs.classList.remove('hidden');
    if (userProfileBtn) userProfileBtn.classList.remove('hidden');

    const isAdmin = state.currentUser && (state.currentUser.role === 'admin' || state.currentUser.userType === 'CANTEEN_OWNER');

    // Only Canteen Incharge staff can see the Admin portal tab
    if (tabAdmin) {
      if (isAdmin) {
        tabAdmin.classList.remove('hidden');
      } else {
        tabAdmin.classList.add('hidden');
      }
    }

    if (viewName === 'customer') {
      custView.classList.add('active');
      if (tabCust) tabCust.classList.add('active');
      if (tabAdmin) tabAdmin.classList.remove('active');
    } else if (viewName === 'admin') {
      if (!isAdmin) {
        showToast('Access restricted to Canteen Incharge staff.', 'warning');
        showView('customer');
        return;
      }
      adminView.classList.add('active');
      if (tabAdmin) tabAdmin.classList.add('active');
      if (tabCust) tabCust.classList.remove('active');
      loadAdminSubtab(state.activeAdminSubtab);
    }
  }
}

function switchPortalTab(portal) {
  if (!state.currentUser) {
    showView('authGate');
    return;
  }
  const isAdmin = state.currentUser.role === 'admin' || state.currentUser.userType === 'CANTEEN_OWNER';
  if (portal === 'customer') {
    showView('customer');
  } else {
    if (!isAdmin) {
      showToast('Access restricted to Canteen Incharge staff.', 'warning');
      return;
    }
    showView('admin');
  }
}

// ========================================================
// STEP 1: AUTHENTICATION GATE (REGISTER WITH SLOT & LOGIN)
// ========================================================
function switchAuthGateTab(tab) {
  const btnReg = document.getElementById('tabShowRegister');
  const btnLog = document.getElementById('tabShowLogin');
  const secReg = document.getElementById('authRegisterSection');
  const secLog = document.getElementById('authLoginSection');

  if (tab === 'register') {
    if (btnReg) btnReg.classList.add('active');
    if (btnLog) btnLog.classList.remove('active');
    if (secReg) secReg.classList.remove('hidden');
    if (secLog) secLog.classList.add('hidden');
  } else {
    if (btnLog) btnLog.classList.add('active');
    if (btnReg) btnReg.classList.remove('active');
    if (secLog) secLog.classList.remove('hidden');
    if (secReg) secReg.classList.add('hidden');
  }
}

async function handleGateRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regFullName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const password = document.getElementById('regPassword').value.trim();
  const userType = document.getElementById('regUserType').value;
  const slotChoice = document.querySelector('input[name="gateSlotChoice"]:checked').value;

  const slotLabel = slotChoice === 'slot1' ? 'Slot 1: 12:05 PM' : 'Slot 2: 12:55 PM';
  const role = userType === 'CANTEEN_OWNER' ? 'admin' : 'student';

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        phone,
        password,
        userType,
        role,
        lunchSlot: slotLabel,
        slotId: slotChoice
      })
    });

    const data = await res.json();
    if (!data.success) {
      showToast(data.error || 'Registration failed.', 'error');
      return;
    }

    // Success! Save session and log in
    state.currentUser = data.user;
    state.currentUser.slotId = slotChoice;
    state.selectedSlot = slotChoice;
    sessionStorage.setItem('cambit_user', JSON.stringify(state.currentUser));

    showToast(`Account created successfully! Preferred Shift: ${slotLabel}`, 'success');
    renderUserProfile();
    fetchExcelStatus();

    if (role === 'admin' || userType === 'CANTEEN_OWNER') {
      showView('admin');
    } else {
      showView('customer');
    }
  } catch (err) {
    showToast('Network error during registration.', 'error');
    console.error(err);
  }
}

async function handleGateLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!data.success) {
      showToast(data.error || 'Login failed. Please check credentials.', 'error');
      return;
    }

    state.currentUser = data.user;
    // Map lunchSlot to slotId
    if (data.user.lunchSlot && data.user.lunchSlot.includes('12:55')) {
      state.selectedSlot = 'slot2';
      state.currentUser.slotId = 'slot2';
    } else {
      state.selectedSlot = 'slot1';
      state.currentUser.slotId = 'slot1';
    }

    sessionStorage.setItem('cambit_user', JSON.stringify(state.currentUser));
    showToast(`Welcome back, ${state.currentUser.name}!`, 'success');
    renderUserProfile();

    if (state.currentUser.role === 'admin' || state.currentUser.userType === 'CANTEEN_OWNER') {
      showView('admin');
    } else {
      showView('customer');
    }
  } catch (err) {
    showToast('Network error during login.', 'error');
    console.error(err);
  }
}

function selectDemoProfile(profileType) {
  if (profileType === 'student') {
    state.currentUser = {
      id: 'CS2023-084',
      name: 'Aarav Sharma',
      role: 'student',
      userType: 'CUSTOMER',
      email: 'aarav.cs23@college.edu',
      lunchSlot: 'Slot 1: 12:05 PM',
      slotId: 'slot1'
    };
    state.selectedSlot = 'slot1';
  } else if (profileType === 'faculty') {
    state.currentUser = {
      id: 'FAC-ECE-12',
      name: 'Dr. Meenakshi Raman',
      role: 'faculty',
      userType: 'CUSTOMER',
      email: 'm.raman@college.edu',
      lunchSlot: 'Slot 1: 12:05 PM',
      slotId: 'slot1'
    };
    state.selectedSlot = 'slot1';
  } else if (profileType === 'admin') {
    state.currentUser = {
      id: 'STAFF-01',
      name: 'Sundaram M.',
      role: 'admin',
      userType: 'CANTEEN_OWNER',
      email: 'canteen.owner@college.edu',
      lunchSlot: 'Slot 1: 12:05 PM',
      slotId: 'slot1'
    };
  }

  sessionStorage.setItem('cambit_user', JSON.stringify(state.currentUser));
  renderUserProfile();
  updateActiveTokensBadge();
  showToast(`Switched user profile to: ${state.currentUser.name}`, 'success');

  if (state.currentUser.role === 'admin' || state.currentUser.userType === 'CANTEEN_OWNER') {
    showView('admin');
  } else {
    showView('customer');
  }
}

function logoutUser() {
  state.currentUser = null;
  sessionStorage.removeItem('cambit_user');
  sessionStorage.removeItem('campusbite_user');
  showView('authGate');
  showToast('Logged out of system.', 'info');
}

// ========================================================
// STEP 2: USER PROFILE & SHIFT STRIP
// ========================================================
function renderUserProfile() {
  if (!state.currentUser) return;
  const navName = document.getElementById('navUserName');
  const navRole = document.getElementById('navUserRole');
  const navAvatar = document.getElementById('navUserAvatar');
  const stripName = document.getElementById('stripUserName');
  const stripAvatar = document.getElementById('stripUserAvatar');
  const stripSlot = document.getElementById('stripSlotName');

  const isAdmin = state.currentUser.role === 'admin' || state.currentUser.userType === 'CANTEEN_OWNER';
  const roleText = isAdmin ? 'Canteen Incharge' : `${capitalize(state.currentUser.role || 'student')} (${state.currentUser.id || 'Member'})`;
  const initials = isAdmin ? 'AD' : (state.currentUser.role === 'faculty' ? 'FC' : 'ST');
  const slotText = state.selectedSlot === 'slot1' ? 'Slot 1: 12:05 PM' : 'Slot 2: 12:55 PM';

  if (navName) navName.textContent = state.currentUser.name;
  if (navRole) navRole.textContent = roleText;
  if (navAvatar) navAvatar.textContent = initials;
  if (stripName) stripName.textContent = state.currentUser.name;
  if (stripAvatar) stripAvatar.textContent = initials;
  if (stripSlot) stripSlot.textContent = slotText;

  // Sync radio in cart
  const r1 = document.getElementById('radioSlot1');
  const r2 = document.getElementById('radioSlot2');
  if (r1 && r2) {
    if (state.selectedSlot === 'slot1') r1.checked = true;
    else r2.checked = true;
  }
}

function toggleUserShift() {
  state.selectedSlot = state.selectedSlot === 'slot1' ? 'slot2' : 'slot1';
  if (state.currentUser) {
    state.currentUser.slotId = state.selectedSlot;
    state.currentUser.lunchSlot = state.selectedSlot === 'slot1' ? 'Slot 1: 12:05 PM' : 'Slot 2: 12:55 PM';
    sessionStorage.setItem('cambit_user', JSON.stringify(state.currentUser));
  }
  renderUserProfile();
  updateCheckoutSlotCards();
  showToast(`Lunch shift changed to: ${state.selectedSlot === 'slot1' ? '12:05 PM (Slot 1)' : '12:55 PM (Slot 2)'}`, 'info');
}

// ========================================================
// MENU RENDERING WITH PARTICULAR FOOD STAR RATINGS
// ========================================================
function renderMenu() {
  const container = document.getElementById('menuGrid');
  if (!container) return;

  let items = [...state.menu];

  // Filters
  if (state.activeCategory !== 'ALL') {
    items = items.filter(i => i.category === state.activeCategory);
  }
  if (state.activeDiet !== 'ALL') {
    items = items.filter(i => i.type === state.activeDiet);
  }
  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase();
    items = items.filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q) || (i.description && i.description.toLowerCase().includes(q)));
  }

  if (items.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
        <p style="font-size: 1.1rem; font-weight: 700;">No food items found matching your filter.</p>
        <p style="font-size: 0.85rem;">Try clearing your search keyword or switching categories.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => {
    const isSoldOut = item.stock <= 0;
    const isLowStock = item.stock > 0 && item.stock <= 5;
    const dietIcon = item.type === 'veg' ? '🟢 Veg' : '🔴 Non-Veg';

    let stockBadge = `<span class="stock-pill in-stock">${item.stock} plates ready</span>`;
    if (isSoldOut) {
      stockBadge = `<span class="stock-pill sold-out">Sold Out</span>`;
    } else if (isLowStock) {
      stockBadge = `<span class="stock-pill low-stock">Only ${item.stock} plates left!</span>`;
    }

    // Particular food star rating from Feedback Corner
    const foodStats = state.feedbackAnalytics.byFood ? state.feedbackAnalytics.byFood[item.name] : null;
    let ratingBadge = `<span style="font-size: 0.78rem; color: var(--text-muted);">★ New Dish</span>`;
    if (foodStats && foodStats.count > 0) {
      ratingBadge = `<span style="font-size: 0.8rem; font-weight: 700; color: #b45309;">★ ${foodStats.avgQlt} (${foodStats.count} reviews)</span>`;
    }

    return `
      <div class="menu-card" data-id="${item.id}">
        <div class="card-img-wrapper">
          <img src="${item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80'}" alt="${item.name}" loading="lazy" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80'">
          <span class="badge-diet ${item.type}">${dietIcon}</span>
          ${item.tag ? `<span class="badge-tag">${item.tag}</span>` : ''}
          ${isSoldOut ? `<div class="sold-out-overlay">SOLD OUT</div>` : ''}
        </div>
        <div class="card-body">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem;">
            <span class="card-category">${item.category}</span>
            ${ratingBadge}
          </div>
          <h3 class="card-title">${item.name}</h3>
          <p class="card-desc">${item.description || ''}</p>
          <div class="stock-indicator">
            <span>Daily Kitchen Batch: ${item.dailyLimit || 50}</span>
            ${stockBadge}
          </div>
          <div class="card-footer">
            <span class="price-tag">₹${item.price}</span>
            <button class="btn-add-cart" 
                    ${isSoldOut ? 'disabled' : ''} 
                    onclick="addToCart('${item.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              ${isSoldOut ? 'Sold Out' : 'Pre-Order'}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ========================================================
// STEP 3: CART & NOTIFY CANTEEN INCHARGE
// ========================================================
function addToCart(itemId) {
  if (state.system.system.holidayMode) {
    showToast(`Ordering closed: ${state.system.system.holidayReason}`, 'warning');
    return;
  }
  if (state.system.system.eventMode) {
    showToast(`Ordering suspended: ${state.system.system.eventReason}`, 'warning');
    return;
  }

  const item = state.menu.find(m => m.id === itemId);
  if (!item || item.stock <= 0) {
    showToast('Item is sold out in kitchen inventory.', 'error');
    return;
  }

  const existing = state.cart.find(c => c.menuId === itemId);
  if (existing) {
    if (existing.quantity >= item.stock) {
      showToast(`Cannot add more. Only ${item.stock} plates available today.`, 'warning');
      return;
    }
    existing.quantity += 1;
  } else {
    state.cart.push({
      menuId: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      type: item.type,
      category: item.category
    });
  }

  updateCartBadges();
  showToast(`Added "${item.name}" to lunch pre-order tray!`, 'success');
}

function updateCartQuantity(menuId, delta) {
  const index = state.cart.findIndex(c => c.menuId === menuId);
  if (index === -1) return;

  const item = state.menu.find(m => m.id === menuId);
  const current = state.cart[index];
  const newQty = current.quantity + delta;

  if (newQty <= 0) {
    state.cart.splice(index, 1);
  } else {
    if (item && newQty > item.stock) {
      showToast(`Only ${item.stock} plates remaining in kitchen stock.`, 'warning');
      return;
    }
    current.quantity = newQty;
  }

  updateCartBadges();
  renderCartModal();
}

function updateCartBadges() {
  const totalCount = state.cart.reduce((s, i) => s + i.quantity, 0);
  
  const badge = document.getElementById('cartItemCount');
  if (badge) badge.textContent = totalCount;

  // Mobile Bottom Nav Cart Badge
  const mobileNavBadge = document.getElementById('mobileCartNavBadge');
  if (mobileNavBadge) {
    mobileNavBadge.textContent = totalCount;
    mobileNavBadge.classList.toggle('hidden', totalCount === 0);
  }
}

function openCartModal() {
  renderCartModal();
  updateCheckoutSlotCards();
  document.getElementById('cartModal').classList.remove('hidden');
}

function closeCartModal() {
  document.getElementById('cartModal').classList.add('hidden');
}

function renderCartModal() {
  const itemsContainer = document.getElementById('cartItemsContainer');
  const emptyState = document.getElementById('cartEmptyState');
  const slotSection = document.getElementById('checkoutSlotSection');
  const notifySection = document.getElementById('checkoutNotifyInchargeSection');
  const paymentSection = document.getElementById('checkoutPaymentSection');
  const footer = document.querySelector('.cart-modal-footer');
  const totalPlatesEl = document.getElementById('cartTotalPlates');
  const totalPriceEl = document.getElementById('cartTotalPrice');
  const previewBox = document.getElementById('inchargeMessagePreview');

  if (state.cart.length === 0) {
    itemsContainer.innerHTML = '';
    emptyState.classList.remove('hidden');
    slotSection.classList.add('hidden');
    if (notifySection) notifySection.classList.add('hidden');
    paymentSection.classList.add('hidden');
    footer.classList.add('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  slotSection.classList.remove('hidden');
  if (notifySection) notifySection.classList.remove('hidden');
  paymentSection.classList.remove('hidden');
  footer.classList.remove('hidden');

  let totalPlates = 0;
  let totalPrice = 0;

  itemsContainer.innerHTML = state.cart.map(item => {
    totalPlates += item.quantity;
    totalPrice += item.price * item.quantity;

    return `
      <div class="cart-item-row">
        <div class="cart-item-info">
          <strong>${item.name}</strong>
          <span>₹${item.price} × ${item.quantity} = ₹${item.price * item.quantity}</span>
        </div>
        <div class="cart-item-stepper">
          <button class="btn-step" onclick="updateCartQuantity('${item.menuId}', -1)">-</button>
          <span style="font-weight: 700; min-width: 20px; text-align: center;">${item.quantity}</span>
          <button class="btn-step" onclick="updateCartQuantity('${item.menuId}', 1)">+</button>
        </div>
      </div>
    `;
  }).join('');

  totalPlatesEl.textContent = `${totalPlates} total plate${totalPlates > 1 ? 's' : ''}`;
  totalPriceEl.textContent = `₹${totalPrice}`;

  // Update Incharge notification preview text
  if (previewBox) {
    const slotLabel = state.selectedSlot === 'slot1' ? '12:05 PM' : '12:55 PM';
    const itemsSummary = state.cart.map(i => `${i.quantity}x ${i.name}`).join(', ');
    previewBox.innerHTML = `
      <strong>Message to Chef Sundaram:</strong><br>
      "🔔 Prepare for ${slotLabel} shift: ${itemsSummary} (Total: ${totalPlates} plates). Storing to MENU.xlsx upon payment authorization."
    `;
  }
}

function updateCheckoutSlotCards() {
  if (!state.system) return;
  const caps = state.system.capacities;
  const advance = state.system.advanceRuleStatus;

  const card1 = document.getElementById('slotCard1');
  const card2 = document.getElementById('slotCard2');
  const notice1 = document.getElementById('slot1CutoffNotice');
  const notice2 = document.getElementById('slot2CutoffNotice');
  const capBar1 = document.getElementById('slot1CapacityBar');
  const capBar2 = document.getElementById('slot2CapacityBar');
  const errBanner = document.getElementById('slotRuleErrorBanner');

  const isToday = state.selectedDate === 'today';

  // Slot 1
  const s1Allowed = !isToday || advance.slot1.allowed;
  const s1Full = caps.slot1.isFull;
  if (card1) {
    card1.classList.toggle('disabled', !s1Allowed || s1Full);
    notice1.innerHTML = !s1Allowed 
      ? `<span style="color: var(--accent-red); font-weight: 700;">Locked: Cutoff Passed at 11:05 AM (Strict 1-Hr Rule)</span>`
      : `Cutoff: 11:05 AM (${advance.slot1.minsRemaining || 0}m left)`;
    const pct1 = Math.min(100, Math.round((caps.slot1.booked / caps.slot1.capacity) * 100));
    capBar1.innerHTML = `
      <div class="cap-meter"><div class="cap-fill" style="width: ${pct1}%"></div></div>
      <span class="cap-text">${caps.slot1.booked}/${caps.slot1.capacity} Plates (${caps.slot1.available} left)</span>
    `;
  }

  // Slot 2
  const s2Allowed = !isToday || advance.slot2.allowed;
  const s2Full = caps.slot2.isFull;
  if (card2) {
    card2.classList.toggle('disabled', !s2Allowed || s2Full);
    notice2.innerHTML = !s2Allowed
      ? `<span style="color: var(--accent-red); font-weight: 700;">Locked: Cutoff Passed at 11:55 AM (Strict 1-Hr Rule)</span>`
      : `Cutoff: 11:55 AM (${advance.slot2.minsRemaining || 0}m left)`;
    const pct2 = Math.min(100, Math.round((caps.slot2.booked / caps.slot2.capacity) * 100));
    capBar2.innerHTML = `
      <div class="cap-meter"><div class="cap-fill" style="width: ${pct2}%"></div></div>
      <span class="cap-text">${caps.slot2.booked}/${caps.slot2.capacity} Plates (${caps.slot2.available} left)</span>
    `;
  }

  // Active validation check
  const currentSlotAllowed = state.selectedSlot === 'slot1' ? s1Allowed : s2Allowed;
  const currentSlotFull = state.selectedSlot === 'slot1' ? s1Full : s2Full;

  if (!currentSlotAllowed) {
    errBanner.classList.remove('hidden');
    errBanner.innerHTML = `
      <strong>1-Hour Advance Ordering Violation:</strong><br>
      You selected ${state.selectedSlot === 'slot1' ? 'Slot 1 (12:05 PM)' : 'Slot 2 (12:55 PM)'}, but the 60-minute advance cutoff has passed for today. Please switch to the open shift or order for <strong>Tomorrow</strong>.
    `;
  } else if (currentSlotFull) {
    errBanner.classList.remove('hidden');
    errBanner.innerHTML = `<strong>Slot Fully Booked:</strong> Kitchen capacity reached for this shift.`;
  } else {
    errBanner.classList.add('hidden');
  }
}

// ========================================================
// STEP 4: SAMPLE PAYMENT GATEWAY WITH SAMPLE QR CODE
// ========================================================
function proceedToPayment() {
  if (state.cart.length === 0) {
    showToast('Your pre-order tray is empty.', 'warning');
    return;
  }
  if (state.system.system.holidayMode || state.system.system.eventMode) {
    showToast('Pre-ordering is disabled by canteen management.', 'error');
    return;
  }

  // Strict 1-hour rule validation
  const isToday = state.selectedDate === 'today';
  const advance = state.system.advanceRuleStatus;
  const currentAdvance = advance[state.selectedSlot];

  if (isToday && !currentAdvance.allowed) {
    showToast(`Strict 1-Hour rule violation: Cutoff passed at ${currentAdvance.cutoffTime}.`, 'error');
    return;
  }

  // Setup QR Code
  const totalPrice = state.cart.reduce((s, i) => s + (i.price * i.quantity), 0);
  const slotName = state.selectedSlot === 'slot1' ? 'Slot 1: 12:05 PM' : 'Slot 2: 12:55 PM';
  const customerName = state.currentUser ? state.currentUser.name : 'Student';

  document.getElementById('payModalAmount').textContent = `₹${totalPrice}`;
  document.getElementById('payModalCustomer').textContent = customerName;
  document.getElementById('payModalSlot').textContent = `${slotName} (${state.selectedDate === 'today' ? 'Today' : 'Tomorrow'})`;

  // Display Sample / Dummy UPI Payment QR Image
  const sampleQrImg = document.getElementById('samplePaymentQrImg');
  if (sampleQrImg) {
    const upiUri = `upi://pay?pa=campus.canteen@okhdfcbank&pn=Campus%20Canteen&am=${totalPrice}&cu=INR&tn=Canteen%20Preorder`;
    sampleQrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUri)}`;
    sampleQrImg.onerror = () => {
      // Fallback sample QR code SVG
      sampleQrImg.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23f8fafc"/><rect x="20" y="20" width="50" height="50" fill="%230f172a"/><rect x="30" y="30" width="30" height="30" fill="%23ffffff"/><rect x="37" y="37" width="16" height="16" fill="%230f172a"/><rect x="130" y="20" width="50" height="50" fill="%230f172a"/><rect x="140" y="30" width="30" height="30" fill="%23ffffff"/><rect x="147" y="37" width="16" height="16" fill="%230f172a"/><rect x="20" y="130" width="50" height="50" fill="%230f172a"/><rect x="30" y="140" width="30" height="30" fill="%23ffffff"/><rect x="37" y="147" width="16" height="16" fill="%230f172a"/><rect x="85" y="20" width="15" height="15" fill="%230f172a"/><rect x="105" y="35" width="15" height="15" fill="%230f172a"/><rect x="85" y="85" width="30" height="30" fill="%232563eb"/><text x="100" y="105" font-family="sans-serif" font-size="10" font-weight="bold" fill="%23ffffff" text-anchor="middle">UPI</text><rect x="135" y="85" width="15" height="30" fill="%230f172a"/><rect x="160" y="100" width="20" height="15" fill="%230f172a"/><rect x="85" y="135" width="30" height="15" fill="%230f172a"/><rect x="130" y="130" width="20" height="20" fill="%230f172a"/><rect x="160" y="145" width="20" height="35" fill="%230f172a"/><rect x="85" y="165" width="35" height="15" fill="%230f172a"/><text x="100" y="195" font-family="sans-serif" font-size="9" fill="%2364748b" text-anchor="middle">SAMPLE UPI QR</text></svg>`;
    };
  }

  closeCartModal();
  document.getElementById('paymentModal').classList.remove('hidden');
}

// Place Order & Generate Token Instantly
async function confirmPaymentAndCreateOrder() {
  const btn = document.getElementById('btnConfirmPayment');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `⏳ Placing Order...`;
  }

  const userTxnRef = `TXN-UPI-${Math.floor(100000 + Math.random() * 900000)}`;

  try {
    const payload = {
      customerId: state.currentUser ? (state.currentUser.id || 'STU-1001') : 'STU-1001',
      customerName: state.currentUser ? state.currentUser.name : 'Student',
      customerRole: state.currentUser ? (state.currentUser.role || 'student') : 'student',
      customerEmail: state.currentUser ? state.currentUser.email : 'student@college.edu',
      slotId: state.selectedSlot,
      orderDate: state.selectedDate === 'today' ? state.system.effectiveTime.date : getTomorrowDateString(),
      items: state.cart,
      paymentMethod: state.selectedPayMethod || 'UPI (Direct QR Payment)',
      transactionId: userTxnRef
    };

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `🛍️ Place Order`;
    }

    if (!data.success) {
      showToast(data.error || 'Failed to place order.', 'error');
      return;
    }

    const newOrder = data.order;
    if (userTxnRef) newOrder.transactionId = userTxnRef;

    // Close payment modal immediately
    document.getElementById('paymentModal').classList.add('hidden');

    // Clear cart and refresh
    state.cart = [];
    updateCartBadges();

    // Immediately present digital token
    presentDigitalToken(newOrder);
    showToast('Order Placed Successfully! Token Generated.', 'success');

    // Send automated notification to Canteen Incharge safely
    try {
      await notifyCanteenIncharge(newOrder);
    } catch (e) {
      console.warn('Incharge notification:', e);
    }

    try {
      await fetchMenu();
      await fetchOrders();
      await fetchSystemInfo();
      await fetchExcelStatus();
    } catch (e) {
      console.warn('Sync refresh:', e);
    }
  } catch (err) {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `🛍️ Place Order`;
    }
    document.getElementById('paymentModal').classList.add('hidden');
    showToast('Network error while placing order.', 'error');
    console.error(err);
  }
}

// ========================================================
// STEP 5: UNIQUE DIGITAL TOKEN & STAFF PHONE DISPATCH
// ========================================================
async function notifyCanteenIncharge(order) {
  try {
    const res = await fetch('/api/orders/notify-incharge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenCode: order.tokenCode,
        slotName: order.slotName,
        customerName: order.customerName,
        items: order.items,
        totalPlates: order.totalPlates,
        totalAmount: order.totalAmount
      })
    });
    const data = await res.json();
    if (data.success) {
      // Add to live staff stream
      state.staffAlertsStream.unshift({
        tokenCode: order.tokenCode,
        time: new Date().toLocaleTimeString(),
        customer: order.customerName,
        shift: order.slotName,
        plates: order.totalPlates,
        itemsSummary: order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')
      });
      renderStaffPhoneStream();
    }
  } catch (err) {
    console.error('Incharge notify error:', err);
  }
}

function updateStaffPhoneStreamFromOrders() {
  state.staffAlertsStream = state.orders.map(o => ({
    tokenCode: o.tokenCode,
    time: o.orderPlacedAt ? o.orderPlacedAt.split(' ')[1] : '10:30:00',
    customer: o.customerName,
    shift: o.slotName,
    plates: o.totalPlates,
    itemsSummary: o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')
  }));
  renderStaffPhoneStream();
}

function renderStaffPhoneStream() {
  const container = document.getElementById('staffPhoneAlertsFeed');
  if (!container) return;

  if (state.staffAlertsStream.length === 0) {
    container.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted); padding: 1rem;">No phone alerts received today yet.</p>`;
    return;
  }

  container.innerHTML = state.staffAlertsStream.slice(0, 8).map(a => `
    <div class="pickup-event" style="background: #f0fdf4; border-color: #bbf7d0;">
      <div>
        <span style="font-size: 1.1rem; margin-right: 0.3rem;">📲</span>
        <strong class="code-badge">${a.tokenCode}</strong>
        <span style="margin-left: 0.4rem; font-weight: 600;">${a.itemsSummary} (${a.plates} plates)</span>
      </div>
      <div style="font-size: 0.75rem; color: #166534; font-weight: 700;">
        <span>${a.shift} • ${a.time}</span>
      </div>
    </div>
  `).join('');
}

function presentDigitalToken(order) {
  document.getElementById('tokenDisplayCode').textContent = order.tokenCode;
  document.getElementById('tokenDisplaySlot').textContent = order.slotName;
  document.getElementById('tokenDisplayDate').textContent = `${order.orderDate} (${new Date().toLocaleDateString('en-US', { weekday: 'short' })})`;
  document.getElementById('tokenDisplayPlates').textContent = `${order.totalPlates} Plate${order.totalPlates > 1 ? 's' : ''}`;
  document.getElementById('tokenDisplayCustomer').textContent = `${order.customerName} (${order.customerId})`;
  document.getElementById('tokenDisplayTxn').textContent = order.transactionId || 'TXN-FASTPAY-VERIFIED';

  const badge = document.getElementById('tokenDisplayStatusBadge');
  badge.textContent = order.tokenStatus === 'REDEEMED' ? 'PICKED UP' : 'PREPARING (QUEUED)';
  badge.className = `token-status-pill ${order.tokenStatus.toLowerCase()}`;

  const qrImg = document.getElementById('tokenQrImage');
  if (order.qrCodeUrl) {
    qrImg.src = order.qrCodeUrl;
  } else {
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(order.tokenCode)}`;
  }

  const itemsContainer = document.getElementById('tokenDisplayItems');
  itemsContainer.innerHTML = order.items.map(i => `
    <div class="token-item-entry">
      <span>${i.name} × ${i.quantity}</span>
      <strong>₹${i.price * i.quantity}</strong>
    </div>
  `).join('');

  document.getElementById('tokenModal').classList.remove('hidden');
}

function closeTokenModal() {
  const tokenModal = document.getElementById('tokenModal');
  const payModal = document.getElementById('paymentModal');
  const cartModal = document.getElementById('cartModal');
  if (tokenModal) tokenModal.classList.add('hidden');
  if (payModal) payModal.classList.add('hidden');
  if (cartModal) cartModal.classList.add('hidden');
  updateActiveTokensBadge();
}

function updateActiveTokensBadge() {
  if (!state.currentUser) return;
  const activeOrders = state.orders.filter(o => 
    o.customerId.toLowerCase() === (state.currentUser.id || '').toLowerCase() && 
    o.tokenStatus === 'ACTIVE'
  );
  const count = activeOrders.length;
  const badge = document.getElementById('activeTokensCount');
  if (badge) badge.textContent = count;

  const mobileBadge = document.getElementById('mobileTokensBadge');
  if (mobileBadge) {
    mobileBadge.textContent = count;
    mobileBadge.classList.toggle('hidden', count === 0);
  }
}

function openMyTokensModal() {
  if (!state.currentUser) {
    showToast('Please log in to view your tokens.', 'warning');
    return;
  }

  const userOrders = state.orders.filter(o => 
    o.customerId.toLowerCase() === state.currentUser.id.toLowerCase()
  );

  const container = document.getElementById('myTokensList');
  if (userOrders.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted);">
        <p>No tokens found for ${state.currentUser.name}.</p>
        <span style="font-size: 0.8rem;">Pre-order lunch from the menu to receive a digital token.</span>
      </div>
    `;
  } else {
    container.innerHTML = userOrders.map(order => `
      <div class="my-token-card">
        <div class="my-token-top">
          <strong class="code-badge" style="font-size: 1.05rem;">${order.tokenCode}</strong>
          <span class="token-status-pill ${order.tokenStatus.toLowerCase()}">${order.tokenStatus}</span>
        </div>
        <div style="font-size: 0.82rem; color: var(--text-muted);">
          <span>Shift: <strong>${order.slotName}</strong></span> • 
          <span>Date: <strong>${order.orderDate}</strong></span>
        </div>
        <div style="font-size: 0.85rem; font-weight: 600;">
          ${order.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 0.5rem; margin-top: 0.2rem;">
          <span style="font-weight: 800; font-family: var(--font-mono);">₹${order.totalAmount}</span>
          <button class="btn-chip" onclick='presentDigitalToken(${JSON.stringify(order).replace(/'/g, "&apos;")})'>
            View Token Pass & QR
          </button>
        </div>
      </div>
    `).join('');
  }

  document.getElementById('myTokensModal').classList.remove('hidden');
}

// ========================================================
// STEP 6: FEEDBACK CORNER FOR PARTICULAR FOOD
// ========================================================
function populateParticularFoodDropdown() {
  const select = document.getElementById('fbParticularFoodSelect');
  if (!select) return;
  select.innerHTML = state.menu.map(m => `
    <option value="${m.name}">${m.name} (${m.category})</option>
  `).join('');
}

function openFeedbackModal(preselectedFood = null) {
  populateParticularFoodDropdown();
  const select = document.getElementById('fbParticularFoodSelect');
  if (preselectedFood && select) {
    select.value = preselectedFood;
  }

  // Populate token dropdown
  const tokenSelect = document.getElementById('fbTokenSelect');
  const userOrders = state.currentUser ? state.orders.filter(o => o.customerId.toLowerCase() === state.currentUser.id.toLowerCase()) : [];

  if (userOrders.length === 0) {
    tokenSelect.innerHTML = `<option value="">General Dish Feedback (No Token)</option>`;
  } else {
    tokenSelect.innerHTML = userOrders.map(o => `
      <option value="${o.tokenCode}">${o.tokenCode} - ${o.items.map(i => i.name).join(', ')}</option>
    `).join('');
  }

  document.getElementById('feedbackModal').classList.remove('hidden');
}

async function handleFeedbackSubmit(e) {
  e.preventDefault();
  const foodName = document.getElementById('fbParticularFoodSelect').value;
  const tokenSelect = document.getElementById('fbTokenSelect');
  const comment = document.getElementById('fbComments').value.trim();

  const payload = {
    orderId: null,
    tokenCode: tokenSelect.value || null,
    foodName: foodName,
    customerName: state.currentUser ? state.currentUser.name : 'Campus Student',
    customerRole: state.currentUser ? state.currentUser.role : 'student',
    customerId: state.currentUser ? state.currentUser.id : 'CAMPUS-USER',
    quantityRating: state.ratings.quantityRating,
    qualityRating: state.ratings.qualityRating,
    comment
  };

  try {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('feedbackModal').classList.add('hidden');
      document.getElementById('fbComments').value = '';
      showToast(`Review for "${foodName}" saved directly to MENU.xlsx!`, 'success');
      await fetchFeedback();
      await fetchExcelStatus();
    }
  } catch (err) {
    showToast('Failed to submit feedback.', 'error');
  }
}

function renderFeedbackSummary() {
  const statsBar = document.getElementById('feedbackStatsBar');
  const miniList = document.getElementById('feedbackReviewsMiniList');
  if (!statsBar || !miniList || !state.feedbackAnalytics) return;

  const a = state.feedbackAnalytics;
  statsBar.innerHTML = `
    <div class="fc-stat-box">
      <div class="fc-stat-num">${a.overallAvg}★</div>
      <div class="fc-stat-title">Overall Score</div>
    </div>
    <div class="fc-stat-box">
      <div class="fc-stat-num">${a.avgQuantity} / 5</div>
      <div class="fc-stat-title">Portion Quantity</div>
    </div>
    <div class="fc-stat-box">
      <div class="fc-stat-num">${a.avgQuality} / 5</div>
      <div class="fc-stat-title">Taste & Hygiene</div>
    </div>
    <div class="fc-stat-box">
      <div class="fc-stat-num">${a.totalReviews}</div>
      <div class="fc-stat-title">Dish Reviews</div>
    </div>
  `;

  miniList.innerHTML = a.feedbacks.slice(0, 3).map(f => `
    <div class="review-item">
      <div class="review-meta">
        <div>
          <strong class="review-author">${f.foodName || 'Dish'}</strong>
          <small style="color: var(--text-muted); display: block;">by ${f.customerName} (${(f.customerRole || 'user').toUpperCase()})</small>
        </div>
        <span class="review-stars">${'★'.repeat(f.qualityRating)}</span>
      </div>
      <p class="review-comment">"${f.comment}"</p>
    </div>
  `).join('');
}

// ========================================================
// STEP 7: CANTEEN INCHARGE / OWNER DASHBOARD
// ========================================================
function switchAdminSubtab(subtabId) {
  state.activeAdminSubtab = subtabId;
  document.querySelectorAll('.admin-tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-subtab') === subtabId);
  });
  document.querySelectorAll('.admin-subview').forEach(v => {
    v.classList.remove('active');
  });

  const targetView = document.getElementById(`subtab${subtabId.charAt(0).toUpperCase() + subtabId.slice(1)}`);
  if (targetView) targetView.classList.add('active');

  loadAdminSubtab(subtabId);
}

function loadAdminSubtab(subtabId) {
  if (subtabId === 'kitchenBatch') {
    renderAdminKitchenBatch();
    renderAdminOrdersTable();
  } else if (subtabId === 'tokenVerification') {
    renderStaffPhoneStream();
  } else if (subtabId === 'inventoryControl') {
    renderAdminInventory();
  } else if (subtabId === 'feedbackAnalytics') {
    renderAdminFeedback();
  } else if (subtabId === 'systemToggles') {
    renderAdminSystemToggles();
  }
}

async function renderAdminKitchenBatch() {
  try {
    const res = await fetch('/api/admin/kitchen-batch');
    const data = await res.json();
    if (!data.success) return;

    const summary = data.summary;

    // Slot 1
    document.getElementById('batchSlot1TotalOrders').textContent = summary.slot1.totalOrders;
    document.getElementById('batchSlot1TotalPlates').textContent = summary.slot1.totalPlates;
    const tbody1 = document.getElementById('batchSlot1TableBody');

    if (summary.slot1.items.length === 0) {
      tbody1.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No pre-orders booked for 12:05 PM shift yet.</td></tr>`;
    } else {
      tbody1.innerHTML = summary.slot1.items.map(item => `
        <tr>
          <td><strong>${item.name}</strong></td>
          <td><span class="qty-highlight">${item.totalQuantity}</span> plates</td>
          <td><span class="status-badge active">Batch Cooking</span></td>
        </tr>
      `).join('');
    }

    // Slot 2
    document.getElementById('batchSlot2TotalOrders').textContent = summary.slot2.totalOrders;
    document.getElementById('batchSlot2TotalPlates').textContent = summary.slot2.totalPlates;
    const tbody2 = document.getElementById('batchSlot2TableBody');

    if (summary.slot2.items.length === 0) {
      tbody2.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No pre-orders booked for 12:55 PM shift yet.</td></tr>`;
    } else {
      tbody2.innerHTML = summary.slot2.items.map(item => `
        <tr>
          <td><strong>${item.name}</strong></td>
          <td><span class="qty-highlight">${item.totalQuantity}</span> plates</td>
          <td><span class="status-badge active">Batch Cooking</span></td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Error rendering kitchen batch summary:', err);
  }
}

function renderAdminOrdersTable() {
  const tbody = document.getElementById('adminOrdersTableBody');
  if (!tbody) return;

  if (state.orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 2rem;">No orders registered yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.orders.map(o => `
    <tr>
      <td><span class="code-badge">${o.tokenCode}</span></td>
      <td><strong>${o.customerName}</strong><br><small style="color: var(--text-muted);">${o.customerId}</small></td>
      <td><span class="role-tag ${o.customerRole}">${(o.customerRole || 'user').toUpperCase()}</span></td>
      <td><strong>${o.slotName}</strong></td>
      <td>${o.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}</td>
      <td><strong>₹${o.totalAmount}</strong></td>
      <td><span style="font-size: 0.75rem; color: #15803d; font-weight: 700;">PAID (${o.paymentMethod})</span></td>
      <td><span class="status-badge ${o.tokenStatus.toLowerCase()}">${o.tokenStatus}</span></td>
      <td>
        ${o.tokenStatus === 'ACTIVE' ? `
          <button class="btn-chip" onclick="handleCounterQuickRedeem('${o.tokenCode}')">Mark Picked Up</button>
        ` : `
          <span style="font-size: 0.75rem; color: var(--text-muted);">Redeemed</span>
        `}
      </td>
    </tr>
  `).join('');
}

async function handleVerifyTokenForm(e) {
  e.preventDefault();
  const input = document.getElementById('tokenCodeInput');
  const code = input.value.trim();
  if (!code) return;

  try {
    const res = await fetch(`/api/tokens/${encodeURIComponent(code)}/verify`, { method: 'POST' });
    const data = await res.json();
    const resultCard = document.getElementById('tokenVerificationResult');
    resultCard.classList.remove('hidden');

    if (!data.found) {
      resultCard.className = 'token-result-card not-found';
      resultCard.innerHTML = `
        <div style="color: #991b1b;">
          <strong>❌ TOKEN NOT FOUND:</strong>
          <p>No order matched "${code}".</p>
        </div>
      `;
      return;
    }

    const order = data.order;
    const isRedeemed = order.tokenStatus === 'REDEEMED';

    if (isRedeemed) {
      resultCard.className = 'token-result-card already-redeemed';
      resultCard.innerHTML = `
        <div style="color: #92400e;">
          <strong>⚠️ TOKEN ALREADY PICKED UP!</strong>
          <p>This token was handed over at <strong>${order.redeemedAt}</strong> by ${order.verifiedBy || 'staff'}. Double claiming blocked!</p>
        </div>
      `;
    } else {
      resultCard.className = 'token-result-card success-active';
      resultCard.innerHTML = `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <div>
              <span class="status-badge active">VALID TOKEN - READY FOR PICKUP</span>
              <h4 style="font-size: 1.25rem; font-family: var(--font-mono); margin-top: 0.2rem;">${order.tokenCode}</h4>
            </div>
            <strong style="font-size: 1.2rem; color: var(--primary);">₹${order.totalAmount} (PAID)</strong>
          </div>
          <div style="background: white; padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); margin-bottom: 1rem; font-size: 0.88rem;">
            <p><strong>Customer:</strong> ${order.customerName} (${order.customerId})</p>
            <p><strong>Pickup Shift:</strong> ${order.slotName} (${order.orderDate})</p>
            <hr style="margin: 0.5rem 0; border: none; border-top: 1px dashed #cbd5e1;">
            <p><strong>Prepared Items:</strong></p>
            <ul style="padding-left: 1.2rem; margin-top: 0.3rem;">
              ${order.items.map(i => `<li><strong>${i.quantity}x</strong> ${i.name}</li>`).join('')}
            </ul>
          </div>
          <button class="btn-primary btn-block" style="background: #16a34a; font-size: 1rem; padding: 0.85rem;" onclick="executeRedeemToken('${order.tokenCode}')">
            ✅ Confirm Token & Hand Over Physical Tray (Sync MENU.xlsx)
          </button>
        </div>
      `;
    }
  } catch (err) {
    showToast('Error verifying token.', 'error');
  }
}

async function executeRedeemToken(tokenCode) {
  try {
    const res = await fetch(`/api/tokens/${encodeURIComponent(tokenCode)}/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffName: 'Chef Sundaram M.' })
    });
    const data = await res.json();
    if (!data.success) {
      showToast(data.error || 'Failed to redeem token', 'error');
      return;
    }

    showToast(`Token ${tokenCode} verified! Status updated in MENU.xlsx`, 'success');
    await fetchOrders();
    await fetchExcelStatus();
    handleVerifyTokenForm({ preventDefault: () => {} });
  } catch (err) {
    showToast('Failed to redeem token.', 'error');
  }
}

async function handleCounterQuickRedeem(tokenCode) {
  await executeRedeemToken(tokenCode);
}

function quickFillToken(code) {
  const input = document.getElementById('tokenCodeInput');
  input.value = code;
  document.getElementById('btnVerifyToken').click();
}

// Incharge Menu & Inventory Management
function renderAdminInventory() {
  const container = document.getElementById('adminInventoryGrid');
  if (!container) return;

  container.innerHTML = state.menu.map(item => `
    <div class="inv-card">
      <div class="inv-top">
        <div>
          <span style="font-size: 0.7rem; font-weight: 700; color: var(--primary);">${item.category}</span>
          <h4 class="inv-title">${item.name}</h4>
          <span class="inv-meta">Limit: ${item.dailyLimit || 50} plates daily</span>
        </div>
        <span class="price-tag" style="font-size: 1.1rem;">₹${item.price}</span>
      </div>

      <div class="inv-controls">
        <div>
          <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">Live Stock:</span>
          <div class="inv-stock-stepper">
            <button class="btn-step" onclick="updateItemStockInline('${item.id}', -1)">-</button>
            <input type="number" class="stock-input" value="${item.stock}" onchange="setItemStockExact('${item.id}', this.value)">
            <button class="btn-step" onclick="updateItemStockInline('${item.id}', 1)">+</button>
          </div>
        </div>

        <div style="display: flex; gap: 0.4rem;">
          <button class="btn-chip" onclick="openEditItemModal('${item.id}')">Edit</button>
          <button class="btn-chip" style="color: #ef4444;" onclick="deleteMenuItem('${item.id}')">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

async function updateItemStockInline(id, delta) {
  const item = state.menu.find(m => m.id === id);
  if (!item) return;
  const newStock = Math.max(0, item.stock + delta);
  await saveItemUpdates(id, { stock: newStock });
}

async function setItemStockExact(id, val) {
  const newStock = Math.max(0, parseInt(val, 10) || 0);
  await saveItemUpdates(id, { stock: newStock });
}

async function saveItemUpdates(id, updates) {
  try {
    const res = await fetch(`/api/menu/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (data.success) {
      await fetchMenu();
      await fetchExcelStatus();
      showToast('Menu updated and synced to MENU.xlsx.', 'success');
    }
  } catch (err) {
    showToast('Failed to update menu item.', 'error');
  }
}

async function resetAllDailyStock() {
  if (!confirm('Refill all food items to their maximum daily limits?')) return;
  try {
    const res = await fetch('/api/menu/reset-stock', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      await fetchMenu();
      await fetchExcelStatus();
      showToast('Daily stock refilled for all items!', 'success');
    }
  } catch (err) {
    showToast('Failed to reset stock.', 'error');
  }
}

// ==========================================
// FOOD IMAGE UPLOAD & COMPRESSION HELPERS
// Supports Laptop (Pictures/Downloads) and Phone (Photos/Camera)
// ==========================================
async function compressImageFile(file, maxDimension = 900, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function setImageDropzonePreview(imgSrc, infoText = 'Photo selected') {
  const hiddenInput = document.getElementById('itemFormImage');
  const previewContainer = document.getElementById('dropzonePreview');
  const emptyContainer = document.getElementById('dropzoneEmpty');
  const previewImg = document.getElementById('previewImageEl');
  const infoEl = document.getElementById('previewFileInfo');

  if (imgSrc) {
    if (hiddenInput) hiddenInput.value = imgSrc;
    if (previewImg) previewImg.src = imgSrc;
    if (infoEl) infoEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"></path></svg><span>${infoText}</span>`;
    if (previewContainer) previewContainer.classList.remove('hidden');
    if (emptyContainer) emptyContainer.classList.add('hidden');
  } else {
    if (hiddenInput) hiddenInput.value = '';
    if (previewImg) previewImg.src = '';
    const fileInput = document.getElementById('itemFormImageFile');
    if (fileInput) fileInput.value = '';
    if (previewContainer) previewContainer.classList.add('hidden');
    if (emptyContainer) emptyContainer.classList.remove('hidden');
  }
}

async function handleFoodImageSelection(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('Please select a valid image file (JPG, PNG, WEBP).', 'error');
    return;
  }

  const statusText = document.getElementById('uploadStatusText');
  if (statusText) statusText.textContent = '⏳ Processing and optimizing image...';

  try {
    const compressedDataUrl = await compressImageFile(file);
    const sizeKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);
    setImageDropzonePreview(compressedDataUrl, `✓ ${file.name || 'Food Photo'} (${sizeKb} KB)`);
    if (statusText) statusText.textContent = 'Supports JPG, PNG, WEBP (Auto-optimized)';
    showToast('Photo uploaded and ready!', 'success');
  } catch (err) {
    console.error('Error processing image:', err);
    showToast('Could not process this image file.', 'error');
    if (statusText) statusText.textContent = 'Failed to load image. Please try again.';
  }
}

function initImageUploadHandler() {
  const dropzone = document.getElementById('imageDropzone');
  const fileInput = document.getElementById('itemFormImageFile');
  const btnBrowse = document.getElementById('btnBrowsePhoto');
  const btnChange = document.getElementById('btnChangePhoto');
  const btnRemove = document.getElementById('btnRemovePhoto');

  if (!dropzone || !fileInput) return;

  // Browse buttons trigger native file picker (Pictures/Downloads on Laptop, Gallery/Camera on Phone)
  if (btnBrowse) {
    btnBrowse.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      fileInput.click();
    });
  }

  if (btnChange) {
    btnChange.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      fileInput.click();
    });
  }

  if (btnRemove) {
    btnRemove.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      setImageDropzonePreview('');
    });
  }

  // Clicking dropzone outside buttons also triggers file picker if empty
  dropzone.addEventListener('click', (e) => {
    if (e.target.closest('.preview-actions-bar') || e.target.closest('button')) return;
    const previewContainer = document.getElementById('dropzonePreview');
    if (previewContainer && previewContainer.classList.contains('hidden')) {
      fileInput.click();
    }
  });

  // Native file input change
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFoodImageSelection(e.target.files[0]);
    }
  });

  // Drag and drop support from Laptop File Explorer / Desktop
  ['dragenter', 'dragover'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFoodImageSelection(e.dataTransfer.files[0]);
    }
  });
}

function openAddItemModal() {
  document.getElementById('menuItemModalTitle').textContent = 'Add New Menu Item (Canteen Incharge)';
  document.getElementById('editMenuItemId').value = '';
  document.getElementById('itemFormName').value = '';
  document.getElementById('itemFormPrice').value = '';
  document.getElementById('itemFormLimit').value = '40';
  document.getElementById('itemFormStock').value = '40';
  document.getElementById('itemFormDesc').value = '';
  setImageDropzonePreview('');
  document.getElementById('menuItemModal').classList.remove('hidden');
}

function openEditItemModal(id) {
  const item = state.menu.find(m => m.id === id);
  if (!item) return;

  document.getElementById('menuItemModalTitle').textContent = 'Edit Menu Item (Canteen Incharge)';
  document.getElementById('editMenuItemId').value = item.id;
  document.getElementById('itemFormName').value = item.name;
  document.getElementById('itemFormCategory').value = item.category;
  document.getElementById('itemFormType').value = item.type;
  document.getElementById('itemFormPrice').value = item.price;
  document.getElementById('itemFormLimit').value = item.dailyLimit || item.stock;
  document.getElementById('itemFormStock').value = item.stock;
  document.getElementById('itemFormDesc').value = item.description || '';
  if (item.image) {
    setImageDropzonePreview(item.image, 'Current Food Photo');
  } else {
    setImageDropzonePreview('');
  }
  document.getElementById('menuItemModal').classList.remove('hidden');
}

async function handleSaveMenuItem(e) {
  e.preventDefault();
  const id = document.getElementById('editMenuItemId').value;
  let imageVal = document.getElementById('itemFormImage').value.trim();

  // Validate that an image has been uploaded
  if (!imageVal) {
    showToast('Please upload a food photo from Pictures/Downloads (Laptop) or Photos (Phone)!', 'error');
    const dropzone = document.getElementById('imageDropzone');
    if (dropzone) {
      dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
      dropzone.classList.add('dragover');
      setTimeout(() => dropzone.classList.remove('dragover'), 1200);
    }
    return;
  }

  const saveBtn = document.getElementById('btnSaveMenuItem');
  const originalBtnText = saveBtn ? saveBtn.textContent : '';
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Uploading photo & saving...';
  }

  // If imageVal is a base64 data URL, upload to /api/upload to store cleanly on server disk
  if (imageVal.startsWith('data:image/')) {
    try {
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageVal })
      });
      const uploadData = await uploadRes.json();
      if (uploadData.success && uploadData.imageUrl) {
        imageVal = uploadData.imageUrl;
      }
    } catch (uploadErr) {
      console.warn('Upload API call failed, falling back to direct save:', uploadErr);
    }
  }

  const payload = {
    name: document.getElementById('itemFormName').value.trim(),
    category: document.getElementById('itemFormCategory').value,
    type: document.getElementById('itemFormType').value,
    price: parseFloat(document.getElementById('itemFormPrice').value),
    dailyLimit: parseInt(document.getElementById('itemFormLimit').value, 10),
    stock: parseInt(document.getElementById('itemFormStock').value, 10),
    description: document.getElementById('itemFormDesc').value.trim(),
    image: imageVal
  };

  try {
    let res;
    if (id) {
      res = await fetch(`/api/menu/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    const data = await res.json();
    if (data.success) {
      document.getElementById('menuItemModal').classList.add('hidden');
      await fetchMenu();
      await fetchExcelStatus();
      showToast('Item saved directly into MENU.xlsx with photo!', 'success');
    } else {
      showToast(data.error || 'Failed to save item', 'error');
    }
  } catch (err) {
    showToast('Error saving item.', 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = originalBtnText;
    }
  }
}

async function deleteMenuItem(id) {
  if (!confirm('Are you sure you want to delete this menu item?')) return;
  try {
    const res = await fetch(`/api/menu/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      await fetchMenu();
      await fetchExcelStatus();
      showToast('Menu item removed from MENU.xlsx.', 'success');
    }
  } catch (err) {
    showToast('Failed to delete item.', 'error');
  }
}

// Incharge Feedback Analytics View
function renderAdminFeedback() {
  const analytics = state.feedbackAnalytics;
  if (!analytics) return;

  document.getElementById('metricOverallScore').innerHTML = `${analytics.overallAvg} <span class="metric-max">/ 5.0</span>`;
  document.getElementById('metricQuantityScore').innerHTML = `${analytics.avgQuantity} <span class="metric-max">/ 5.0</span>`;
  document.getElementById('metricQualityScore').innerHTML = `${analytics.avgQuality} <span class="metric-max">/ 5.0</span>`;
  document.getElementById('metricTotalReviews').textContent = analytics.totalReviews;

  const feedList = document.getElementById('adminFeedbackList');
  if (!feedList) return;

  feedList.innerHTML = analytics.feedbacks.map(f => `
    <div class="review-item">
      <div class="review-meta">
        <div>
          <strong style="color: var(--primary); font-size: 0.95rem;">🍲 ${f.foodName || 'General Meal'}</strong><br>
          <strong class="review-author">${f.customerName}</strong> 
          <span class="role-tag ${f.customerRole}" style="margin-left: 0.3rem;">${(f.customerRole || 'user').toUpperCase()}</span>
          <span style="color: var(--text-muted); margin-left: 0.3rem;">(${f.customerId})</span>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 0.75rem; color: var(--text-muted);">${f.createdAt}</span>
        </div>
      </div>
      <div style="display: flex; gap: 1rem; margin: 0.4rem 0; font-size: 0.8rem;">
        <span>Quantity: <strong>${'★'.repeat(f.quantityRating)}${'☆'.repeat(5 - f.quantityRating)}</strong></span>
        <span>Quality: <strong>${'★'.repeat(f.qualityRating)}${'☆'.repeat(5 - f.qualityRating)}</strong></span>
      </div>
      <p class="review-comment">"${f.comment}"</p>
    </div>
  `).join('');
}

// System Toggles View
function renderAdminSystemToggles() {
  if (!state.system) return;
  const sys = state.system.system;

  document.getElementById('toggleHolidayReason').value = sys.holidayReason || '';
  document.getElementById('toggleEventReason').value = sys.eventReason || '';
  document.getElementById('inputSlot1Cap').value = sys.slot1.capacity || 45;
  document.getElementById('inputSlot2Cap').value = sys.slot2.capacity || 60;
}

async function saveAdminSystemSettings() {
  const payload = {
    holidayMode: document.getElementById('chkHolidayMode').checked,
    eventMode: document.getElementById('chkEventMode').checked,
    holidayReason: document.getElementById('toggleHolidayReason').value.trim(),
    eventReason: document.getElementById('toggleEventReason').value.trim(),
    slot1Capacity: parseInt(document.getElementById('inputSlot1Cap').value, 10),
    slot2Capacity: parseInt(document.getElementById('inputSlot2Cap').value, 10)
  };

  try {
    const res = await fetch('/api/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      await fetchSystemInfo();
      showToast('System toggles and slot capacities saved!', 'success');
    }
  } catch (err) {
    showToast('Failed to save settings.', 'error');
  }
}

async function resetAllDemoData() {
  if (!confirm('Reset all demo orders, stock levels, and tokens back to initial demo data?')) return;
  try {
    const res = await fetch('/api/system/reset-demo', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Database reset to clean demo state.', 'success');
      loadInitialData();
    }
  } catch (err) {
    showToast('Failed to reset data.', 'error');
  }
}

// Simulator Handlers
async function setSimulationTime(timeStr) {
  try {
    const res = await fetch('/api/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        useSimulationTime: true,
        simulationTime: timeStr
      })
    });
    const data = await res.json();
    if (data.success) {
      await fetchSystemInfo();
      showToast(`Campus clock set to ${timeStr}. 1-hour rules recalculated!`, 'warning');
    }
  } catch (err) {
    showToast('Failed to set simulated clock.', 'error');
  }
}

async function setLiveClock() {
  try {
    const res = await fetch('/api/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ useSimulationTime: false })
    });
    const data = await res.json();
    if (data.success) {
      await fetchSystemInfo();
      showToast('Switched to Live Real-World System Clock.', 'success');
    }
  } catch (err) {
    showToast('Failed to switch clock.', 'error');
  }
}

// Banners & Simulator Displays
function renderSystemBanners() {
  const sys = state.system.system;
  const holidayBanner = document.getElementById('holidayBanner');
  const eventBanner = document.getElementById('eventBanner');
  const holidayText = document.getElementById('holidayBannerText');
  const eventText = document.getElementById('eventBannerText');

  if (sys.holidayMode) {
    holidayBanner.classList.remove('hidden');
    holidayText.textContent = sys.holidayReason || 'Canteen is closed today for holiday/weekend.';
  } else {
    holidayBanner.classList.add('hidden');
  }

  if (sys.eventMode) {
    eventBanner.classList.remove('hidden');
    eventText.textContent = sys.eventReason || 'Campus event schedule in effect. Regular pre-orders suspended.';
  } else {
    eventBanner.classList.add('hidden');
  }

  const chkHoliday = document.getElementById('chkHolidayMode');
  const chkEvent = document.getElementById('chkEventMode');
  const lblHoliday = document.getElementById('lblHolidayStatus');
  const lblEvent = document.getElementById('lblEventStatus');
  if (chkHoliday && chkEvent) {
    chkHoliday.checked = sys.holidayMode;
    lblHoliday.textContent = sys.holidayMode ? 'ON' : 'OFF';
    chkEvent.checked = sys.eventMode;
    lblEvent.textContent = sys.eventMode ? 'ON' : 'OFF';
  }
}

function updateSimulatorDisplay() {
  const eff = state.system.effectiveTime;
  const timeDisplay = document.getElementById('simCurrentTimeDisplay');
  const dateDisplay = document.getElementById('simCurrentDateDisplay');
  const checkoutTime = document.getElementById('checkoutCurrentTime');

  if (timeDisplay) timeDisplay.textContent = formatTimeAmPm(eff.time);
  if (dateDisplay) dateDisplay.textContent = eff.isSimulated ? `Simulated: ${eff.date}` : 'Live Clock';
  if (checkoutTime) checkoutTime.textContent = formatTimeAmPm(eff.time);
}

function updateHeroSlotRules() {
  if (!state.system) return;
  const advance = state.system.advanceRuleStatus;
  const caps = state.system.capacities;

  const pill1 = document.getElementById('slot1StatusPill');
  const cap1 = document.getElementById('slot1CapDisplay');
  const timer1 = document.getElementById('slot1TimerText');

  if (pill1 && advance.slot1) {
    pill1.className = advance.slot1.allowed ? 'slot-pill open' : 'slot-pill locked';
    timer1.textContent = advance.slot1.allowed ? `Open (Cutoff in ${advance.slot1.minsRemaining || 0}m)` : `Locked: Cutoff Passed (Strict 1-Hr Rule)`;
    if (cap1 && caps.slot1) cap1.textContent = `${caps.slot1.booked}/${caps.slot1.capacity} Booked`;
  }

  const pill2 = document.getElementById('slot2StatusPill');
  const cap2 = document.getElementById('slot2CapDisplay');
  const timer2 = document.getElementById('slot2TimerText');

  if (pill2 && advance.slot2) {
    pill2.className = advance.slot2.allowed ? 'slot-pill open' : 'slot-pill locked';
    timer2.textContent = advance.slot2.allowed ? `Open (Cutoff in ${advance.slot2.minsRemaining || 0}m)` : `Locked: Cutoff Passed (Strict 1-Hr Rule)`;
    if (cap2 && caps.slot2) cap2.textContent = `${caps.slot2.booked}/${caps.slot2.capacity} Booked`;
  }
}

// ========================================================
// EVENT LISTENERS BINDING
// ========================================================
function setupEventListeners() {
  // Brand logo click
  document.getElementById('navBrandLogoBtn').addEventListener('click', () => {
    if (state.currentUser) showView('customer');
    else showView('authGate');
  });

  // Auth Gate tab buttons & switch links
  document.getElementById('tabShowRegister').addEventListener('click', () => switchAuthGateTab('register'));
  document.getElementById('tabShowLogin').addEventListener('click', () => switchAuthGateTab('login'));
  const linkToReg = document.getElementById('linkToRegister');
  const linkToLog = document.getElementById('linkToLogin');
  if (linkToReg) linkToReg.addEventListener('click', () => switchAuthGateTab('register'));
  if (linkToLog) linkToLog.addEventListener('click', () => switchAuthGateTab('login'));

  // Auth Gate Forms
  document.getElementById('gateRegisterForm').addEventListener('submit', handleGateRegister);
  document.getElementById('gateLoginForm').addEventListener('submit', handleGateLogin);

  // Slot radio choices on register form
  document.querySelectorAll('input[name="gateSlotChoice"]').forEach(r => {
    r.addEventListener('change', (e) => {
      document.querySelectorAll('.slot-radio-option').forEach(o => o.classList.remove('active'));
      e.target.closest('.slot-radio-option').classList.add('active');
    });
  });

  // Shift Change and Logout
  document.getElementById('btnChangeSlot').addEventListener('click', toggleUserShift);
  document.getElementById('btnSwitchAccountTop').addEventListener('click', logoutUser);
  document.getElementById('userProfileBtn').addEventListener('click', logoutUser);

  // Navigation tabs
  document.getElementById('tabCustomerPortal').addEventListener('click', () => switchPortalTab('customer'));
  document.getElementById('tabAdminPortal').addEventListener('click', () => switchPortalTab('admin'));

  // Cart
  document.getElementById('btnOpenCart').addEventListener('click', openCartModal);
  document.getElementById('btnCloseCart').addEventListener('click', closeCartModal);
  document.getElementById('btnProceedPayment').addEventListener('click', proceedToPayment);

  // Date buttons (Today vs Tomorrow)
  document.getElementById('btnDateToday').addEventListener('click', () => {
    state.selectedDate = 'today';
    document.getElementById('btnDateToday').classList.add('active');
    document.getElementById('btnDateTomorrow').classList.remove('active');
    updateCheckoutSlotCards();
  });
  document.getElementById('btnDateTomorrow').addEventListener('click', () => {
    state.selectedDate = 'tomorrow';
    document.getElementById('btnDateTomorrow').classList.add('active');
    document.getElementById('btnDateToday').classList.remove('active');
    updateCheckoutSlotCards();
  });

  // Slot Radios in Cart
  document.querySelectorAll('input[name="lunchSlot"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.selectedSlot = e.target.value;
      if (state.currentUser) state.currentUser.slotId = e.target.value;
      renderUserProfile();
      updateCheckoutSlotCards();
    });
  });

  // Payment Method Radios
  document.querySelectorAll('input[name="payMethod"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.selectedPayMethod = e.target.value;
    });
  });

  // Payment Gateway Modal
  document.getElementById('btnConfirmPayment').addEventListener('click', confirmPaymentAndCreateOrder);
  document.getElementById('btnCancelPayment').addEventListener('click', () => {
    document.getElementById('paymentModal').classList.add('hidden');
    openCartModal();
  });
  const btnClosePayHdr = document.getElementById('btnClosePaymentHeader');
  if (btnClosePayHdr) {
    btnClosePayHdr.addEventListener('click', () => {
      document.getElementById('paymentModal').classList.add('hidden');
      openCartModal();
    });
  }

  // Digital Token Modal Dismiss / Cancel Handlers
  const btnCloseToken = document.getElementById('btnCloseTokenModal');
  const btnCloseTokenHdr = document.getElementById('btnCloseTokenHeader');
  const btnCancelToken = document.getElementById('btnCancelTokenModal');
  if (btnCloseToken) btnCloseToken.addEventListener('click', closeTokenModal);
  if (btnCloseTokenHdr) btnCloseTokenHdr.addEventListener('click', closeTokenModal);
  if (btnCancelToken) btnCancelToken.addEventListener('click', closeTokenModal);

  // Modal Backdrop Click Dismiss Handlers
  const tokenModalEl = document.getElementById('tokenModal');
  const payModalEl = document.getElementById('paymentModal');
  const cartModalEl = document.getElementById('cartModal');
  const fbModalEl = document.getElementById('feedbackModal');
  const myTknModalEl = document.getElementById('myTokensModal');

  if (tokenModalEl) {
    tokenModalEl.addEventListener('click', (e) => {
      if (e.target === tokenModalEl) closeTokenModal();
    });
  }
  if (payModalEl) {
    payModalEl.addEventListener('click', (e) => {
      if (e.target === payModalEl) {
        payModalEl.classList.add('hidden');
        openCartModal();
      }
    });
  }
  if (cartModalEl) {
    cartModalEl.addEventListener('click', (e) => {
      if (e.target === cartModalEl) closeCartModal();
    });
  }
  if (fbModalEl) {
    fbModalEl.addEventListener('click', (e) => {
      if (e.target === fbModalEl) fbModalEl.classList.add('hidden');
    });
  }
  if (myTknModalEl) {
    myTknModalEl.addEventListener('click', (e) => {
      if (e.target === myTknModalEl) myTknModalEl.classList.add('hidden');
    });
  }

  // Escape Key to Close Open Modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeTokenModal();
      closeCartModal();
      if (fbModalEl) fbModalEl.classList.add('hidden');
      if (myTknModalEl) myTknModalEl.classList.add('hidden');
    }
  });

  // My Tokens Drawer
  document.getElementById('btnMyTokens').addEventListener('click', openMyTokensModal);
  document.getElementById('btnCloseMyTokens').addEventListener('click', () => {
    document.getElementById('myTokensModal').classList.add('hidden');
  });

  // Search & Filters
  document.getElementById('menuSearchInput').addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderMenu();
  });

  document.querySelectorAll('#categoryChips .chip').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('#categoryChips .chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      state.activeCategory = btn.getAttribute('data-category');
      renderMenu();
    });
  });

  document.querySelectorAll('.diet-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diet-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeDiet = btn.getAttribute('data-diet');
      renderMenu();
    });
  });

  // Feedback Corner
  document.getElementById('btnWriteFeedback').addEventListener('click', () => openFeedbackModal());
  document.getElementById('btnCloseFeedbackModal').addEventListener('click', () => {
    document.getElementById('feedbackModal').classList.add('hidden');
  });
  document.getElementById('feedbackForm').addEventListener('submit', handleFeedbackSubmit);

  setupStarRatings('starGroupQuantity', 'quantityRating');
  setupStarRatings('starGroupQuality', 'qualityRating');

  // Simulator Presets
  document.querySelectorAll('.sim-presets .btn-chip[data-time]').forEach(btn => {
    btn.addEventListener('click', () => {
      const time = btn.getAttribute('data-time');
      setSimulationTime(time);
    });
  });
  document.getElementById('btnLiveClock').addEventListener('click', setLiveClock);

  // Admin Subtabs
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchAdminSubtab(tab.getAttribute('data-subtab'));
    });
  });

  // Admin Actions
  document.getElementById('btnRefreshBatch').addEventListener('click', () => {
    renderAdminKitchenBatch();
    renderAdminOrdersTable();
    showToast('Batch manifest refreshed.', 'success');
  });
  document.getElementById('tokenLookupForm').addEventListener('submit', handleVerifyTokenForm);
  document.getElementById('btnResetDailyStock').addEventListener('click', resetAllDailyStock);
  document.getElementById('btnAddNewMenuItem').addEventListener('click', openAddItemModal);
  document.getElementById('btnOpenAddItemModal').addEventListener('click', openAddItemModal);
  document.getElementById('btnCloseMenuItemModal').addEventListener('click', () => {
    document.getElementById('menuItemModal').classList.add('hidden');
  });
  document.getElementById('menuItemForm').addEventListener('submit', handleSaveMenuItem);
  document.getElementById('btnSaveSystemSettings').addEventListener('click', saveAdminSystemSettings);
  document.getElementById('btnResetAllDemoData').addEventListener('click', resetAllDemoData);
  document.getElementById('btnManualExcelSync').addEventListener('click', triggerManualExcelSync);

  // Holiday / Event switch change immediate handlers
  document.getElementById('chkHolidayMode').addEventListener('change', saveAdminSystemSettings);
  document.getElementById('chkEventMode').addEventListener('change', saveAdminSystemSettings);

  // Initialize food photo upload dropzone & camera handlers
  initImageUploadHandler();
}

function setupStarRatings(containerId, ratingKey) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const stars = container.querySelectorAll('.star');

  stars.forEach(star => {
    star.addEventListener('click', () => {
      const val = parseInt(star.getAttribute('data-val'), 10);
      state.ratings[ratingKey] = val;
      stars.forEach(s => {
        const sVal = parseInt(s.getAttribute('data-val'), 10);
        s.classList.toggle('active', sVal <= val);
      });
    });
  });
}

// ========================================================
// UTILITIES & HELPERS
// ========================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

function formatTimeAmPm(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

function getTomorrowDateString() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ========================================================
// PWA & CONVENIENT MOBILE APP MODE LOGIC
// ========================================================
let deferredPrompt = null;

// Register Service Worker for offline performance and PWA installability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('Cambit PWA Service Worker registered:', reg.scope);
    }).catch((err) => {
      console.warn('Cambit Service Worker registration failed:', err);
    });
  });
}

// Capture native PWA install banner prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const pwaBanner = document.getElementById('pwaInstallBanner');
  if (pwaBanner && !sessionStorage.getItem('cambit_pwa_dismissed')) {
    pwaBanner.classList.remove('hidden');
  }
});

// Setup Mobile Navigation & PWA Event Handlers
function setupMobileAppInteractions() {
  // PWA Install Button
  const btnInstall = document.getElementById('btnPwaInstall');
  if (btnInstall) {
    btnInstall.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          console.log('User installed Cambit PWA!');
        }
        deferredPrompt = null;
      } else {
        showToast('To install: Tap your browser menu (⋮ or Share) and select "Add to Home screen".', 'info');
      }
      const banner = document.getElementById('pwaInstallBanner');
      if (banner) banner.classList.add('hidden');
    });
  }

  // PWA Dismiss Button
  const btnDismiss = document.getElementById('btnPwaDismiss');
  if (btnDismiss) {
    btnDismiss.addEventListener('click', () => {
      sessionStorage.setItem('cambit_pwa_dismissed', '1');
      const banner = document.getElementById('pwaInstallBanner');
      if (banner) banner.classList.add('hidden');
    });
  }

  // Mobile Bottom Navigation Tabs
  const btnNavMenu = document.getElementById('btnNavMenu');
  const btnNavTokens = document.getElementById('btnNavTokens');
  const btnNavCart = document.getElementById('btnNavCart');
  const btnNavFeedback = document.getElementById('btnNavFeedback');
  const btnNavProfile = document.getElementById('btnNavProfile');

  function setActiveNavBtn(activeBtn) {
    [btnNavMenu, btnNavTokens, btnNavCart, btnNavFeedback, btnNavProfile].forEach(b => {
      if (b) b.classList.toggle('active', b === activeBtn);
    });
  }

  if (btnNavMenu) {
    btnNavMenu.addEventListener('click', () => {
      setActiveNavBtn(btnNavMenu);
      if (!state.currentUser) {
        showView('authGate');
        return;
      }
      showView(state.currentUser.role === 'admin' ? 'admin' : 'customer');
      const menuSection = document.getElementById('customerMenuGrid');
      if (menuSection) menuSection.scrollIntoView({ behavior: 'smooth' });
    });
  }

  if (btnNavTokens) {
    btnNavTokens.addEventListener('click', () => {
      setActiveNavBtn(btnNavTokens);
      openMyTokensModal();
    });
  }

  if (btnNavCart) {
    btnNavCart.addEventListener('click', () => {
      setActiveNavBtn(btnNavCart);
      openCartModal();
    });
  }

  if (btnNavFeedback) {
    btnNavFeedback.addEventListener('click', () => {
      setActiveNavBtn(btnNavFeedback);
      if (!state.currentUser) {
        showToast('Please log in to submit or view dish reviews.', 'info');
        showView('authGate');
        return;
      }
      showView('customer');
      const fbSection = document.getElementById('customerFeedbackSection');
      if (fbSection) fbSection.scrollIntoView({ behavior: 'smooth' });
    });
  }

  if (btnNavProfile) {
    btnNavProfile.addEventListener('click', () => {
      setActiveNavBtn(btnNavProfile);
      if (state.currentUser) {
        const confirmLogout = confirm(`Logged in as ${state.currentUser.name} (${state.currentUser.role.toUpperCase()}). Do you want to log out?`);
        if (confirmLogout) {
          handleLogout();
        }
      } else {
        showView('authGate');
      }
    });
  }
}

// Ensure mobile app interactions are initialized on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  setupMobileAppInteractions();
});

