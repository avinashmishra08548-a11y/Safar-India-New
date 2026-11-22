package com.safarindiacabs.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Insets;
import android.graphics.Typeface;
import android.graphics.drawable.ClipDrawable;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.LayerDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Safar India Cabs - Production Android Activity (com.safarindiacabs.app)
 * Version 1.1.0 (versionCode 10)
 *
 * Key upgrades:
 * - Native branded splash overlay with bundled SafarIndiaCabs crest & intercity poster
 * - Bundled static asset acceleration (assets/webapp/) via safe shouldInterceptRequest()
 *   so CSS, JS, icons & brand images load at 0ms while keeping live HTML & pricing fresh
 * - Android 15/16 (targetSdk 36) edge-to-edge WindowInsets padding (status bar, nav bar & IME)
 * - Automatic one-time WebView cache clear on app version upgrade
 * - Native offline/retry screen with 1-tap Retry, WhatsApp Booking & 24x7 Call Helpline
 *
 * Hardened against Cross-App Scripting (Google Play Device & Network Abuse remediation):
 * 1. Disables all WebView local file & content access:
 *    - setAllowFileAccess(false)
 *    - setAllowContentAccess(false)
 *    - setAllowFileAccessFromFileURLs(false)
 *    - setAllowUniversalAccessFromFileURLs(false)
 *    - setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW)
 * 2. Always loads canonical HTTPS APP_URL (never passes untrusted Intent URLs to loadUrl).
 * 3. Restricts WebView navigation, bundled asset serving, and JS bridge strictly to trusted HTTPS origins.
 */
public class MainActivity extends Activity {

    private static final String APP_URL = "https://safarindiacabs.com/";
    private static final String SUPPORT_WHATSAPP_URL =
            "https://wa.me/919570571516?text=Hi%20SafarIndiaCabs%2C%20I%20want%20to%20book%20a%20cab.";
    private static final String SUPPORT_TEL_URI = "tel:+919570571516";
    private static final int LOCATION_PERMISSION_REQUEST_CODE = 4201;

    private static final String PREFS_NAME = "safar_cabs_app_prefs";
    private static final String KEY_LAST_CACHE_CLEARED_VERSION = "last_cache_cleared_version";
    private static final int CURRENT_APP_VERSION_CODE = 10;

    private static final int COLOR_NAVY_BG = Color.parseColor("#0B0F19");
    private static final int COLOR_NAVY_CARD = Color.parseColor("#131C2E");
    private static final int COLOR_AMBER = Color.parseColor("#F59E0B");
    private static final int COLOR_EMERALD = Color.parseColor("#10B981");
    private static final int COLOR_TEXT_MUTED = Color.parseColor("#CBD5E1");

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

    private static final Set<String> BUNDLED_ROOT_ASSETS = new HashSet<>(Arrays.asList(
            "/icon-192.png",
            "/icon-512.png",
            "/icon-512-maskable.png",
            "/apple-touch-icon.png",
            "/favicon.svg",
            "/logo.png"
    ));

    private FrameLayout rootContainer;
    private WebView webView;
    private ProgressBar topProgressBar;
    private LinearLayout loadingOverlay;
    private LinearLayout offlineOverlay;
    private UpiPaymentHelper upiPaymentHelper;
    private String pendingGeoOrigin;
    private GeolocationPermissions.Callback pendingGeoCallback;
    private boolean hasMainFrameError = false;
    private boolean initialLoadComplete = false;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        configureSystemBars();

        upiPaymentHelper = new UpiPaymentHelper(this);

        rootContainer = new FrameLayout(this);
        rootContainer.setBackgroundColor(COLOR_NAVY_BG);
        rootContainer.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        // Handle Android 15/16 (targetSdk 36) edge-to-edge system bars & software keyboard cleanly
        rootContainer.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override
            public WindowInsets onApplyWindowInsets(View v, WindowInsets insets) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Insets bars = insets.getInsets(
                            WindowInsets.Type.systemBars() | WindowInsets.Type.ime()
                    );
                    v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                } else {
                    v.setPadding(
                            insets.getSystemWindowInsetLeft(),
                            insets.getSystemWindowInsetTop(),
                            insets.getSystemWindowInsetRight(),
                            insets.getSystemWindowInsetBottom()
                    );
                }
                return insets;
            }
        });

        webView = new WebView(this);
        webView.setBackgroundColor(COLOR_NAVY_BG);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        rootContainer.addView(webView);

        topProgressBar = buildTopProgressBar();
        rootContainer.addView(topProgressBar);

        loadingOverlay = buildNativeLoadingOverlay();
        rootContainer.addView(loadingOverlay);

        offlineOverlay = buildNativeOfflineOverlay();
        offlineOverlay.setVisibility(View.GONE);
        rootContainer.addView(offlineOverlay);

        setContentView(rootContainer);

        configureSecureWebSettings(webView.getSettings());
        clearStaleCacheOncePerUpgrade();

        webView.addJavascriptInterface(upiPaymentHelper, "SafarUpiBridge");

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(
                    String url,
                    String userAgent,
                    String contentDisposition,
                    String mimetype,
                    long contentLength
            ) {
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
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse localAsset = tryServeBundledWebAsset(request);
                if (localAsset != null) {
                    return localAsset;
                }
                return super.shouldInterceptRequest(view, request);
            }

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

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                hasMainFrameError = false;
                if (topProgressBar != null) {
                    topProgressBar.setVisibility(View.VISIBLE);
                    topProgressBar.setProgress(15);
                }
                if (offlineOverlay != null) {
                    offlineOverlay.setVisibility(View.GONE);
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (topProgressBar != null) {
                    topProgressBar.setVisibility(View.GONE);
                }
                if (!hasMainFrameError) {
                    initialLoadComplete = true;
                    hideLoadingOverlay();
                    if (offlineOverlay != null) {
                        offlineOverlay.setVisibility(View.GONE);
                    }
                    if (webView != null) {
                        webView.setVisibility(View.VISIBLE);
                    }
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request != null && request.isForMainFrame()) {
                    showOfflineFallback();
                }
            }

            @Override
            @SuppressWarnings("deprecation")
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                super.onReceivedError(view, errorCode, description, failingUrl);
                if (failingUrl != null && isTrustedAppUrl(failingUrl)) {
                    showOfflineFallback();
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                super.onProgressChanged(view, newProgress);
                if (topProgressBar != null) {
                    topProgressBar.setProgress(Math.max(10, newProgress));
                    if (newProgress >= 95) {
                        topProgressBar.setVisibility(View.GONE);
                    }
                }
                if (newProgress >= 85 && !hasMainFrameError) {
                    initialLoadComplete = true;
                    hideLoadingOverlay();
                }
            }

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

    /**
     * Serves matching static production assets (/assets/* and app icons) at 0ms from APK assets
     * strictly for trusted safarindiacabs.com HTTPS GET requests. Falls back to live HTTPS automatically
     * whenever a newer deployed bundle hash is requested.
     */
    private WebResourceResponse tryServeBundledWebAsset(WebResourceRequest request) {
        if (request == null || request.getUrl() == null) {
            return null;
        }
        String method = request.getMethod();
        if (method != null && !"GET".equalsIgnoreCase(method)) {
            return null;
        }
        Uri uri = request.getUrl();
        if (!isTrustedAppUrl(uri.toString())) {
            return null;
        }
        String path = uri.getPath();
        if (path == null || path.isEmpty() || path.contains("..") || path.contains("\\") || path.indexOf('\0') >= 0) {
            return null;
        }
        boolean isAllowedStatic = path.startsWith("/assets/") || BUNDLED_ROOT_ASSETS.contains(path);
        if (!isAllowedStatic) {
            return null;
        }
        String assetPath = "webapp" + path;
        try {
            InputStream stream = getAssets().open(assetPath);
            String mimeType = guessMimeType(path);
            Map<String, String> headers = new HashMap<>();
            headers.put("Access-Control-Allow-Origin", "*");
            headers.put("Cache-Control", "public, max-age=31536000");
            return new WebResourceResponse(mimeType, "UTF-8", 200, "OK", headers, stream);
        } catch (IOException ignored) {
            return null;
        }
    }

    private static String guessMimeType(String path) {
        String lower = path.toLowerCase(Locale.US);
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".json")) return "application/json";
        if (lower.endsWith(".woff2")) return "font/woff2";
        return "application/octet-stream";
    }

    private void configureSystemBars() {
        Window window = getWindow();
        if (window != null) {
            window.setStatusBarColor(COLOR_NAVY_BG);
            window.setNavigationBarColor(Color.parseColor("#070A12"));
        }
    }

    /**
     * Clears stale WebView HTTP/CSS cache once after each Play Store version upgrade
     * so returning users always receive fresh stylesheets and UI assets.
     */
    private void clearStaleCacheOncePerUpgrade() {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            int lastClearedVersion = prefs.getInt(KEY_LAST_CACHE_CLEARED_VERSION, 0);
            if (lastClearedVersion < CURRENT_APP_VERSION_CODE) {
                webView.clearCache(true);
                prefs.edit().putInt(KEY_LAST_CACHE_CLEARED_VERSION, CURRENT_APP_VERSION_CODE).apply();
            }
        } catch (Exception ignored) {
        }
    }

    private ProgressBar buildTopProgressBar() {
        ProgressBar bar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        bar.setMax(100);
        bar.setProgress(15);

        ColorDrawable bgDrawable = new ColorDrawable(Color.TRANSPARENT);
        ClipDrawable progressDrawable = new ClipDrawable(
                new ColorDrawable(COLOR_AMBER),
                Gravity.START,
                ClipDrawable.HORIZONTAL
        );
        LayerDrawable layers = new LayerDrawable(new android.graphics.drawable.Drawable[]{bgDrawable, progressDrawable});
        layers.setId(0, android.R.id.background);
        layers.setId(1, android.R.id.progress);
        bar.setProgressDrawable(layers);

        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(3),
                Gravity.TOP
        );
        bar.setLayoutParams(params);
        return bar;
    }

    private LinearLayout buildNativeLoadingOverlay() {
        LinearLayout overlay = new LinearLayout(this);
        overlay.setOrientation(LinearLayout.VERTICAL);
        overlay.setGravity(Gravity.CENTER);
        overlay.setBackgroundColor(COLOR_NAVY_BG);
        overlay.setPadding(dp(24), dp(28), dp(24), dp(28));
        overlay.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        ImageView crestView = new ImageView(this);
        crestView.setImageResource(R.drawable.safar_app_crest);
        crestView.setScaleType(ImageView.ScaleType.FIT_CENTER);
        LinearLayout.LayoutParams crestParams = new LinearLayout.LayoutParams(dp(76), dp(76));
        crestParams.bottomMargin = dp(14);
        crestView.setLayoutParams(crestParams);
        overlay.addView(crestView);

        TextView title = new TextView(this);
        title.setText("SAFAR INDIA CABS");
        title.setTextColor(Color.WHITE);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 22);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setGravity(Gravity.CENTER);
        overlay.addView(title);

        TextView subtitle = new TextView(this);
        subtitle.setText("Outstation · Local Rental · Airport Cabs");
        subtitle.setTextColor(COLOR_AMBER);
        subtitle.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        subtitle.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams subParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        subParams.topMargin = dp(6);
        subParams.bottomMargin = dp(20);
        subtitle.setLayoutParams(subParams);
        overlay.addView(subtitle);

        ImageView posterView = new ImageView(this);
        posterView.setImageResource(R.drawable.safar_hero_poster);
        posterView.setScaleType(ImageView.ScaleType.CENTER_CROP);
        GradientDrawable posterBorder = new GradientDrawable();
        posterBorder.setColor(COLOR_NAVY_CARD);
        posterBorder.setCornerRadius(dp(18));
        posterBorder.setStroke(dp(1), COLOR_AMBER);
        posterView.setBackground(posterBorder);
        posterView.setPadding(dp(2), dp(2), dp(2), dp(2));
        LinearLayout.LayoutParams posterParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(190)
        );
        posterParams.bottomMargin = dp(22);
        posterView.setLayoutParams(posterParams);
        overlay.addView(posterView);

        ProgressBar spinner = new ProgressBar(this);
        spinner.setIndeterminate(true);
        overlay.addView(spinner);

        TextView helpline = new TextView(this);
        helpline.setText("24×7 Helpline: +91 9570571516");
        helpline.setTextColor(COLOR_TEXT_MUTED);
        helpline.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        helpline.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams helpParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        helpParams.topMargin = dp(16);
        helpline.setLayoutParams(helpParams);
        overlay.addView(helpline);

        return overlay;
    }

    private LinearLayout buildNativeOfflineOverlay() {
        LinearLayout overlay = new LinearLayout(this);
        overlay.setOrientation(LinearLayout.VERTICAL);
        overlay.setGravity(Gravity.CENTER);
        overlay.setBackgroundColor(COLOR_NAVY_BG);
        overlay.setPadding(dp(24), dp(24), dp(24), dp(24));
        overlay.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER_HORIZONTAL);
        card.setPadding(dp(24), dp(26), dp(24), dp(26));
        GradientDrawable cardBg = new GradientDrawable();
        cardBg.setColor(COLOR_NAVY_CARD);
        cardBg.setCornerRadius(dp(20));
        cardBg.setStroke(dp(1), Color.parseColor("#24324B"));
        card.setBackground(cardBg);
        card.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        ));

        ImageView logoView = new ImageView(this);
        logoView.setImageResource(R.drawable.safar_app_crest);
        logoView.setScaleType(ImageView.ScaleType.FIT_CENTER);
        LinearLayout.LayoutParams logoParams = new LinearLayout.LayoutParams(dp(56), dp(56));
        logoParams.bottomMargin = dp(12);
        logoView.setLayoutParams(logoParams);
        card.addView(logoView);

        TextView heading = new TextView(this);
        heading.setText("Unable to Connect");
        heading.setTextColor(Color.WHITE);
        heading.setTextSize(TypedValue.COMPLEX_UNIT_SP, 20);
        heading.setTypeface(Typeface.DEFAULT_BOLD);
        heading.setGravity(Gravity.CENTER);
        card.addView(heading);

        TextView desc = new TextView(this);
        desc.setText("Please check your internet connection and retry, or book directly with our 24×7 dispatch desk.");
        desc.setTextColor(COLOR_TEXT_MUTED);
        desc.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        desc.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams descParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        descParams.topMargin = dp(10);
        descParams.bottomMargin = dp(22);
        desc.setLayoutParams(descParams);
        card.addView(desc);

        Button retryBtn = createStyledButton("Retry Connection", COLOR_AMBER, COLOR_NAVY_BG);
        retryBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                hasMainFrameError = false;
                offlineOverlay.setVisibility(View.GONE);
                if (!initialLoadComplete && loadingOverlay != null) {
                    loadingOverlay.setVisibility(View.VISIBLE);
                }
                webView.setVisibility(View.VISIBLE);
                webView.loadUrl(APP_URL);
            }
        });
        card.addView(retryBtn);

        Button whatsappBtn = createStyledButton("Quick WhatsApp Booking", COLOR_EMERALD, Color.WHITE);
        LinearLayout.LayoutParams waParams = (LinearLayout.LayoutParams) whatsappBtn.getLayoutParams();
        waParams.topMargin = dp(12);
        whatsappBtn.setLayoutParams(waParams);
        whatsappBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                handleExternalOrUpiUrl(SUPPORT_WHATSAPP_URL);
            }
        });
        card.addView(whatsappBtn);

        Button callBtn = createStyledButton("Call 24×7 Helpline (+91 9570571516)", Color.parseColor("#1E293B"), Color.WHITE);
        LinearLayout.LayoutParams callParams = (LinearLayout.LayoutParams) callBtn.getLayoutParams();
        callParams.topMargin = dp(12);
        callBtn.setLayoutParams(callParams);
        callBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                handleExternalOrUpiUrl(SUPPORT_TEL_URI);
            }
        });
        card.addView(callBtn);

        overlay.addView(card);
        return overlay;
    }

    private Button createStyledButton(String label, int bgColor, int textColor) {
        Button btn = new Button(this);
        btn.setText(label);
        btn.setAllCaps(false);
        btn.setTextColor(textColor);
        btn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        btn.setTypeface(Typeface.DEFAULT_BOLD);
        btn.setMinHeight(dp(48));
        btn.setPadding(dp(18), dp(12), dp(18), dp(12));

        GradientDrawable bg = new GradientDrawable();
        bg.setColor(bgColor);
        bg.setCornerRadius(dp(14));
        btn.setBackground(bg);

        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        btn.setLayoutParams(params);
        return btn;
    }

    private void hideLoadingOverlay() {
        if (loadingOverlay != null && loadingOverlay.getVisibility() == View.VISIBLE) {
            loadingOverlay.animate()
                    .alpha(0f)
                    .setDuration(220)
                    .withEndAction(new Runnable() {
                        @Override
                        public void run() {
                            if (loadingOverlay != null) {
                                loadingOverlay.setVisibility(View.GONE);
                                loadingOverlay.setAlpha(1f);
                            }
                        }
                    })
                    .start();
        }
    }

    private void showOfflineFallback() {
        hasMainFrameError = true;
        if (topProgressBar != null) {
            topProgressBar.setVisibility(View.GONE);
        }
        if (loadingOverlay != null) {
            loadingOverlay.setVisibility(View.GONE);
        }
        if (webView != null) {
            webView.setVisibility(View.INVISIBLE);
        }
        if (offlineOverlay != null) {
            offlineOverlay.setVisibility(View.VISIBLE);
        }
    }

    private int dp(int value) {
        return Math.round(TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                value,
                getResources().getDisplayMetrics()
        ));
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureSecureWebSettings(WebSettings settings) {
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setLoadsImagesAutomatically(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setLayoutAlgorithm(WebSettings.LayoutAlgorithm.TEXT_AUTOSIZING);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(false);

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
