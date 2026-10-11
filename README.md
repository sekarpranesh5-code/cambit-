# Cambit - College Canteen Pre-Order & Kitchen Management System

[![Live Demo on Vercel](https://img.shields.io/badge/Vercel-Live_Web_App-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://cambit-9z7i.vercel.app/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-f97316?style=for-the-badge&logo=pwa&logoColor=white)](https://cambit-9z7i.vercel.app/)
[![Cross Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS%20%7C%20Windows%20%7C%20Mac-blue?style=for-the-badge)](https://cambit-9z7i.vercel.app/)

> 🚀 **Live Production Web Application**:  
> 👉 **[https://cambit-9z7i.vercel.app/](https://cambit-9z7i.vercel.app/)**

A responsive, high-performance web application for college campuses connecting students, faculty, and canteen kitchen management. Eliminates physical queues during lunch breaks by enforcing advance meal pre-orders, digital token verification, and balancing kitchen batch preparation across designated lunch shifts.

---

## 🌐 Instant Access Across All Devices

The application is deployed on Vercel as a Progressive Web App (PWA):

| Device / OS | How to Access & Install |
| :--- | :--- |
| **📱 Android Phone** | Open **[https://cambit-9z7i.vercel.app/](https://cambit-9z7i.vercel.app/)** in Chrome. Tap **"Install Cambit App"** banner or menu → *Add to Home screen* for native app experience. |
| **🍎 iPhone (iOS)** | Open in Safari, tap the **Share** button, and select **"Add to Home Screen"**. |
| **💻 Windows / Mac** | Open in any modern browser (Chrome, Edge, Safari). Click the **Install** icon in the address bar to install as a desktop app. |

### 🔑 Demo Login Accounts

| Role | Email | Password | Access Details |
| :--- | :--- | :--- | :--- |
| **Canteen Incharge (Owner)** | `sekarpranesh5@gmail.com` | `12345678` | Full Admin Dashboard, Live Kitchen Batch Manifest, Menu Item / Photo Manager |
| **Student / Customer** | `aarav.cs23@college.edu` | `student123` | Digital Pre-Ordering, Slot Selection (12:05 PM / 12:55 PM), Token Generation |
| **Faculty / Staff** | `m.raman@college.edu` | `faculty123` | Executive Lunch Pre-Orders & Priority Pickup |

---

## 🛠️ Multi-Language Backend Support

This project provides **3 interchangeable backend implementations**:

### Option 1: Node.js (Express) — Default
- **Folder**: Root directory (`server.js`, `dataStore.js`, `excelStore.js`)
- **Host**: `0.0.0.0` (All network interfaces)
- **Port**: `3000` (configurable via `PORT` and `HOST` in `.env`)
- **Run**:
  ```bash
  START_CANTEEN_APP.bat
  # or
  node server.js
  ```
- **Local Access**: [http://localhost:3000](http://localhost:3000)
- **Student Mobile Access (Wi-Fi / LAN)**: `http://<your-computer-ip>:3000` (e.g. `http://172.1.10.86:3000`)

---

## 📱 Real-Time Multi-Device / Mobile Access (0.0.0.0 Hosting)

All 3 backend servers are configured to bind to `0.0.0.0`, allowing any phone, tablet, or laptop on the same Wi-Fi network to connect simultaneously:
1. Connect your computer and smartphones to the **same Wi-Fi router** or **Laptop Mobile Hotspot**.
2. Start the server (`START_CANTEEN_APP.bat`).
3. The console will display your current active Wi-Fi IPv4 address (e.g., `http://172.1.10.86:3000`).
4. Students can open that URL in their mobile browser (Chrome/Safari) to pre-order food and receive live tokens in real time.

---

### Option 2: Python (Flask)
- **Folder**: [`backend-python/`](file:///c:/Users/Pranesh/canteen-preorder-system/backend-python/)
- **Port**: `5000`
- **Libraries**: `flask`, `pandas`, `openpyxl`, `qrcode`, `pillow`
- **Run**:
  ```bash
  cd backend-python
  START_PYTHON_BACKEND.bat
  # or
  pip install -r requirements.txt
  python app.py
  ```
- **Access**: [http://localhost:5000](http://localhost:5000)

---

### Option 3: Java (Spring Boot 3)
- **Folder**: [`backend-java/`](file:///c:/Users/Pranesh/canteen-preorder-system/backend-java/)
- **Port**: `8080`
- **Libraries**: `Spring Boot Web`, `Apache POI (Excel)`, `ZXing (QR Generator)`, `Jackson`
- **Run**:
  ```bash
  cd backend-java
  START_JAVA_BACKEND.bat
  # or
  mvn spring-boot:run
  ```
- **Access**: [http://localhost:8080](http://localhost:8080)

---

## 📁 Excel Spreadsheet Integration

All backends synchronize data with your local Excel files:
1. **User Credentials & Profiles**:
   - **Path**: `C:\Users\Pranesh\OneDrive\Documents\login_details.xlsx`
   - **Columns**: `NAME` | `EMAIL_NAME` | `PASSWORD` | `PHONE_NUMBER` | `USERTYPE(CANTEEN_OWNER/CUSTOMER)` | `LUNCH_SLOT`
2. **Orders & Menu Catalog**:
   - **Path**: `C:\Users\Pranesh\OneDrive\Documents\MENU.xlsx`
   - **Columns**: `S.NO` | `DATE` | `TOKEN NUMBER` | `FOOD NAME` | `STATUS(PREPARED/NOT PREPARED)` | `PAYMENT(PAID)`
