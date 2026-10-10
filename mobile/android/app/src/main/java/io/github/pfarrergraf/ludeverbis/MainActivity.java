package io.github.pfarrergraf.ludeverbis;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DocumentsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
