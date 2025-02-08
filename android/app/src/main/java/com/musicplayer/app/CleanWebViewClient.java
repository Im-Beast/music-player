package com.musicplayer.app;

import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;

/**
 * WebView Client which strips request of the HTTP Client Hint headers
 * Which are used (mostly) by Google to identify the users platform and its features
 *
 * @see <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Client_hints" />
 */
public class CleanWebViewClient extends BridgeWebViewClient {
    public CleanWebViewClient(Bridge bridge) {
        super(bridge);
    }

    private void stripClientHintsHeaders(WebResourceRequest request) {
        var headers = request.getRequestHeaders();
        var iterator = headers.entrySet().iterator();
        while (iterator.hasNext()) {
            String key = iterator.next().getKey();
            if (
                    key.equalsIgnoreCase("Referer") ||
                            key.equalsIgnoreCase("Origin") ||
                            key.equalsIgnoreCase("Sec-CH-UA")
                            || key.equalsIgnoreCase("Sec-CH-UA-Mobile")
                            || key.equalsIgnoreCase("Sec-CH-UA-Platform")
            ) {
                iterator.remove();
            }
        }
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        stripClientHintsHeaders(request);
        return super.shouldOverrideUrlLoading(view, request);
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        stripClientHintsHeaders(request);
        return super.shouldInterceptRequest(view, request);
    }
}
