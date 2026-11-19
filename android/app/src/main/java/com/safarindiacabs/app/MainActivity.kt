package com.safarindiacabs.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Message
import android.view.ViewGroup
import android.view.WindowInsets
import android.webkit.CookieManager
import android.webkit.GeolocationPermissions
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import java.util.Locale

/**
 * Kotlin reference implementation of MainActivity (v1.1.0 / versionCode 10),
 * synced with MainActivity.java:
 * - Android 15/16 edge-to-edge WindowInsets padding
 * - One-time cache clear per app version upgrade
 * - Hardened against Cross-App Scripting (Google Play compliant)
 */
class MainActivityKt : Activity() {

    companion object {
        private const val APP_URL = "https://safarindiacabs.com/"
        private const val LOCATION_PERMISSION_REQUEST_CODE = 4201
        private const val PREFS_NAME = "safar_cabs_app_prefs"
        private const val KEY_LAST_CACHE_CLEARED_VERSION = "last_cache_cleared_version"
        private const val CURRENT_APP_VERSION_CODE = 10

        private val TRUSTED_HOSTS = setOf(
            "safarindiacabs.com",
            "www.safarindiacabs.com"
        )

        private val ALLOWED_CHECKOUT_HOSTS = setOf(
            "safarindiacabs.com",
            "www.safarindiacabs.com",
            "api.razorpay.com",
            "checkout.razorpay.com"
        )

        @JvmStatic
        fun isTrustedAppUrl(url: String?): Boolean {
            if (url.isNullOrBlank()) return false
            return try {
                val uri = Uri.parse(url.trim())
                val scheme = uri.scheme?.lowercase(Locale.US) ?: return false
                val host = uri.host?.lowercase(Locale.US) ?: return false
                scheme == "https" && TRUSTED_HOSTS.contains(host)
            } catch (_: Exception) {
                false
            }
        }
    }

    private lateinit var webView: WebView
    private lateinit var upiPaymentHelper: UpiPaymentHelper
    private var pendingGeoOrigin: String? = null
    private var pendingGeoCallback: GeolocationPermissions.Callback? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window?.statusBarColor = Color.parseColor("#0B0F19")
        window?.navigationBarColor = Color.parseColor("#070A12")

        upiPaymentHelper = UpiPaymentHelper(this)

        val root = FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#0B0F19"))
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setOnApplyWindowInsetsListener { v, insets ->
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    val bars = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.ime())
                    v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
                } else {
                    @Suppress("DEPRECATION")
                    v.setPadding(
                        insets.systemWindowInsetLeft,
                        insets.systemWindowInsetTop,
                        insets.systemWindowInsetRight,
                        insets.systemWindowInsetBottom
                    )
                }
                insets
            }
        }

        webView = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#0B0F19"))
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }
        root.addView(webView)
        setContentView(root)

        configureSecureWebSettings(webView.settings)
        clearStaleCacheOncePerUpgrade()
        webView.addJavascriptInterface(upiPaymentHelper, "SafarUpiBridge")

        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(webView, true)

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val targetUri = request?.url ?: return true
                return handleWebViewNavigation(targetUri)
            }

            @Deprecated("Deprecated in Java")
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                if (url.isNullOrBlank()) return true
                return handleWebViewNavigation(Uri.parse(url))
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: GeolocationPermissions.Callback?
            ) {
                if (callback == null) return
                if (!isTrustedAppUrl(origin)) {
                    callback.invoke(origin, false, false)
                    return
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    val hasFine = checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                    val hasCoarse = checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
                    if (hasFine || hasCoarse) {
                        callback.invoke(origin, true, false)
                    } else {
                        pendingGeoOrigin = origin
                        pendingGeoCallback = callback
                        requestPermissions(
                            arrayOf(
                                Manifest.permission.ACCESS_FINE_LOCATION,
                                Manifest.permission.ACCESS_COARSE_LOCATION
                            ),
                            LOCATION_PERMISSION_REQUEST_CODE
                        )
                    }
                } else {
                    callback.invoke(origin, true, false)
                }
            }

            override fun onCreateWindow(
                view: WebView?,
                isDialog: Boolean,
                isUserGesture: Boolean,
                resultMsg: Message?
            ): Boolean {
                val msg = resultMsg ?: return false
                val tempWebView = WebView(this@MainActivityKt)
                tempWebView.settings.apply {
                    allowFileAccess = false
                    allowContentAccess = false
                    allowFileAccessFromFileURLs = false
                    allowUniversalAccessFromFileURLs = false
                    javaScriptEnabled = false
                }
                tempWebView.webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(popupView: WebView?, request: WebResourceRequest?): Boolean {
                        request?.url?.toString()?.let { handleExternalOrUpiUrl(it) }
                        popupView?.destroy()
                        return true
                    }
                }
                val transport = msg.obj as? WebView.WebViewTransport ?: return false
                transport.webView = tempWebView
                msg.sendToTarget()
                return true
            }
        }

        // Load only the canonical verified HTTPS URL; never load untrusted Intent URLs
        webView.loadUrl(APP_URL)
    }

    private fun clearStaleCacheOncePerUpgrade() {
        try {
            val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            if (prefs.getInt(KEY_LAST_CACHE_CLEARED_VERSION, 0) < CURRENT_APP_VERSION_CODE) {
                webView.clearCache(true)
                prefs.edit().putInt(KEY_LAST_CACHE_CLEARED_VERSION, CURRENT_APP_VERSION_CODE).apply()
            }
        } catch (_: Exception) {
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureSecureWebSettings(settings: WebSettings) {
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.setGeolocationEnabled(true)
        settings.loadsImagesAutomatically = true
        settings.loadWithOverviewMode = true
        settings.useWideViewPort = true
        settings.layoutAlgorithm = WebSettings.LayoutAlgorithm.TEXT_AUTOSIZING
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.setSupportZoom(false)
        settings.builtInZoomControls = false
        settings.displayZoomControls = false

        // Disable all file & content access to prevent Cross-App Scripting
        settings.allowFileAccess = false
        settings.allowContentAccess = false
        settings.allowFileAccessFromFileURLs = false
        settings.allowUniversalAccessFromFileURLs = false
        settings.javaScriptCanOpenWindowsAutomatically = false
        settings.setSupportMultipleWindows(false)
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.safeBrowsingEnabled = true
        }
    }

    private fun handleWebViewNavigation(uri: Uri): Boolean {
        val url = uri.toString()
        if (handleExternalOrUpiUrl(url)) {
            return true
        }
        val scheme = uri.scheme?.lowercase(Locale.US)
        val host = uri.host?.lowercase(Locale.US)
        if (scheme == "https" && host != null) {
            if (ALLOWED_CHECKOUT_HOSTS.contains(host) || host.endsWith(".razorpay.com")) {
                return false
            }
            try {
                val browserIntent = Intent(Intent.ACTION_VIEW, uri).apply {
                    addCategory(Intent.CATEGORY_BROWSABLE)
                    component = null
                    selector = null
                }
                startActivity(browserIntent)
            } catch (_: Exception) {
            }
            return true
        }
        return true
    }

    private fun handleExternalOrUpiUrl(url: String): Boolean {
        if (url.isBlank()) return false
        if (upiPaymentHelper.handleWebViewUrl(url)) return true
        val lower = url.lowercase(Locale.US)
        if (lower.startsWith("https://wa.me/") ||
            lower.startsWith("https://api.whatsapp.com/") ||
            lower.startsWith("https://chat.whatsapp.com/")
        ) {
            return try {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                    addCategory(Intent.CATEGORY_BROWSABLE)
                    component = null
                    selector = null
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                startActivity(intent)
                true
            } catch (_: Exception) {
                false
            }
        }
        return false
    }
}
