package com.safarindiacabs.app;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class WhatsAppService {

    private static final String TAG = "WhatsAppService";

    // 🔑 Safar India Cabs - Verified Credentials
    private static final String PHONE_NUMBER_ID = "902764639583293";
    private static final String ACCESS_TOKEN = "EAAQJwftBnh4BSwB6NchrSSk726GnyhBhQ7KsRCdJjYD5ZBM9SzymkFEypXNws84BpNdbNVe3VpY48pDjjXZBZAdKbPboZBXlf8nzHhemNmvWNlwStfkcGSFfMTpPTExnhZAalcnx36ZBqXRhJeZBJo1NoJtjXhdZBo1zTJJywIOp6XKyW8poIxwlc5syie5J2qvubAZDZD";
    private static final String API_URL = "https://graph.facebook.com/v20.0/" + PHONE_NUMBER_ID + "/messages";

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    public interface WhatsAppCallback {
        void onSuccess(String response);
        void onError(Exception e);
    }

    // Common method to format and clean phone numbers (e.g., adds 91 for India)
    private String formatPhoneNumber(String phone) {
        String cleanPhone = phone.replaceAll("[^0-9]", "");
        if (cleanPhone.length() == 11 && cleanPhone.startsWith("0")) {
            cleanPhone = cleanPhone.substring(1);
        }
        if (!cleanPhone.startsWith("91") && cleanPhone.length() == 10) {
            cleanPhone = "91" + cleanPhone;
        }
        return cleanPhone;
    }

    /**
     * 1️⃣ CUSTOMER LOGIN OTP
     */
    public void sendCustomerOtp(String customerPhone, String otpCode, WhatsAppCallback callback) {
        String phone = formatPhoneNumber(customerPhone);
        String messageText = "🔐 *Safar India Cabs Verification*\n\nYour login OTP is: *" + otpCode + "*\nValid for 10 minutes. Do not share this with anyone.";
        sendTextMessage(phone, messageText, callback);
    }

    /**
     * 2️⃣ BOOKING CONFIRMATION TO CUSTOMER
     */
    public void sendBookingConfirmationToCustomer(String customerPhone, String bookingId, String pickup, String drop, String fare, WhatsAppCallback callback) {
        sendBookingConfirmationToCustomer(customerPhone, "Traveler", bookingId, pickup, drop, "", "Commercial Cab", fare, "", "", callback);
    }

    public void sendBookingConfirmationToCustomer(
            String customerPhone,
            String customerName,
            String bookingId,
            String pickup,
            String drop,
            String travelDateTime,
            String cabClass,
            String totalFare,
            String advancePaid,
            String balanceDue,
            WhatsAppCallback callback
    ) {
        String phone = formatPhoneNumber(customerPhone);
        String messageText = "✅ *Booking Confirmed - Safar India Cabs*\n\n" +
                "Hello *" + customerName + "*, your cab booking is confirmed!\n\n" +
                "📋 *Complete Booking Details:*\n" +
                "• Booking ID: *#" + bookingId + "*\n" +
                "📍 Pickup: *" + pickup + "*\n" +
                "🏁 Drop: *" + drop + "*\n" +
                (!travelDateTime.isEmpty() ? "🗓️ Date & Time: *" + travelDateTime + "*\n" : "") +
                (!cabClass.isEmpty() ? "🚕 Cab Category: *" + cabClass + "*\n" : "") +
                "\n💰 *Fare Breakdown:*\n" +
                "• Total Fare: *₹" + totalFare + "*\n" +
                (!advancePaid.isEmpty() ? "✅ Advance Paid: *₹" + advancePaid + "*\n" : "") +
                (!balanceDue.isEmpty() ? "💵 Balance Payable at Trip: *₹" + balanceDue + "*\n" : "") +
                "\n🚗 Driver and vehicle details will be shared on your WhatsApp shortly before pickup.\n" +
                "📞 24/7 Helpline: +91 7710080992\n" +
                "Thank you for choosing *Safar India Cabs*!";
        sendTextMessage(phone, messageText, callback);
    }

    /**
     * 3️⃣ NEW BOOKING ALERT TO ADMIN
     */
    public void sendNewBookingAlertToAdmin(String adminPhone, String bookingId, String customerName, String customerPhone, String pickup, String drop, WhatsAppCallback callback) {
        sendNewBookingAlertToAdmin(adminPhone, bookingId, customerName, customerPhone, pickup, drop, "", "", "", "", "", callback);
    }

    public void sendNewBookingAlertToAdmin(
            String adminPhone,
            String bookingId,
            String customerName,
            String customerPhone,
            String pickup,
            String drop,
            String travelDateTime,
            String cabClass,
            String totalFare,
            String advancePaid,
            String balanceDue,
            WhatsAppCallback callback
    ) {
        String phone = formatPhoneNumber(adminPhone);
        String messageText = "🚨 *New Booking Alert! (Safar India Cabs)*\n\n" +
                "Booking ID: *#" + bookingId + "*\n" +
                "👤 Customer: *" + customerName + "* (+91 " + customerPhone + ")\n" +
                "📍 Pickup: *" + pickup + "*\n" +
                "🏁 Drop: *" + drop + "*\n" +
                (!travelDateTime.isEmpty() ? "🗓️ Date & Time: *" + travelDateTime + "*\n" : "") +
                (!cabClass.isEmpty() ? "🚕 Cab Booked: *" + cabClass + "*\n" : "") +
                (!totalFare.isEmpty() ? "💰 Total Fare: *₹" + totalFare + "*\n" : "") +
                (!advancePaid.isEmpty() ? "✅ Advance Paid: *₹" + advancePaid + "*\n" : "") +
                (!balanceDue.isEmpty() ? "💵 Balance Due: *₹" + balanceDue + "*\n" : "") +
                "\n⚡ Booking has been updated in the Owner Panel. Please assign a driver from the Owner Panel immediately.";
        sendTextMessage(phone, messageText, callback);
    }

    /**
     * 4️⃣ TRIP DETAILS & ASSIGNMENT TO DRIVER
     */
    public void sendTripDetailsToDriver(String driverPhone, String driverName, String bookingId, String customerName, String customerPhone, String pickup, String drop, WhatsAppCallback callback) {
        sendTripDetailsToDriver(driverPhone, driverName, bookingId, customerName, customerPhone, pickup, drop, "", "", "", "", callback);
    }

    public void sendTripDetailsToDriver(
            String driverPhone,
            String driverName,
            String bookingId,
            String customerName,
            String customerPhone,
            String pickup,
            String drop,
            String travelDateTime,
            String vehicleName,
            String vehicleNumber,
            String balanceDue,
            WhatsAppCallback callback
    ) {
        String phone = formatPhoneNumber(driverPhone);
        String messageText = "🚖 *SafarIndiaCabs Driver Partner " + driverName + "*\n\n" +
                "Your Pickup is confirmed! Please timely complete the trip.\n\n" +
                "📋 *Complete Trip Info:*\n" +
                "• Booking ID: *#" + bookingId + "*\n" +
                "• Customer Name: *" + customerName + "*\n" +
                "• Customer Mobile: *+91 " + customerPhone + "*\n" +
                "• Pickup Location: *" + pickup + "*\n" +
                "• Drop Location: *" + drop + "*\n" +
                (!travelDateTime.isEmpty() ? "• Pickup Date & Time: *" + travelDateTime + "*\n" : "") +
                (!vehicleName.isEmpty() ? "• Assigned Vehicle: *" + vehicleName + " (" + vehicleNumber + ")*\n" : "") +
                (!balanceDue.isEmpty() ? "• Collect Balance at Drop: *₹" + balanceDue + "*\n" : "") +
                "\nPlease contact the customer promptly and reach pickup on time. Drive safely!\n" +
                "📞 Dispatch Helpline: +91 7710080992";
        sendTextMessage(phone, messageText, callback);
    }

    /**
     * 5️⃣ DRIVER & VEHICLE DETAILS TO CUSTOMER (Sent after Admin assigns driver)
     */
    public void sendDriverDetailsToCustomer(String customerPhone, String driverName, String driverPhoneNo, String vehicleName, String vehicleNumber, WhatsAppCallback callback) {
        sendDriverDetailsToCustomer(customerPhone, "Traveler", "", "", "", "", "", driverName, driverPhoneNo, vehicleName, vehicleNumber, callback);
    }

    public void sendDriverDetailsToCustomer(
            String customerPhone,
            String customerName,
            String bookingId,
            String pickup,
            String drop,
            String travelDateTime,
            String balanceDue,
            String driverName,
            String driverPhoneNo,
            String vehicleName,
            String vehicleNumber,
            WhatsAppCallback callback
    ) {
        String phone = formatPhoneNumber(customerPhone);
        String messageText = "🚗 *Driver & Vehicle Assigned! - Safar India Cabs*\n\n" +
                "Hello *" + customerName + "*, your ride is ready. Here are your complete driver & vehicle details:\n\n" +
                "👨‍✈️ *Driver Name:* " + driverName + "\n" +
                "📞 *Driver Contact:* +91 " + driverPhoneNo + "\n" +
                "🚙 *Vehicle Model:* " + vehicleName + "\n" +
                "🔢 *Vehicle Number:* " + vehicleNumber + "\n" +
                (!bookingId.isEmpty() ? "\n📋 *Trip Details:*\n• Booking ID: *#" + bookingId + "*\n• Route: *" + pickup + "* ➔ *" + drop + "*\n• Date & Time: *" + travelDateTime + "*\n• Balance Payable: *₹" + balanceDue + "*\n" : "") +
                "\nYour driver partner will contact you shortly before pickup.\n" +
                "📞 24/7 Helpline: +91 7710080992\n" +
                "Have a safe and happy journey with *Safar India Cabs*!";
        sendTextMessage(phone, messageText, callback);
    }

    /**
     * Core HTTP Sender Method (Meta Cloud API)
     */
    private void sendTextMessage(String recipientPhone, String messageText, WhatsAppCallback callback) {
        executor.execute(() -> {
            try {
                URL url = new URL(API_URL);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Authorization", "Bearer " + ACCESS_TOKEN);
                conn.setRequestProperty("Content-Type", "application/json; utf-8");
                conn.setRequestProperty("Accept", "application/json");
                conn.setDoOutput(true);

                // Build WhatsApp Cloud API Payload
                JSONObject payload = new JSONObject();
                payload.put("messaging_product", "whatsapp");
                payload.put("recipient_type", "individual");
                payload.put("to", recipientPhone);
                payload.put("type", "text");

                JSONObject textObj = new JSONObject();
                textObj.put("preview_url", false);
                textObj.put("body", messageText);
                payload.put("text", textObj);

                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = payload.toString().getBytes(StandardCharsets.UTF_8);
                    os.write(input, 0, input.length);
                }

                int code = conn.getResponseCode();
                if (code == 200 || code == 201) {
                    Log.d(TAG, "WhatsApp message sent successfully to " + recipientPhone);
                    if (callback != null) {
                        mainHandler.post(() -> callback.onSuccess("Message Sent Successfully"));
                    }
                } else {
                    Log.e(TAG, "Failed to send WhatsApp message. Response Code: " + code);
                    if (callback != null) {
                        mainHandler.post(() -> callback.onError(new Exception("HTTP Error Code: " + code)));
                    }
                }

            } catch (Exception e) {
                Log.e(TAG, "Network or Exception Error", e);
                if (callback != null) {
                    mainHandler.post(() -> callback.onError(e));
                }
            }
        });
    }
}
