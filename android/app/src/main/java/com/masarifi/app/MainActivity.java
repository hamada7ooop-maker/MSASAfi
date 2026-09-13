package com.masarifi.app;

import android.os.Bundle;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Block screenshots and screen recording, and keep the window content
        // out of the task-switcher preview.
        //
        // The web layer only applies a CSS blur on background, which does not
        // prevent a screen capture — this flag is the actual enforcement and
        // is what the project documentation already claimed to provide.
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );
    }
}
