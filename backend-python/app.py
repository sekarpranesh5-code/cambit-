import os
import json
import base64
import io
import datetime
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
import qrcode

app = Flask(__name__, static_folder='../public', static_url_path='')
CORS(app)

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / 'data'
DB_FILE = DATA_DIR / 'database.json'
PUBLIC_DIR = BASE_DIR / 'public'

LOGIN_EXCEL_PATH = Path(r"C:\Users\Pranesh\OneDrive\Documents\login_details.xlsx")
MENU_EXCEL_PATH = Path(r"C:\Users\Pranesh\OneDrive\Documents\MENU.xlsx")

def load_db():
    if not DB_FILE.exists():
        return {}
    with open(DB_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_db(data):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

def generate_qr_base64(text: str) -> str:
    qr = qrcode.QRCode(version=1, box_size=6, border=2)
    qr.add_data(text)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode('utf-8')

def read_login_excel():
    if not LOGIN_EXCEL_PATH.exists():
        return []
    try:
        df = pd.read_excel(LOGIN_EXCEL_PATH)
        users = []
        for _, row in df.iterrows():
            users.append({
                "name": str(row.get('NAME', '')),
                "email": str(row.get('EMAIL_NAME', '')),
                "password": str(row.get('PASSWORD', 'password123')),
                "phone": str(row.get('PHONE_NUMBER', '9876543210')),
                "userType": str(row.get('USERTYPE(CANTEEN_OWNER/CUSTOMER)', 'CUSTOMER')),
                "lunchSlot": str(row.get('LUNCH_SLOT', 'Slot 1: 12:05 PM'))
            })
        return users
    except Exception as e:
        print(f"Error reading login excel: {e}")
        return []

def add_user_to_login_excel(user):
    try:
        existing = read_login_excel()
        found = False
        for u in existing:
            if u['email'].lower() == user['email'].lower():
                u.update(user)
                found = True
                break
        if not found:
            existing.append(user)
        
        df = pd.DataFrame([{
            'NAME': u.get('name', ''),
            'EMAIL_NAME': u.get('email', ''),
            'PASSWORD': u.get('password', 'password123'),
            'PHONE_NUMBER': u.get('phone', '9876543210'),
            'USERTYPE(CANTEEN_OWNER/CUSTOMER)': u.get('userType', 'CUSTOMER'),
            'LUNCH_SLOT': u.get('lunchSlot', 'Slot 1: 12:05 PM')
        } for u in existing])
        
        LOGIN_EXCEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        df.to_excel(LOGIN_EXCEL_PATH, index=False)
        return True
    except Exception as e:
        print(f"Error saving to login excel: {e}")
        return False

# ==========================================
# STATIC FRONTEND ROUTES
# ==========================================
@app.route('/')
def index():
    return send_from_directory(PUBLIC_DIR, 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory(PUBLIC_DIR, path)

# ==========================================
# API ROUTES
# ==========================================
@app.route('/api/system', methods=['GET'])
def get_system():
    db = load_db()
    system = db.get('system', {})
    now = datetime.datetime.now()
    effective_time = {
        "isSimulated": system.get('useSimulationTime', False),
        "date": now.strftime('%Y-%m-%d'),
        "time": now.strftime('%H:%M'),
        "timestamp": now.isoformat()
    }
    advance_rule = {
        "slot1": {"allowed": True, "cutoffTime": "11:05", "minsRemaining": 60},
        "slot2": {"allowed": True, "cutoffTime": "11:55", "minsRemaining": 110}
    }
    capacities = {
        "slot1": {"capacity": 45, "booked": 18, "available": 27, "isFull": False},
        "slot2": {"capacity": 60, "booked": 45, "available": 15, "isFull": False}
    }
    return jsonify({
        "success": True,
        "system": system,
        "effectiveTime": effective_time,
        "advanceRuleStatus": advance_rule,
        "capacities": capacities
    })

@app.route('/api/menu', methods=['GET'])
def get_menu():
    db = load_db()
    menu = db.get('menu', [])
    return jsonify({"success": True, "menu": menu})

@app.route('/api/orders', methods=['GET'])
def get_orders():
    db = load_db()
    orders = db.get('orders', [])
    return jsonify({"success": True, "orders": orders})

@app.route('/api/orders', methods=['POST'])
def create_order():
    data = request.json or {}
    db = load_db()
    orders = db.get('orders', [])
    
    token_num = len(orders) + 1001
    slot_id = data.get('slotId', 'slot1')
    slot_prefix = "1205" if slot_id == 'slot1' else "1255"
    token_code = f"TKN-{slot_prefix}-{token_num}"
    
    order = {
        "id": f"ORD-{token_num}",
        "tokenCode": token_code,
        "customerId": data.get('customerId', 'STU-1001'),
        "customerName": data.get('customerName', 'Student'),
        "customerRole": data.get('customerRole', 'student'),
        "customerEmail": data.get('customerEmail', 'student@college.edu'),
        "orderDate": data.get('orderDate', datetime.date.today().isoformat()),
        "slotId": slot_id,
        "slotName": "Slot 1: 12:05 PM" if slot_id == 'slot1' else "Slot 2: 12:55 PM",
        "orderPlacedAt": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "items": data.get('items', []),
        "totalPlates": sum(i.get('quantity', 1) for i in data.get('items', [])),
        "totalAmount": sum(i.get('price', 0) * i.get('quantity', 1) for i in data.get('items', [])),
        "paymentStatus": "PAID",
        "paymentMethod": data.get('paymentMethod', 'Sample UPI (QR Payment)'),
        "transactionId": f"TXN-FASTPAY-{token_num}",
        "tokenStatus": "ACTIVE",
        "qrCodeUrl": generate_qr_base64(token_code)
    }
    orders.insert(0, order)
    db['orders'] = orders
    save_db(db)
    return jsonify({"success": True, "order": order})

@app.route('/api/orders/notify-incharge', methods=['POST'])
def notify_incharge():
    data = request.json or {}
    token_code = data.get('tokenCode', 'TKN-DEMO')
    return jsonify({
        "success": True,
        "message": f"Alert dispatched to Canteen Staff for Token {token_code}."
    })

@app.route('/api/tokens/<token_code>', methods=['GET'])
def get_token(token_code):
    db = load_db()
    for o in db.get('orders', []):
        if o.get('tokenCode', '').lower() == token_code.lower():
            return jsonify({"success": True, "order": o})
    return jsonify({"success": False, "error": "Token not found"}), 404

@app.route('/api/tokens/<token_code>/redeem', methods=['POST'])
def redeem_token(token_code):
    db = load_db()
    for o in db.get('orders', []):
        if o.get('tokenCode', '').lower() == token_code.lower():
            o['tokenStatus'] = 'REDEEMED'
            o['redeemedAt'] = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            save_db(db)
            return jsonify({"success": True, "order": o})
    return jsonify({"success": False, "error": "Token not found"}), 404

@app.route('/api/feedback', methods=['GET'])
def get_feedback():
    db = load_db()
    feedbacks = db.get('feedbacks', [])
    return jsonify({
        "success": True,
        "feedbacks": feedbacks,
        "overallAvg": 4.8,
        "avgQuantity": 4.8,
        "avgQuality": 4.8,
        "totalReviews": len(feedbacks),
        "byFood": {}
    })

@app.route('/api/feedback', methods=['POST'])
def add_feedback():
    data = request.json or {}
    db = load_db()
    feedbacks = db.get('feedbacks', [])
    feedback = {
        "id": f"FB-{len(feedbacks) + 1}",
        "foodName": data.get('foodName', 'Meal'),
        "customerName": data.get('customerName', 'Student'),
        "customerRole": data.get('customerRole', 'student'),
        "quantityRating": data.get('quantityRating', 5),
        "qualityRating": data.get('qualityRating', 5),
        "comment": data.get('comment', ''),
        "submittedAt": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    feedbacks.insert(0, feedback)
    db['feedbacks'] = feedbacks
    save_db(db)
    return jsonify({"success": True, "feedback": feedback}), 201

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json or {}
    name = data.get('name')
    email = data.get('email')
    if not name or not email:
        return jsonify({"success": False, "error": "Name and Email are required"}), 400
    
    role = 'admin' if data.get('userType') == 'CANTEEN_OWNER' else 'student'
    user = {
        "name": name,
        "email": email,
        "phone": data.get('phone', '9876543210'),
        "password": data.get('password', 'password123'),
        "userType": data.get('userType', 'CUSTOMER'),
        "role": role,
        "lunchSlot": data.get('lunchSlot', 'Slot 1: 12:05 PM'),
        "slotId": data.get('slotId', 'slot1'),
        "id": f"STU-{data.get('phone', '1001')[-4:]}"
    }
    
    db = load_db()
    users = db.get('users', [])
    users = [u for u in users if u.get('email', '').lower() != email.lower()]
    users.append(user)
    db['users'] = users
    save_db(db)
    add_user_to_login_excel(user)
    return jsonify({"success": True, "user": user, "message": "Account registered successfully."}), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json or {}
    email = data.get('email', '').lower()
    password = data.get('password', '')
    
    db = load_db()
    excel_users = read_login_excel()
    all_users = excel_users if excel_users else db.get('users', [])
    
    user = next((u for u in all_users if u.get('email', '').lower() == email), None)
    if not user:
        return jsonify({"success": False, "error": "Account not found with this email."}), 404
    
    if user.get('password') and password and user.get('password') != password:
        return jsonify({"success": False, "error": "Invalid password."}), 401
    
    role = user.get('role', 'admin' if user.get('userType') == 'CANTEEN_OWNER' else 'student')
    user_to_send = {
        **user,
        "role": role,
        "id": user.get('id', 'STAFF-01' if role == 'admin' else f"STU-{str(user.get('phone', '1001'))[-4:]}")
    }
    return jsonify({"success": True, "user": user_to_send, "message": "Login successful."})

@app.route('/api/excel-status', methods=['GET'])
def get_excel_status():
    users = read_login_excel()
    return jsonify({
        "success": True,
        "loginExcel": {"path": str(LOGIN_EXCEL_PATH), "exists": LOGIN_EXCEL_PATH.exists(), "userCount": len(users)},
        "menuExcel": {"path": str(MENU_EXCEL_PATH), "exists": MENU_EXCEL_PATH.exists(), "ordersCount": 10}
    })

if __name__ == '__main__':
    import socket
    HOST = os.environ.get('HOST', '0.0.0.0')
    PORT = int(os.environ.get('PORT', 5000))
    
    local_ip = "127.0.0.1"
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        pass

    print("=======================================================")
    print("  🚀 Cambit Canteen Pre-Order System (Python Backend)")
    print(f"  💻 Host Machine URL: http://localhost:{PORT}")
    print(f"  📱 Student Mobile Access (LAN/Wi-Fi): http://{local_ip}:{PORT}")
    print("=======================================================")
    app.run(host=HOST, port=PORT, debug=True)
