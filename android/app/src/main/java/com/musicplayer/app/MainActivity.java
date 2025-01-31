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
}
