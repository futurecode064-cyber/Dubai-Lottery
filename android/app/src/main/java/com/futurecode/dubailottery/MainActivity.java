package com.futurecode.dubailottery;

import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.webkit.CookieManager;
import android.webkit.JsResult;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView web;
    private boolean errorVisible = false;
    private final String serverUrl = BuildConfig.SERVER_URL;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout frame = new LinearLayout(this);
        frame.setOrientation(LinearLayout.VERTICAL);
        frame.setBackgroundColor(Color.rgb(8,14,32));
        frame.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        web = new WebView(this);
        frame.addView(web, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,
            0, 1.0f));
        setContentView(frame);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);

        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onJsConfirm(WebView v, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setTitle("Dubai Lottery")
                    .setMessage(message).setPositiveButton("အတည်ပြု", (d,w) -> result.confirm())
                    .setNegativeButton("မလုပ်တော့ပါ", (d,w) -> result.cancel())
                    .setOnCancelListener(d -> result.cancel()).show();
                return true;
            }
        });

        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                Uri target = req.getUrl();
                Uri expected = Uri.parse(serverUrl);
                String path = target.getPath();
                boolean sameOrigin = "https".equals(target.getScheme())
                    && expected.getHost().equals(target.getHost())
                    && target.getPort() == expected.getPort();
                boolean adminPath = path != null && (path.equals("/admin") || path.startsWith("/admin/"));
                return !sameOrigin || adminPath;
            }

            @Override public void onReceivedError(WebView v, WebResourceRequest req, WebResourceError err) {
                if (!req.isForMainFrame() || errorVisible) return;
                errorVisible = true;
                new AlertDialog.Builder(MainActivity.this).setTitle("ချိတ်ဆက်မရပါ")
                    .setMessage("အင်တာနက်ချိတ်ဆက်မှုကို စစ်ပြီး ပြန်စမ်းပါ။")
                    .setPositiveButton("ပြန်စမ်းမယ်", (d,w) -> {
                        errorVisible = false;
                        web.loadUrl(serverUrl);
                    })
                    .setOnCancelListener(d -> errorVisible = false).show();
            }
        });

        web.loadUrl(serverUrl);
    }

    @Override public void onBackPressed() {
        if (web.canGoBack()) web.goBack(); else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if (web != null) {
            web.stopLoading();
            web.destroy();
        }
        super.onDestroy();
    }
}
