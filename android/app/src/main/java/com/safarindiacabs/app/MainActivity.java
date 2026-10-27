package com.safarindiacabs.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Safar India Cabs - Production Android Activity (com.safarindiacabs.app)
 *
 * Configures WebView, Geolocation, WhatsApp Dispatch, and Razorpay Checkout integration:
 * 1. Strips the "; wv" WebView marker from User-Agent so Razorpay Checkout renders UPI Intent apps.
 * 2. Registers @JavascriptInterface "SafarUpiBridge" backed by Android 11+ <queries> detection.
 * 3. Intercepts upi://, tez://, gpay://, phonepe://, paytmmp://, bhim://, whatsapp://, wa.me, tel:,
 *    mailto:, and intent:// deep links.
 * 4. Handles GPS Location permissions for accurate cab pickup point selection.
 */
public class MainActivity extends Activity {

    private static final String APP_URL = "https://safarindiacabs.com/";
    private static final int LOCATION_PERMISSION_REQUEST_CODE = 4201;

    private WebView webView;
    private UpiPaymentHelper upiPaymentHelper;
    private String pendingGeoOrigin;
    private GeolocationPermissions.Callback pendingGeoCallback;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        upiPaymentHelper = new UpiPaymentHelper(this);
        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        // Normalize WebView User-Agent so Razorpay Checkout renders all UPI Intent apps
        String defaultUa = settings.getUserAgentString();
        if (defaultUa != null) {
            String chromeMobileUa = defaultUa
                    .replace("; wv)", ")")
                    .replace("; wv;", ";")
                    .replace("wv", "")
                    .replaceAll("Version/\\d+\\.\\d+\\s*", "");
            settings.setUserAgentString(chromeMobileUa);
        }

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        // Expose Android 11+ UPI package detector & intent launcher to JavaScript
        webView.addJavascriptInterface(upiPaymentHelper, "SafarUpiBridge");

        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                } catch (Exception ignored) {
                }
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request != null && request.getUrl() != null) {
                    String url = request.getUrl().toString();
                    if (handleExternalOrUpiUrl(url)) {
                        return true;
                    }
                }
                return false;
            }

            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (handleExternalOrUpiUrl(url)) {
                    return true;
                }
                return false;
            }
        });

        // Handle Geolocation permissions & popup windows opened by Razorpay / WhatsApp
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                            || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                        callback.invoke(origin, true, false);
                    } else {
                        pendingGeoOrigin = origin;
                        pendingGeoCallback = callback;
                        requestPermissions(
                                new String[]{
                                        Manifest.permission.ACCESS_FINE_LOCATION,
                                        Manifest.permission.ACCESS_COARSE_LOCATION
                                },
                                LOCATION_PERMISSION_REQUEST_CODE
                        );
                    }
                } else {
                    callback.invoke(origin, true, false);
                }
            }

            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                WebView tempWebView = new WebView(MainActivity.this);
                tempWebView.getSettings().setJavaScriptEnabled(true);
                tempWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView popupView, WebResourceRequest request) {
                        if (request != null && request.getUrl() != null) {
                            String url = request.getUrl().toString();
                            if (handleExternalOrUpiUrl(url)) {
                                popupView.destroy();
                                return true;
                            }
                            webView.loadUrl(url);
                            popupView.destroy();
                            return true;
                        }
                        return false;
                    }

                    @Override
                    @SuppressWarnings("deprecation")
                    public boolean shouldOverrideUrlLoading(WebView popupView, String url) {
                        if (handleExternalOrUpiUrl(url)) {
                            popupView.destroy();
                            return true;
                        }
                        if (url != null) {
                            webView.loadUrl(url);
                        }
                        popupView.destroy();
                        return true;
                    }
                });

                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(tempWebView);
                resultMsg.sendToTarget();
                return true;
            }
        });

        Intent launchIntent = getIntent();
        if (launchIntent != null && Intent.ACTION_VIEW.equals(launchIntent.getAction()) && launchIntent.getData() != null) {
            webView.loadUrl(launchIntent.getDataString());
        } else {
            webView.loadUrl(APP_URL);
        }
    }

    private boolean handleExternalOrUpiUrl(String url) {
        if (url == null || url.isEmpty()) {
            return false;
        }
        if (upiPaymentHelper.handleWebViewUrl(url)) {
            return true;
        }
        String lower = url.toLowerCase();
        if (lower.startsWith("https://wa.me/")
                || lower.startsWith("https://api.whatsapp.com/")
                || lower.startsWith("https://chat.whatsapp.com/")) {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
                return true;
            } catch (Exception ignored) {
                return false;
            }
        }
        return false;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == LOCATION_PERMISSION_REQUEST_CODE && pendingGeoCallback != null) {
            boolean granted = false;
            if (grantResults != null) {
                for (int res : grantResults) {
                    if (res == PackageManager.PERMISSION_GRANTED) {
                        granted = true;
                        break;
                    }
                }
            }
            pendingGeoCallback.invoke(pendingGeoOrigin, granted, false);
            pendingGeoCallback = null;
            pendingGeoOrigin = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
