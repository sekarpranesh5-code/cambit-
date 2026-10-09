# Cambit - College Canteen Pre-Order & Kitchen Management System

A responsive web application for college campuses connecting students, faculty, and canteen kitchen management. Eliminates physical queues during lunch breaks by enforcing advance meal pre-orders and balancing kitchen batch preparation across designated lunch shifts.

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
