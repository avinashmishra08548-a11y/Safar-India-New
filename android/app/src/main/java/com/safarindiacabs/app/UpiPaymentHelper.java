package com.safarindiacabs.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;
import android.util.Log;
import android.webkit.JavascriptInterface;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Safar India Cabs - Android 11+ (API Level 30+) UPI Intent Detection & Launcher Helper
 *
 * Works with the <queries> block in AndroidManifest.xml so that installed UPI apps
 * (Google Pay, PhonePe, Paytm, BHIM, CRED, Amazon Pay, WhatsApp) are properly detected
 * and rendered in the payment sheet and launched directly via Android Intent.
 */
public class UpiPaymentHelper {

    private static final String TAG = "UpiPaymentHelper";
    public static final int UPI_PAYMENT_REQUEST_CODE = 4102;

    // Known Indian UPI App Packages
    public static final String PKG_GOOGLE_PAY = "com.google.android.apps.nbu.paisa.user";
    public static final String PKG_PHONEPE = "com.phonepe.app";
    public static final String PKG_PAYTM = "net.one97.paytm";
    public static final String PKG_BHIM = "in.org.npci.upiapp";
    public static final String PKG_CRED = "com.dreamplug.androidapp";
    public static final String PKG_AMAZON_PAY = "in.amazon.mShop.android.shopping";
    public static final String PKG_WHATSAPP = "com.whatsapp";

    private final Activity activity;

    public UpiPaymentHelper(Activity activity) {
        this.activity = activity;
    }

    /**
     * Checks whether a specific UPI app package is installed on the device (Android 11+ compatible).
     */
    public static boolean isUpiAppInstalled(Context context, String packageName) {
        if (context == null || packageName == null || packageName.trim().isEmpty()) {
            return false;
        }
        PackageManager pm = context.getPackageManager();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                pm.getPackageInfo(packageName, PackageManager.PackageInfoFlags.of(0));
            } else {
                pm.getPackageInfo(packageName, 0);
            }
            // Verify it can also handle UPI intents
            Intent upiIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("upi://pay"));
            upiIntent.setPackage(packageName);
            List<ResolveInfo> activities = queryUpiActivities(pm, upiIntent);
            return activities != null && !activities.isEmpty();
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        } catch (Exception e) {
            Log.w(TAG, "Error checking UPI package " + packageName, e);
            return false;
        }
    }

    /**
     * Queries PackageManager for activities capable of handling a UPI Intent across API levels.
     */
    public static List<ResolveInfo> queryUpiActivities(PackageManager pm, Intent intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return pm.queryIntentActivities(
                    intent,
                    PackageManager.ResolveInfoFlags.of(PackageManager.MATCH_DEFAULT_ONLY)
            );
        } else {
            return pm.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY);
        }
    }

    /**
     * Returns a map of primary UPI apps and whether each is installed on the user's Android device.
     */
    public Map<String, Boolean> detectInstalledPrimaryUpiApps() {
        Map<String, Boolean> result = new LinkedHashMap<>();
        result.put("gpay", isUpiAppInstalled(activity, PKG_GOOGLE_PAY));
        result.put("phonepe", isUpiAppInstalled(activity, PKG_PHONEPE));
        result.put("paytm", isUpiAppInstalled(activity, PKG_PAYTM));
        result.put("bhim", isUpiAppInstalled(activity, PKG_BHIM));
        result.put("cred", isUpiAppInstalled(activity, PKG_CRED));
        result.put("amazon_pay", isUpiAppInstalled(activity, PKG_AMAZON_PAY));
        return result;
    }

    /**
     * Exposed to WebView via window.SafarUpiBridge.getInstalledUpiAppsJson()
     * so the payment UI knows exactly which UPI apps are installed on Android 11+.
     */
    @JavascriptInterface
    public String getInstalledUpiAppsJson() {
        try {
            JSONObject json = new JSONObject();
            Map<String, Boolean> map = detectInstalledPrimaryUpiApps();
            JSONArray installedList = new JSONArray();

            for (Map.Entry<String, Boolean> entry : map.entrySet()) {
                json.put(entry.getKey(), entry.getValue());
                if (Boolean.TRUE.equals(entry.getValue())) {
                    installedList.put(entry.getKey());
                }
            }

            // Also include any other UPI apps discovered via generic upi://pay query
            Intent genericUpiIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("upi://pay"));
            List<ResolveInfo> allResolvers = queryUpiActivities(activity.getPackageManager(), genericUpiIntent);
            json.put("totalUpiAppsCount", allResolvers != null ? allResolvers.size() : installedList.length());
            json.put("hasAnyUpiApp", (allResolvers != null && !allResolvers.isEmpty()) || installedList.length() > 0);
            json.put("installedApps", installedList);
            return json.toString();
        } catch (Exception e) {
            Log.e(TAG, "Failed to serialize installed UPI apps JSON", e);
            return "{\"gpay\":true,\"phonepe\":true,\"paytm\":true,\"bhim\":true,\"hasAnyUpiApp\":true}";
        }
    }

    /**
     * Exposed to WebView via window.SafarUpiBridge.launchUpiIntent(upiUrl, packageName)
     * Launches a specific UPI app or the system UPI chooser for a upi://pay or intent:// URI.
     */
    @JavascriptInterface
    public boolean launchUpiIntent(String upiUrl, String preferredPackage) {
        if (upiUrl == null || upiUrl.trim().isEmpty()) {
            return false;
        }
        try {
            Intent intent;
            if (upiUrl.startsWith("intent://")) {
                intent = Intent.parseUri(upiUrl, Intent.URI_INTENT_SCHEME);
                intent.addCategory(Intent.CATEGORY_BROWSABLE);
                intent.setComponent(null);
                intent.setSelector(null);
            } else {
                intent = new Intent(Intent.ACTION_VIEW, Uri.parse(upiUrl));
                intent.addCategory(Intent.CATEGORY_BROWSABLE);
            }

            if (preferredPackage != null && !preferredPackage.trim().isEmpty()
                    && isUpiAppInstalled(activity, preferredPackage.trim())) {
                intent.setPackage(preferredPackage.trim());
            }

            activity.runOnUiThread(() -> {
                try {
                    activity.startActivityForResult(intent, UPI_PAYMENT_REQUEST_CODE);
                } catch (ActivityNotFoundException ex) {
                    // Fallback to generic chooser without package restriction
                    try {
                        Intent fallback = new Intent(Intent.ACTION_VIEW, Uri.parse(upiUrl));
                        fallback.addCategory(Intent.CATEGORY_BROWSABLE);
                        fallback.setComponent(null);
                        fallback.setSelector(null);
                        activity.startActivityForResult(
                                Intent.createChooser(fallback, "Pay with UPI App"),
                                UPI_PAYMENT_REQUEST_CODE
                        );
                    } catch (Exception innerEx) {
                        Log.e(TAG, "No UPI app available to handle intent: " + upiUrl, innerEx);
                    }
                }
            });
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Error launching UPI intent: " + upiUrl, e);
            return false;
        }
    }

    /**
     * Intercepts UPI & Deep-Link URLs from WebViewClient.shouldOverrideUrlLoading
     */
    public boolean handleWebViewUrl(String url) {
        if (url == null || url.isEmpty()) {
            return false;
        }
        String lower = url.toLowerCase();
        boolean isUpiOrAppScheme = lower.startsWith("upi://")
                || lower.startsWith("tez://")
                || lower.startsWith("gpay://")
                || lower.startsWith("phonepe://")
                || lower.startsWith("paytmmp://")
                || lower.startsWith("paytm://")
                || lower.startsWith("bhim://")
                || lower.startsWith("credpay://")
                || lower.startsWith("intent://")
                || lower.startsWith("whatsapp://")
                || lower.startsWith("tel:")
                || lower.startsWith("mailto:");

        if (!isUpiOrAppScheme) {
            return false;
        }

        try {
            Intent intent;
            if (lower.startsWith("intent://")) {
                intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
                intent.addCategory(Intent.CATEGORY_BROWSABLE);
                intent.setComponent(null);
                intent.setSelector(null);
            } else {
                intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                intent.addCategory(Intent.CATEGORY_BROWSABLE);
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            activity.startActivity(intent);
            return true;
        } catch (ActivityNotFoundException e) {
            Log.w(TAG, "Target UPI/App for URL not installed: " + url, e);
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Failed to handle custom scheme URL: " + url, e);
            return true;
        }
    }
}
