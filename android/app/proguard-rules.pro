# Preserve JavascriptInterface methods for WebView bridge
-keepclassmembers class com.safarindiacabs.app.UpiPaymentHelper {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes *Annotation*,JavascriptInterface
