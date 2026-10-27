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

    // Safar India Cabs - Verified Cloud API Endpoint
    private static final String PHONE_NUMBER_ID = "902764639583293";
    private static final String ACCESS_TOKEN = "";
    private static final String API_URL = "https://graph.facebook.com/v20.0/" + PHONE_NUMBER_ID + "/messages";

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    public interface WhatsAppCallback {
        void onSuccess(String response);
        void onError(Exception e);
    }

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

    private String cleanBookingId(String id) {
        String raw = id != null ? id.replace("#", "").trim() : "89751";
        return raw.startsWith("SIC-") ? raw : "SIC-" + raw;
    }

    /**
     * 1. CUSTOMER LOGIN OTP
     */
    public void sendCustomerOtp(String customerPhone, String otpCode, WhatsAppCallback callback) {
        String phone = formatPhoneNumber(customerPhone);
        String messageText = "🔐 *Safar India Cabs Verification*\n\nYour login OTP is: *" + otpCode + "*\nValid for 10 minutes. Do not share this with anyone.";
        sendTextMessage(phone, messageText, callback);
    }

    /**
     * 2. BOOKING CONFIRMATION TO CUSTOMER (Step 1 after payment)
     */
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
        String formattedId = cleanBookingId(bookingId);
        String messageText = "🚗 SAFARINDIACABS | BOOKING CONFIRMATION\n" +
                "Dear " + customerName + ",\n" +
                "Greetings from SafarIndiaCabs!\n" +
                "Your booking has been successfully confirmed. Please find your trip details below:\n" +
                "┌──────────────────────────┐\n" +
                "TRIP DETAILS\n" +
                "├──────────────────────────┤\n" +
                "• Booking ID: " + formattedId + "\n" +
                "• Pickup Location: " + pickup + "\n" +
                "• Drop Location: " + drop + "\n" +
                "• Date & Time: " + travelDateTime + "\n" +
                "• Cab Category: " + cabClass + "\n" +
                "└──────────────────────────┘💵 FARE & PAYMENT BREAKUP\n" +
                "• Total Fare: ₹" + totalFare + "/- (All Inclusive)\n" +
                "• Advance Paid: ₹" + advancePaid + "/-\n" +
                "• Balance Payable: ₹" + balanceDue + "/- (Payable to driver)\n\n" +
                "📞 CUSTOMER SUPPORT\n" +
                "• Helpline: +91-7710080992\n" +
                "• Website: https://safarindiacabs.com\n\n" +
                "We wish you a pleasant, safe, and comfortable journey! 🚖";
        sendTextMessage(phone, messageText, callback);
    }

    /**
     * 3. NEW BOOKING ALERT TO ADMIN (Owner Panel Notification)
     */
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
        String formattedId = cleanBookingId(bookingId);
        String messageText = "🚨 *NEW BOOKING RECEIVED | OWNER PANEL*\n\n" +
                "┌──────────────────────────┐\n" +
                "BOOKING SUMMARY\n" +
                "├──────────────────────────┤\n" +
                "• Booking ID: " + formattedId + "\n" +
                "• Customer: " + customerName + "\n" +
                "• Mobile: +91 " + customerPhone + "\n" +
                "• Pickup: " + pickup + "\n" +
                "• Drop: " + drop + "\n" +
                "• Date & Time: " + travelDateTime + "\n" +
                "• Cab Category: " + cabClass + "\n" +
                "└──────────────────────────┘\n" +
                "💵 PAYMENT DETAILS\n" +
                "• Total Fare: ₹" + totalFare + "/-\n" +
                "• Advance Paid: ₹" + advancePaid + "/-\n" +
                "• Balance to Collect: ₹" + balanceDue + "/-\n\n" +
                "⚡ Booking is live in the Owner Panel. Please open Owner Panel to allot Vehicle & Driver.";
        sendTextMessage(phone, messageText, callback);
    }

    /**
     * 4. DRIVER DUTY ALLOTMENT TO DRIVER (Step 2B when Owner assigns driver)
     */
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
        String formattedId = cleanBookingId(bookingId);
        String messageText = "🚖 SAFARINDIACABS | DRIVER DUTY ALLOTMENT\n\n" +
                "Dear " + driverName + " ji,\n\n" +
                "Your pickup duty has been confirmed by SafarIndiaCabs. Details are given below:\n\n" +
                "┌──────────────────────────┐\n" +
                "TRIP DETAILS\n" +
                "├──────────────────────────┤\n" +
                "• Booking ID: " + formattedId + "\n" +
                "• Customer Name: " + customerName + "\n" +
                "• Customer Mobile: +91 " + customerPhone + "\n" +
                "• Pickup Location: " + pickup + "\n" +
                "• Drop Location: " + drop + "\n" +
                "• Date & Time: " + travelDateTime + "\n" +
                "• Vehicle: " + vehicleName + " (" + vehicleNumber + ")\n" +
                "└──────────────────────────┘\n\n" +
                "💵 PAYMENT COLLECTION\n" +
                "• Collect Balance: ₹" + balanceDue + "/- (Collect from customer)\n\n" +
                "📌 Important Instructions:\n" +
                "Call the customer immediately and reach the pickup location before time. Keep the vehicle clean and strictly follow the non-smoking/non-drinking policy.\n\n" +
                "📞 HELP & SUPPORT\n" +
                "• Helpline: +91-7710080992\n" +
                "• Website: https://safarindiacabs.com";
        sendTextMessage(phone, messageText, callback);
    }

    /**
     * 5. VEHICLE & DRIVER ALLOTMENT TO CUSTOMER (Step 2A when Owner assigns driver)
     */
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
        String formattedId = cleanBookingId(bookingId);
        String messageText = "👨‍✈️ SAFARINDIACABS | DRIVER ALLOTMENT\n\n" +
                "Dear " + customerName + ",\n\n" +
                "Greetings from SafarIndiaCabs!\n" +
                "Your driver and vehicle have been assigned for your upcoming trip. Details below:\n\n" +
                "┌──────────────────────────┐\n" +
                "TRIP SUMMARY\n" +
                "├──────────────────────────┤\n" +
                "• Booking ID: " + formattedId + "\n" +
                "• Route: " + pickup + " to " + drop + "\n" +
                "• Pickup Date & Time: " + travelDateTime + "\n" +
                "└──────────────────────────┘\n\n" +
                "🚗 DRIVER & VEHICLE DETAILS\n" +
                "• Driver Name: " + driverName + "\n" +
                "• Driver Contact: +91 " + driverPhoneNo + "\n" +
                "• Vehicle Category: " + vehicleName + "\n" +
                "• Vehicle Number: " + vehicleNumber + "\n\n" +
                "Have a safe, comfortable, and pleasant journey! 🚖";
        sendTextMessage(phone, messageText, callback);
    }

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
                    if (callback != null) {
                        mainHandler.post(() -> callback.onSuccess("Message Sent Successfully"));
                    }
                } else {
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
