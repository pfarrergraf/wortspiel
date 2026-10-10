package io.github.pfarrergraf.ludeverbis;

import android.app.Activity;
import android.content.Intent;
import android.util.Base64;
import android.view.WindowManager;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;

/** Explicit user-selected documents only. No storage permission or arbitrary paths. */
@CapacitorPlugin(name = "LudeverbisDocuments")
public class DocumentsPlugin extends Plugin {
    private static final int MAX_BYTES = DocumentPolicy.MAX_BYTES;
    private boolean documentBusy;
    private boolean keepAwake;

    private synchronized boolean begin(PluginCall call) {
        if (documentBusy) { call.reject("Eine Dateiauswahl ist bereits geöffnet."); return false; }
        documentBusy = true;
        return true;
    }
    private synchronized void end() { documentBusy = false; }

    @PluginMethod
    public void save(PluginCall call) {
        String text = call.getString("text");
        String mime = call.getString("mime", "application/json");
        String name = call.getString("name", "ludeverbis-speicher.json");
        boolean image = "image/png".equals(mime);
        if (text == null || text.length() > MAX_BYTES * 2 ||
            !DocumentPolicy.validMime(mime) || !DocumentPolicy.validName(name)) {
            call.reject("Ungültige Sicherungsdatei."); return;
        }
        boolean started = false;
        try {
            byte[] bytes = image ? Base64.decode(text, Base64.DEFAULT) : text.getBytes(StandardCharsets.UTF_8);
            if (!DocumentPolicy.validSize(bytes.length)) { call.reject("Die Datei ist zu groß (maximal 5 MB)."); return; }
            if (!begin(call)) return;
            started = true;
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType(mime);
            intent.putExtra(Intent.EXTRA_TITLE, name);
            startActivityForResult(call, intent, "saved");
        } catch (Exception error) { if (started) end(); call.reject("Dateiauswahl konnte nicht geöffnet werden."); }
    }

    @ActivityCallback
    private void saved(PluginCall call, ActivityResult result) {
        end();
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            call.resolve(new JSObject().put("cancelled", true)); return;
        }
        try (OutputStream stream = getContext().getContentResolver().openOutputStream(result.getData().getData(), "wt")) {
            if (stream == null) throw new java.io.IOException();
            String text = call.getString("text", "");
            byte[] bytes = "image/png".equals(call.getString("mime")) ?
                Base64.decode(text, Base64.DEFAULT) : text.getBytes(StandardCharsets.UTF_8);
            stream.write(bytes);
            stream.flush();
            call.resolve(new JSObject().put("cancelled", false));
        } catch (Exception error) { call.reject("Datei konnte nicht gespeichert werden. Der Kartenspeicher bleibt erhalten."); }
    }

    @PluginMethod
    public void open(PluginCall call) {
        if (!begin(call)) return;
        try {
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("*/*");
            intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/json", "text/plain", "application/octet-stream"});
            startActivityForResult(call, intent, "opened");
        } catch (Exception error) { end(); call.reject("Dateiauswahl konnte nicht geöffnet werden."); }
    }

    @ActivityCallback
    private void opened(PluginCall call, ActivityResult result) {
        end();
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            call.resolve(new JSObject().put("cancelled", true)); return;
        }
        try (InputStream stream = getContext().getContentResolver().openInputStream(result.getData().getData());
             ByteArrayOutputStream data = new ByteArrayOutputStream()) {
            if (stream == null) throw new java.io.IOException();
            byte[] buffer = new byte[8192];
            int count;
            while ((count = stream.read(buffer)) != -1) {
                if (data.size() + count > MAX_BYTES) { call.reject("Die Sicherung ist zu groß (maximal 5 MB)."); return; }
                data.write(buffer, 0, count);
            }
            String text = StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(data.toByteArray())).toString();
            call.resolve(new JSObject().put("text", text));
        } catch (Exception error) { call.reject("Sicherung konnte nicht gelesen werden. Der Kartenspeicher bleibt erhalten."); }
    }

    @PluginMethod
    public void keepAwake(PluginCall call) {
        keepAwake = call.getBoolean("enabled", false);
        getActivity().runOnUiThread(() -> {
            if (keepAwake) getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            call.resolve();
        });
    }
    @Override protected void handleOnStop() {
        getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }
    @Override protected void handleOnResume() {
        if (keepAwake) getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }
}
