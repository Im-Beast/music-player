package com.musicplayer.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(MusicKitAuthorizationPlugin.class);
        registerPlugin(LocalMusicPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        var bridge = super.getBridge();
        var webview = bridge.getWebView();
        webview.setWebViewClient(new CleanWebViewClient(bridge));
        super.onStart();
    }
}
