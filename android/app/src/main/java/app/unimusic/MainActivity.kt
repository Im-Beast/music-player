package app.unimusic

import android.os.Bundle
import app.unimusic.sync.UniMusicSync
import com.getcapacitor.BridgeActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class MainActivity : BridgeActivity() {
    private val appScope = CoroutineScope(SupervisorJob())
    lateinit var uniMusicSync: UniMusicSync
        private set

    override fun onCreate(savedInstanceState: Bundle?) {
        appScope.launch {
            val sync = UniMusicSync.create(applicationContext.cacheDir.path);
            val author = sync.irohManager.getAuthor();
            uniMusicSync = sync
            println("IROH Author: $author")
        }

        registerPlugin(MusicKitAuthorizationPlugin::class.java)
        registerPlugin(LocalMusicPlugin::class.java)

        super.onCreate(savedInstanceState)
    }

    override fun onDestroy() {
        if (::uniMusicSync.isInitialized) {
            uniMusicSync.irohManager.destroy()
        }
        super.onDestroy()
    }

    override fun onStart() {
        if (::uniMusicSync.isInitialized) appScope.launch {
            val author = uniMusicSync?.irohManager?.getAuthor();
            println("IROH Author: $author")
        }

        val bridge = super.getBridge()
        val webView = bridge.webView
        webView.webViewClient = CleanWebViewClient(bridge)
        super.onStart()
    }
}
