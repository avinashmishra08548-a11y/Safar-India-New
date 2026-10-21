package com.safarindiacabs.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.os.Bundle;
import android.os.Message;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Safar India Cabs - Main Android Activity
 *
 * Configures WebView and Razorpay Checkout integration to fully support UPI Intent flow
 * (Google Pay, PhonePe, Paytm, BHIM) on Android 11+ (API Level 30 and above):
 * 1. Strips the "; wv" WebView marker from User-Agent so Razorpay Checkout renders UPI Intent apps
 *    instead of restricting to Card/EMI/NetBanking/Wallet.
 * 2. Registers @JavascriptInterface "SafarUpiBridge" backed by Android 11+ <queries> detection.
 * 3. Intercepts upi://, tez://, gpay://, phonepe://, paytmmp://, bhim://, and intent:// deep links
 *    in both the primary WebView and popup windows created by Razorpay Checkout.
 */
public class MainActivity extends Activity {

    private static final String APP_URL = "https://www.safarindiacabs.com/";
    private WebView webView;
    private UpiPaymentHelper upiPaymentHelper;

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
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        // CRITICAL FIX FOR RAZORPAY UPI INTENT IN ANDROID APP:
        // Razorpay checkout.js hides UPI Intent apps (GPay, PhonePe, Paytm, BHIM) when it detects "; wv"
        // or "Version/4.0" in the Android WebView User-Agent. Normalizing to standard Android Chrome UA
        // ensures Razorpay renders all UPI Intent apps on the payment sheet.
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

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request != null && request.getUrl() != null) {
                    String url = request.getUrl().toString();
                    if (upiPaymentHelper.handleWebViewUrl(url)) {
                        return true;
                    }
                }
                return false;
            }

            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (upiPaymentHelper.handleWebViewUrl(url)) {
                    return true;
                }
                return false;
            }
        });

        // Handle popup windows opened by Razorpay Checkout for UPI Intent redirects
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                WebView tempWebView = new WebView(MainActivity.this);
                tempWebView.getSettings().setJavaScriptEnabled(true);
                tempWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView popupView, WebResourceRequest request) {
                        if (request != null && request.getUrl() != null) {
                            String url = request.getUrl().toString();
                            if (upiPaymentHelper.handleWebViewUrl(url)) {
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
                        if (upiPaymentHelper.handleWebViewUrl(url)) {
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

        webView.loadUrl(APP_URL);
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
