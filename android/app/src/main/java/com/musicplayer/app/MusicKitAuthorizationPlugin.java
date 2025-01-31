package com.musicplayer.app;

import androidx.activity.result.ActivityResult;

import com.apple.android.sdk.authentication.AuthenticationFactory;
import com.apple.android.sdk.authentication.AuthenticationManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MusicKitAuthorization")
public class MusicKitAuthorizationPlugin extends Plugin {
    private AuthenticationManager authManager;

    @Override
    public void load() {
        // This has to be initialized here instead of in field declaration
        // because otherwise Capacitor doesn't load the plugin correctly
        authManager = AuthenticationFactory.createAuthenticationManager(
                getContext()
        );
        super.load();
    }

    private String getDeveloperToken() {
        return getContext().getString(R.string.developer_token);
    }

    @PluginMethod()
    public void authorize(PluginCall call) {
        var intent = authManager.createIntentBuilder(getDeveloperToken())
                .setHideStartScreen(true)
                .build();

        startActivityForResult(call, intent, "finishAuthorization");
    }

    @ActivityCallback()
    private void finishAuthorization(PluginCall call, ActivityResult resultIntent) {
        if (resultIntent == null) {
            call.reject("MusicKit authorization failed");
            return;
        }

        var result = authManager.handleTokenResult(resultIntent.getData());
        if (result.isError()) {
            call.reject("MusicKit authorization failed:" + result.getError());
            return;
        }

        JSObject tokens = new JSObject();
        tokens.put("developerToken", getDeveloperToken());
        tokens.put("musicUserToken", result.getMusicUserToken());
        call.resolve(tokens);
    }
}
