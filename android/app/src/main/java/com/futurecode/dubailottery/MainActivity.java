package com.futurecode.dubailottery;

import android.app.Activity;
import android.app.AlertDialog;
import android.os.Bundle;
import android.net.Uri;
import android.graphics.Color;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.text.InputType;
import android.webkit.CookieManager;
import android.webkit.JsResult;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceError;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;

public class MainActivity extends Activity {
    private WebView web;
    private boolean errorVisible = false;
    private String serverUrl;

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
        Button settings = new Button(this);
        settings.setText("Dubai Lottery · Server ပြောင်းရန်");
        settings.setTextColor(Color.rgb(255,209,122));
        settings.setBackgroundColor(Color.rgb(19,29,53));
        settings.setOnClickListener(v -> chooseServer());
        frame.addView(settings, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT));
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
                if (serverUrl == null) return true;
                Uri expected = Uri.parse(serverUrl);
                return !"https".equals(target.getScheme()) || !expected.getHost().equals(target.getHost())
                    || target.getPort() != expected.getPort();
            }
            @Override public void onReceivedError(WebView v, WebResourceRequest req, WebResourceError err) {
                if (!req.isForMainFrame() || errorVisible) return;
                errorVisible = true;
                new AlertDialog.Builder(MainActivity.this).setTitle("ချိတ်ဆက်မရပါ")
                    .setMessage("အင်တာနက်နှင့် server လိပ်စာကို စစ်ဆေးပြီး ပြန်စမ်းပါ။")
                    .setPositiveButton("ပြန်စမ်းမယ်", (d,w) -> { errorVisible=false; web.loadUrl(serverUrl); })
                    .setNegativeButton("Server ပြောင်းမယ်", (d,w) -> { errorVisible=false; chooseServer(); })
                    .setOnCancelListener(d -> errorVisible=false).show();
            }
        });
        serverUrl = getPreferences(MODE_PRIVATE).getString("server_url", BuildConfig.SERVER_URL);
        if (validServer(serverUrl)) web.loadUrl(serverUrl); else showWelcome();
    }

    private boolean validServer(String value) {
        if (value == null) return false;
        Uri uri = Uri.parse(value);
        String host = uri.getHost();
        return "https".equals(uri.getScheme()) && host != null
            && host.matches("[A-Za-z0-9.-]+") && !host.endsWith(".invalid")
            && uri.getUserInfo() == null && uri.getQuery() == null && uri.getFragment() == null
            && (uri.getPath() == null || uri.getPath().isEmpty() || "/".equals(uri.getPath()))
            && (uri.getPort() == -1 || (uri.getPort() > 0 && uri.getPort() <= 65535));
    }

    private void showWelcome() {
        String html = "<html><meta name='viewport' content='width=device-width,initial-scale=1'>"
            + "<body style='background:#080e20;color:#eef3ff;font-family:sans-serif;padding:25px;line-height:1.8'>"
            + "<h1 style='color:#ffd17a'>Dubai Lottery</h1><h2>2D · 3D · 4D</h2>"
            + "<p>စမ်းသပ် APK ကို install လုပ်ပြီးပါပြီ။</p>"
            + "<p>အကောင့်ဝင်ရန်နှင့် ကံစမ်းရန် server ချိတ်ဆက်ဖို့ လိုသေးသည်။ အပေါ်က Server ပြောင်းရန် ခလုတ်ကို နှိပ်ပါ။</p>"
            + "<p style='color:#a5b2cb'>ဤဗားရှင်းကို အမှန်တကယ်ငွေသွင်း/ငွေထုတ်လုပ်ရန် မသုံးပါနှင့်။</p></body></html>";
        web.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
    }

    private void chooseServer() {
        EditText input = new EditText(this);
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        input.setSingleLine(true);
        input.setHint("https://your-server.example/");
        if (validServer(serverUrl)) input.setText(serverUrl);
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        int pad = (int)(20 * getResources().getDisplayMetrics().density);
        box.setPadding(pad,pad,pad,pad);
        TextView label = new TextView(this);
        label.setText("သင့် Dubai Lottery server ၏ HTTPS လိပ်စာကို ထည့်ပါ။");
        box.addView(label);
        box.addView(input);
        AlertDialog dialog = new AlertDialog.Builder(this).setTitle("Server ချိတ်ဆက်မယ်")
            .setView(box).setPositiveButton("ချိတ်မယ်", null)
            .setNegativeButton("မလုပ်တော့ပါ", (d,w) -> {}).create();
        dialog.setOnShowListener(d -> dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
            String value = input.getText().toString().trim();
            if (!validServer(value)) {
                input.setError("မှန်ကန်သော HTTPS server လိပ်စာကို ထည့်ပါ။ လိပ်စာတွင် path/query မပါရပါ။");
                return;
            }
            if (!value.endsWith("/")) value += "/";
            final String selected = value;
            web.stopLoading();
            CookieManager.getInstance().removeAllCookies(ok -> {
                CookieManager.getInstance().flush();
                serverUrl = selected;
                getPreferences(MODE_PRIVATE).edit().putString("server_url",serverUrl).apply();
                errorVisible=false;
                web.loadUrl(serverUrl);
            });
            dialog.dismiss();
        }));
        dialog.show();
    }
    @Override public void onBackPressed() {
        if (web.canGoBack()) web.goBack(); else super.onBackPressed();
    }
    @Override protected void onDestroy() {
        if (web != null) { web.stopLoading(); web.destroy(); }
        super.onDestroy();
    }
}
