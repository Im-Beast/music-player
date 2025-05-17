package app.unimusic

import androidx.activity.result.ActivityResult
import com.apple.android.sdk.authentication.AuthenticationFactory
import com.apple.android.sdk.authentication.AuthenticationManager
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "MusicKitAuthorization")
class MusicKitAuthorizationPlugin : Plugin() {
    private var authManager: AuthenticationManager? = null

    override fun load() {
        // This has to be initialized here instead of in field declaration
        // because otherwise Capacitor doesn't load the plugin correctly
        authManager = AuthenticationFactory.createAuthenticationManager(context)
        super.load()
    }

    private val developerToken: String
        get() = context.getString(R.string.developer_token)

    @PluginMethod
    fun authorize(call: PluginCall) {
        val intent = authManager!!.createIntentBuilder(developerToken)
            .setHideStartScreen(true)
            .build()

        startActivityForResult(call, intent, "finishAuthorization")
    }

    @ActivityCallback
    private fun finishAuthorization(call: PluginCall, resultIntent: ActivityResult?) {
        if (resultIntent == null) {
            call.reject("MusicKit authorization failed")
            return
        }

        val result = authManager!!.handleTokenResult(resultIntent.data)
        if (result.isError) {
            call.reject("MusicKit authorization failed:" + result.getError())
            return
        }

        val tokens = JSObject()
        tokens.put("developerToken", developerToken)
        tokens.put("musicUserToken", result.musicUserToken)
        call.resolve(tokens)
    }
}
