package local.pleos.idealab;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.content.Intent;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.IOException;

/** Offline simulation host. No Vehicle SDK, Gleo, JavaScript bridge, or vehicle writes. */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private WebView view;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        view = new WebView(this);
        WebSettings settings = view.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        view.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView web, WebResourceRequest request) {
                if (!HOST.equals(request.getUrl().getHost())) return blocked();
                String path = request.getUrl().getPath();
                if (path == null || path.equals("/")) path = "/index.html";
                if (!(path.equals("/index.html") || path.equals("/styles.css") || path.matches("/src/(app|mobility|camping|troubleshooter|format)\\.js"))) return blocked();
                String mime = path.endsWith(".js") ? "text/javascript" : path.endsWith(".css") ? "text/css" : "text/html";
                try { return new WebResourceResponse(mime, "UTF-8", getAssets().open(path.substring(1))); }
                catch (IOException e) { return blocked(); }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView web, WebResourceRequest request) {
                if (HOST.equals(request.getUrl().getHost())) return false;
                if ("https".equals(request.getUrl().getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, request.getUrl())); }
                    catch (Exception e) { Toast.makeText(MainActivity.this, "외부 설명서를 열 브라우저가 없습니다.", Toast.LENGTH_LONG).show(); }
                }
                return true;
            }
        });
        setContentView(view);
        view.loadUrl("https://" + HOST + "/index.html?idea=" + BuildConfig.IDEA + "&single=1");
    }
    private WebResourceResponse blocked() { return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", null, new ByteArrayInputStream(new byte[0])); }
    @Override protected void onDestroy() { if (view != null) { view.destroy(); view = null; } super.onDestroy(); }
}
