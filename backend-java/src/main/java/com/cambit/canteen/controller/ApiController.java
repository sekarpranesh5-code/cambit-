package com.cambit.canteen.controller;

import com.cambit.canteen.service.DataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ApiController {

    @Autowired
    private DataService dataService;

    @GetMapping("/system")
    public ResponseEntity<?> getSystem() {
        Map<String, Object> db = dataService.loadDb();
        Map<String, Object> system = (Map<String, Object>) db.getOrDefault("system", new HashMap<>());
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("system", system);

        Map<String, Object> effectiveTime = new HashMap<>();
        effectiveTime.put("isSimulated", false);
        effectiveTime.put("date", LocalDate.now().toString());
        effectiveTime.put("time", LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm")));
        effectiveTime.put("timestamp", LocalDateTime.now().toString());
        response.put("effectiveTime", effectiveTime);

        Map<String, Object> adv = new HashMap<>();
        adv.put("slot1", Map.of("allowed", true, "cutoffTime", "11:05", "minsRemaining", 60));
        adv.put("slot2", Map.of("allowed", true, "cutoffTime", "11:55", "minsRemaining", 110));
        response.put("advanceRuleStatus", adv);

        Map<String, Object> caps = new HashMap<>();
        caps.put("slot1", Map.of("capacity", 45, "booked", 18, "available", 27, "isFull", false));
        caps.put("slot2", Map.of("capacity", 60, "booked", 45, "available", 15, "isFull", false));
        response.put("capacities", caps);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/menu")
    public ResponseEntity<?> getMenu() {
        Map<String, Object> db = dataService.loadDb();
        return ResponseEntity.ok(Map.of("success", true, "menu", db.getOrDefault("menu", List.of())));
    }

    @GetMapping("/orders")
    public ResponseEntity<?> getOrders() {
        Map<String, Object> db = dataService.loadDb();
        return ResponseEntity.ok(Map.of("success", true, "orders", db.getOrDefault("orders", List.of())));
    }

    @PostMapping("/orders")
    public ResponseEntity<?> createOrder(@RequestBody Map<String, Object> body) {
        Map<String, Object> db = dataService.loadDb();
        List<Map<String, Object>> orders = (List<Map<String, Object>>) db.getOrDefault("orders", new ArrayList<>());

        int tokenNum = orders.size() + 1001;
        String slotId = (String) body.getOrDefault("slotId", "slot1");
        String slotPrefix = "slot1".equalsIgnoreCase(slotId) ? "1205" : "1255";
        String tokenCode = "TKN-" + slotPrefix + "-" + tokenNum;

        Map<String, Object> order = new HashMap<>();
        order.put("id", "ORD-" + tokenNum);
        order.put("tokenCode", tokenCode);
        order.put("customerId", body.getOrDefault("customerId", "STU-1001"));
        order.put("customerName", body.getOrDefault("customerName", "Student"));
        order.put("customerRole", body.getOrDefault("customerRole", "student"));
        order.put("customerEmail", body.getOrDefault("customerEmail", "student@college.edu"));
        order.put("orderDate", body.getOrDefault("orderDate", LocalDate.now().toString()));
        order.put("slotId", slotId);
        order.put("slotName", "slot1".equalsIgnoreCase(slotId) ? "Slot 1: 12:05 PM" : "Slot 2: 12:55 PM");
        order.put("orderPlacedAt", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        
        List<Map<String, Object>> items = (List<Map<String, Object>>) body.getOrDefault("items", new ArrayList<>());
        order.put("items", items);

        int totalPlates = items.stream().mapToInt(i -> (int) i.getOrDefault("quantity", 1)).sum();
        int totalAmount = items.stream().mapToInt(i -> ((int) i.getOrDefault("price", 0)) * ((int) i.getOrDefault("quantity", 1))).sum();
        order.put("totalPlates", totalPlates);
        order.put("totalAmount", totalAmount);
        order.put("paymentStatus", "PAID");
        order.put("paymentMethod", body.getOrDefault("paymentMethod", "Sample UPI (QR Payment)"));
        order.put("transactionId", "TXN-FASTPAY-" + tokenNum);
        order.put("tokenStatus", "ACTIVE");
        order.put("qrCodeUrl", dataService.generateQrBase64(tokenCode));

        orders.add(0, order);
        db.put("orders", orders);
        dataService.saveDb(db);

        return ResponseEntity.ok(Map.of("success", true, "order", order));
    }

    @PostMapping("/orders/notify-incharge")
    public ResponseEntity<?> notifyIncharge(@RequestBody Map<String, Object> body) {
        String tokenCode = (String) body.getOrDefault("tokenCode", "TKN-DEMO");
        return ResponseEntity.ok(Map.of("success", true, "message", "Alert dispatched to Canteen Incharge for Token " + tokenCode));
    }

    @GetMapping("/tokens/{code}")
    public ResponseEntity<?> getToken(@PathVariable String code) {
        Map<String, Object> db = dataService.loadDb();
        List<Map<String, Object>> orders = (List<Map<String, Object>>) db.getOrDefault("orders", List.of());
        for (Map<String, Object> o : orders) {
            if (code.equalsIgnoreCase((String) o.get("tokenCode"))) {
                return ResponseEntity.ok(Map.of("success", true, "order", o));
            }
        }
        return ResponseEntity.status(404).body(Map.of("success", false, "error", "Token not found"));
    }

    @PostMapping("/tokens/{code}/redeem")
    public ResponseEntity<?> redeemToken(@PathVariable String code) {
        Map<String, Object> db = dataService.loadDb();
        List<Map<String, Object>> orders = (List<Map<String, Object>>) db.getOrDefault("orders", new ArrayList<>());
        for (Map<String, Object> o : orders) {
            if (code.equalsIgnoreCase((String) o.get("tokenCode"))) {
                o.put("tokenStatus", "REDEEMED");
                o.put("redeemedAt", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
                dataService.saveDb(db);
                return ResponseEntity.ok(Map.of("success", true, "order", o));
            }
        }
        return ResponseEntity.status(404).body(Map.of("success", false, "error", "Token not found"));
    }

    @GetMapping("/feedback")
    public ResponseEntity<?> getFeedback() {
        Map<String, Object> db = dataService.loadDb();
        List<Map<String, Object>> fbs = (List<Map<String, Object>>) db.getOrDefault("feedbacks", List.of());
        return ResponseEntity.ok(Map.of(
                "success", true,
                "feedbacks", fbs,
                "overallAvg", 4.8,
                "avgQuantity", 4.8,
                "avgQuality", 4.8,
                "totalReviews", fbs.size(),
                "byFood", Map.of()
        ));
    }

    @PostMapping("/feedback")
    public ResponseEntity<?> addFeedback(@RequestBody Map<String, Object> body) {
        Map<String, Object> db = dataService.loadDb();
        List<Map<String, Object>> fbs = (List<Map<String, Object>>) db.getOrDefault("feedbacks", new ArrayList<>());
        
        Map<String, Object> fb = new HashMap<>(body);
        fb.put("id", "FB-" + (fbs.size() + 1));
        fb.put("submittedAt", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        fbs.add(0, fb);
        
        db.put("feedbacks", fbs);
        dataService.saveDb(db);
        return ResponseEntity.status(201).body(Map.of("success", true, "feedback", fb));
    }

    @PostMapping("/auth/register")
    public ResponseEntity<?> register(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String email = (String) body.get("email");
        if (name == null || email == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Name and Email are required"));
        }

        String userType = (String) body.getOrDefault("userType", "CUSTOMER");
        String role = "CANTEEN_OWNER".equalsIgnoreCase(userType) ? "admin" : "student";
        String phone = (String) body.getOrDefault("phone", "9876543210");

        Map<String, Object> user = new HashMap<>();
        user.put("name", name);
        user.put("email", email);
        user.put("phone", phone);
        user.put("password", body.getOrDefault("password", "password123"));
        user.put("userType", userType);
        user.put("role", role);
        user.put("lunchSlot", body.getOrDefault("lunchSlot", "Slot 1: 12:05 PM"));
        user.put("slotId", body.getOrDefault("slotId", "slot1"));
        user.put("id", "STU-" + (phone.length() >= 4 ? phone.substring(phone.length() - 4) : "1001"));

        Map<String, Object> db = dataService.loadDb();
        List<Map<String, Object>> users = (List<Map<String, Object>>) db.getOrDefault("users", new ArrayList<>());
        users.removeIf(u -> email.equalsIgnoreCase((String) u.get("email")));
        users.add(user);
        db.put("users", users);
        dataService.saveDb(db);
        dataService.addUserToLoginExcel(user);

        return ResponseEntity.status(201).body(Map.of("success", true, "user", user, "message", "Account registered successfully."));
    }

    @PostMapping("/auth/login")
    public ResponseEntity<?> login(@RequestBody Map<String, Object> body) {
        String email = (String) body.getOrDefault("email", "");
        String password = (String) body.getOrDefault("password", "");

        List<Map<String, Object>> users = dataService.readLoginExcel();
        if (users.isEmpty()) {
            Map<String, Object> db = dataService.loadDb();
            users = (List<Map<String, Object>>) db.getOrDefault("users", List.of());
        }

        Map<String, Object> foundUser = null;
        for (Map<String, Object> u : users) {
            if (email.equalsIgnoreCase((String) u.get("email"))) {
                foundUser = u;
                break;
            }
        }

        if (foundUser == null) {
            return ResponseEntity.status(404).body(Map.of("success", false, "error", "Account not found with this email."));
        }

        String userPass = (String) foundUser.get("password");
        if (userPass != null && !userPass.isEmpty() && !password.isEmpty() && !userPass.equals(password)) {
            return ResponseEntity.status(401).body(Map.of("success", false, "error", "Invalid password."));
        }

        String userType = (String) foundUser.getOrDefault("userType", "CUSTOMER");
        String role = "CANTEEN_OWNER".equalsIgnoreCase(userType) ? "admin" : "student";
        Map<String, Object> userToSend = new HashMap<>(foundUser);
        userToSend.put("role", role);
        userToSend.put("id", "admin".equals(role) ? "STAFF-01" : "STU-1001");

        return ResponseEntity.ok(Map.of("success", true, "user", userToSend, "message", "Login successful."));
    }

    @GetMapping("/excel-status")
    public ResponseEntity<?> getExcelStatus() {
        List<Map<String, Object>> users = dataService.readLoginExcel();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "loginExcel", Map.of("userCount", users.size()),
                "menuExcel", Map.of("ordersCount", 10)
        ));
    }
}
