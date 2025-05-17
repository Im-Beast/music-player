package app.unimusic

import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import com.getcapacitor.Bridge
import com.getcapacitor.BridgeWebViewClient

/**
 * WebView Client which strips request of the HTTP Client Hint headers
 * Which are used (mostly) by Google to identify the users platform and its features
 *
 * See: [Client Hints](https://developer.mozilla.org/en-US/docs/Web/HTTP/Client_hints)
 */
class CleanWebViewClient(bridge: Bridge?) : BridgeWebViewClient(bridge) {
    private fun stripClientHintsHeaders(request: WebResourceRequest) {
        val headers = request.requestHeaders
        val iterator = headers.entries.iterator()

        while (iterator.hasNext()) {
            val key: String = iterator.next()!!.key!!;

            if (
                key.equals("Referer", ignoreCase = true) ||
                key.equals("Origin", ignoreCase = true) ||
                key.equals("Sec-CH-UA", ignoreCase = true) ||
                key.equals("Sec-CH-UA-Mobile", ignoreCase = true) ||
                key.equals("Sec-CH-UA-Platform", ignoreCase = true)
            ) {
                iterator.remove()
            }
        }
    }

    override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest): Boolean {
        stripClientHintsHeaders(request)
        return super.shouldOverrideUrlLoading(view, request)
    }

    override fun shouldInterceptRequest(
        view: WebView?,
        request: WebResourceRequest
    ): WebResourceResponse? {
        stripClientHintsHeaders(request)
        return super.shouldInterceptRequest(view, request)
    }
}
