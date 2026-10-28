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

import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * Safar India Cabs - Production Android Activity (com.safarindiacabs.app)
 *
 * Hardened against Cross-App Scripting (Google Play Device & Network Abuse remediation):
 * 1. Disables all WebView local file & content access:
 *    - setAllowFileAccess(false)
 *    - setAllowContentAccess(false)
 *    - setAllowFileAccessFromFileURLs(false)
 *    - setAllowUniversalAccessFromFileURLs(false)
 *    - setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW)
 * 2. Sanitizes and validates any incoming Intent URI against a strict allowlist
 *    (https://safarindiacabs.com and https://www.safarindiacabs.com only) before loading,
 *    defaulting safely to the canonical APP_URL.
 * 3. Restricts WebView navigation and JavaScript bridge exposure strictly to trusted HTTPS origins.
 */
public class MainActivity extends Activity {

    private static final String APP_URL = "https://safarindiacabs.com/";
    private static final int LOCATION_PERMISSION_REQUEST_CODE = 4201;

    private static final Set<String> TRUSTED_HOSTS = new HashSet<>(Arrays.asList(
            "safarindiacabs.com",
            "www.safarindiacabs.com"
    ));

    private static final Set<String> ALLOWED_CHECKOUT_HOSTS = new HashSet<>(Arrays.asList(
            "safarindiacabs.com",
            "www.safarindiacabs.com",
            "api.razorpay.com",
            "checkout.razorpay.com"
    ));

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

        configureSecureWebSettings(webView.getSettings());

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                if (!isSafeHttpsUrl(url)) {
                    return;
                }
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    intent.addCategory(Intent.CATEGORY_BROWSABLE);
                    intent.setComponent(null);
                    intent.setSelector(null);
                    startActivity(intent);
                } catch (Exception ignored) {
                }
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request != null && request.getUrl() != null) {
                    return handleWebViewNavigation(request.getUrl());
                }
                return true;
            }

            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url != null) {
                    return handleWebViewNavigation(Uri.parse(url));
                }
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (!isTrustedAppUrl(origin)) {
                    callback.invoke(origin, false, false);
                    return;
                }
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
                WebSettings popupSettings = tempWebView.getSettings();
                popupSettings.setAllowFileAccess(false);
                popupSettings.setAllowContentAccess(false);
                popupSettings.setAllowFileAccessFromFileURLs(false);
                popupSettings.setAllowUniversalAccessFromFileURLs(false);
                popupSettings.setJavaScriptEnabled(false);

                tempWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView popupView, WebResourceRequest request) {
                        if (request != null && request.getUrl() != null) {
                            Uri targetUri = request.getUrl();
                            handleExternalOrUpiUrl(targetUri.toString());
                        }
                        popupView.destroy();
                        return true;
                    }

                    @Override
                    @SuppressWarnings("deprecation")
                    public boolean shouldOverrideUrlLoading(WebView popupView, String url) {
                        if (url != null) {
                            handleExternalOrUpiUrl(url);
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

        // Always load the canonical verified HTTPS origin; never pass raw Intent data to loadUrl
        webView.loadUrl(APP_URL);
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureSecureWebSettings(WebSettings settings) {
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        // Hardened Cross-App Scripting & File Access protections
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.setSafeBrowsingEnabled(true);
        }

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
    }

    /**
     * Validates that a URL strictly uses HTTPS and points to safarindiacabs.com.
     */
    public static boolean isTrustedAppUrl(String url) {
        if (url == null || url.trim().isEmpty()) {
            return false;
        }
        try {
            Uri uri = Uri.parse(url.trim());
            String scheme = uri.getScheme();
            String host = uri.getHost();
            if (scheme == null || host == null) {
                return false;
            }
            return "https".equalsIgnoreCase(scheme)
                    && TRUSTED_HOSTS.contains(host.toLowerCase(Locale.US));
        } catch (Exception e) {
            return false;
        }
    }

    private static boolean isSafeHttpsUrl(String url) {
        if (url == null || url.trim().isEmpty()) {
            return false;
        }
        try {
            Uri uri = Uri.parse(url.trim());
            return "https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean handleWebViewNavigation(Uri uri) {
        if (uri == null) {
            return true;
        }
        String url = uri.toString();
        if (handleExternalOrUpiUrl(url)) {
            return true;
        }
        String scheme = uri.getScheme();
        String host = uri.getHost();
        if (scheme != null && "https".equalsIgnoreCase(scheme) && host != null) {
            String lowerHost = host.toLowerCase(Locale.US);
            if (ALLOWED_CHECKOUT_HOSTS.contains(lowerHost) || lowerHost.endsWith(".razorpay.com")) {
                return false; // Allow in-WebView load for trusted app & Razorpay checkout hosts
            }
            // Open any other external HTTPS link in external browser safely
            try {
                Intent browserIntent = new Intent(Intent.ACTION_VIEW, uri);
                browserIntent.addCategory(Intent.CATEGORY_BROWSABLE);
                browserIntent.setComponent(null);
                browserIntent.setSelector(null);
                startActivity(browserIntent);
            } catch (Exception ignored) {
            }
            return true;
        }
        // Block file://, content://, javascript:, data:, and any untrusted schemes
        return true;
    }

    private boolean handleExternalOrUpiUrl(String url) {
        if (url == null || url.isEmpty()) {
            return false;
        }
        if (upiPaymentHelper.handleWebViewUrl(url)) {
            return true;
        }
        String lower = url.toLowerCase(Locale.US);
        if (lower.startsWith("https://wa.me/")
                || lower.startsWith("https://api.whatsapp.com/")
                || lower.startsWith("https://chat.whatsapp.com/")) {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                intent.addCategory(Intent.CATEGORY_BROWSABLE);
                intent.setComponent(null);
                intent.setSelector(null);
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
            if (isTrustedAppUrl(pendingGeoOrigin)) {
                pendingGeoCallback.invoke(pendingGeoOrigin, granted, false);
            } else {
                pendingGeoCallback.invoke(pendingGeoOrigin, false, false);
            }
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
