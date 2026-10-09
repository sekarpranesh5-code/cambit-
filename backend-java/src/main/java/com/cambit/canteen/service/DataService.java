package com.cambit.canteen.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class DataService {

    private final ObjectMapper mapper = new ObjectMapper();
    private final Path dbPath = Paths.get("../data/database.json");
    private final File loginExcelFile = new File("C:\\Users\\Pranesh\\OneDrive\\Documents\\login_details.xlsx");
    private final File menuExcelFile = new File("C:\\Users\\Pranesh\\OneDrive\\Documents\\MENU.xlsx");

    public Map<String, Object> loadDb() {
        try {
            if (Files.exists(dbPath)) {
                return mapper.readValue(Files.readAllBytes(dbPath), Map.class);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return new HashMap<>();
    }

    public synchronized void saveDb(Map<String, Object> data) {
        try {
            Files.createDirectories(dbPath.getParent());
            mapper.writerWithDefaultPrettyPrinter().writeValue(dbPath.toFile(), data);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public String generateQrBase64(String text) {
        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            BitMatrix bitMatrix = qrCodeWriter.encode(text, BarcodeFormat.QR_CODE, 200, 200);
            ByteArrayOutputStream pngOutputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", pngOutputStream);
            byte[] pngData = pngOutputStream.toByteArray();
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(pngData);
        } catch (Exception e) {
            return "";
        }
    }

    public List<Map<String, Object>> readLoginExcel() {
        List<Map<String, Object>> users = new ArrayList<>();
        if (!loginExcelFile.exists()) return users;

        try (FileInputStream fis = new FileInputStream(loginExcelFile);
             Workbook workbook = new XSSFWorkbook(fis)) {
            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) return users;

            Map<String, Integer> colMap = new HashMap<>();
            for (Cell cell : headerRow) {
                colMap.put(cell.getStringCellValue().trim(), cell.getColumnIndex());
            }

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                Map<String, Object> u = new HashMap<>();
                u.put("name", getCellValue(row, colMap.get("NAME")));
                u.put("email", getCellValue(row, colMap.get("EMAIL_NAME")));
                u.put("password", getCellValue(row, colMap.get("PASSWORD")));
                u.put("phone", getCellValue(row, colMap.get("PHONE_NUMBER")));
                u.put("userType", getCellValue(row, colMap.get("USERTYPE(CANTEEN_OWNER/CUSTOMER)")));
                u.put("lunchSlot", getCellValue(row, colMap.get("LUNCH_SLOT")));
                users.add(u);
            }
        } catch (Exception e) {
            System.err.println("Error reading login_details.xlsx: " + e.getMessage());
        }
        return users;
    }

    public synchronized boolean addUserToLoginExcel(Map<String, Object> newUser) {
        try {
            List<Map<String, Object>> users = readLoginExcel();
            boolean found = false;
            String newEmail = (String) newUser.get("email");

            for (Map<String, Object> u : users) {
                if (newEmail != null && newEmail.equalsIgnoreCase((String) u.get("email"))) {
                    u.putAll(newUser);
                    found = true;
                    break;
                }
            }
            if (!found) {
                users.add(newUser);
            }

            Workbook workbook = new XSSFWorkbook();
            Sheet sheet = workbook.createSheet("Sheet1");

            String[] headers = {"NAME", "EMAIL_NAME", "PASSWORD", "PHONE_NUMBER", "USERTYPE(CANTEEN_OWNER/CUSTOMER)", "LUNCH_SLOT"};
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                headerRow.createCell(i).setCellValue(headers[i]);
            }

            int rowIdx = 1;
            for (Map<String, Object> u : users) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue((String) u.getOrDefault("name", ""));
                row.createCell(1).setCellValue((String) u.getOrDefault("email", ""));
                row.createCell(2).setCellValue((String) u.getOrDefault("password", "password123"));
                row.createCell(3).setCellValue(String.valueOf(u.getOrDefault("phone", "9876543210")));
                row.createCell(4).setCellValue((String) u.getOrDefault("userType", "CUSTOMER"));
                row.createCell(5).setCellValue((String) u.getOrDefault("lunchSlot", "Slot 1: 12:05 PM"));
            }

            if (loginExcelFile.getParentFile() != null) {
                loginExcelFile.getParentFile().mkdirs();
            }
            try (FileOutputStream fos = new FileOutputStream(loginExcelFile)) {
                workbook.write(fos);
            }
            workbook.close();
            return true;
        } catch (Exception e) {
            System.err.println("Error writing to login_details.xlsx: " + e.getMessage());
            return false;
        }
    }

    private String getCellValue(Row row, Integer colIdx) {
        if (colIdx == null) return "";
        Cell cell = row.getCell(colIdx);
        if (cell == null) return "";
        if (cell.getCellType() == CellType.STRING) return cell.getStringCellValue();
        if (cell.getCellType() == CellType.NUMERIC) return String.valueOf((long) cell.getNumericCellValue());
        return cell.toString();
    }
}
