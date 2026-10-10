package io.github.pfarrergraf.ludeverbis;

import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import android.graphics.Bitmap;
import java.io.File;
import java.io.FileOutputStream;
import static org.junit.Assert.*;

/** Runs in an actual API-36 WebView, with emulator networking disabled in CI. */
@RunWith(AndroidJUnit4.class)
public class OfflineAppTest {
    private ActivityScenario<MainActivity> scenario;

    private String js(String expression) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>();
        scenario.onActivity(activity -> activity.getBridge().getWebView().evaluateJavascript(expression, value -> {
            result.set(value); latch.countDown();
        }));
        assertTrue("WebView JavaScript callback timed out", latch.await(10, TimeUnit.SECONDS));
        return result.get();
    }
    private void until(String expression) throws Exception {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(30);
        while (System.nanoTime() < deadline) {
            if ("true".equals(js("Boolean(" + expression + ")"))) return;
            Thread.sleep(100);
        }
        fail("WebView condition did not become true: " + expression);
    }
    private void screenshot(String name) throws Exception {
        File directory = new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null), "screenshots");
        assertTrue(directory.exists() || directory.mkdirs());
        Bitmap image = InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
        assertNotNull(image);
        try (FileOutputStream stream = new FileOutputStream(new File(directory, name + ".png"))) {
            assertTrue(image.compress(Bitmap.CompressFormat.PNG, 100, stream));
        }
        image.recycle();
        // Gradle uninstalls test APKs after instrumentation, deleting their
        // app-specific files. Copy via the test runner's shell (not an app
        // permission) so CI can collect screenshots after that cleanup.
        String export = "/sdcard/Download/ludeverbis-store/" + name + ".png";
        try (android.os.ParcelFileDescriptor descriptor = InstrumentationRegistry.getInstrumentation()
                .getUiAutomation().executeShellCommand("mkdir -p /sdcard/Download/ludeverbis-store && cp " +
                    new File(directory, name + ".png").getAbsolutePath() + " " + export + " && stat -c %s " + export);
             java.io.FileInputStream stream = new java.io.FileInputStream(descriptor.getFileDescriptor())) {
            String size = new String(stream.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8).trim();
            assertTrue("Screenshot must survive test APK uninstall", Long.parseLong(size) > 0);
        }
    }

    @Test public void freshOfflinePlaySurvivesRecreationAndBack() throws Exception {
        scenario = ActivityScenario.launch(MainActivity.class);
        try {
            until("document.querySelector('#setup-form')");
            assertEquals("5", js("document.querySelectorAll('input[name=gameMode]').length"));
            assertEquals("true", js("Capacitor.isNativePlatform()"));
            assertEquals("false", js("Boolean(document.querySelector('[data-action=install]'))"));
            until("document.querySelector('#connection').textContent.includes('Offline bereit')");
            screenshot("01-start");
            assertEquals("\"https://localhost\"", js("location.origin"));
            js("document.querySelector('label.game-mode:has(input[value=noises])').click()");
            until("document.querySelector('input[value=noises]').checked");
            js("document.querySelector('#setup-form').requestSubmit()");
            until("document.querySelector('[data-action=start-turn]')");
            js("document.querySelector('[data-action=start-turn]').click()");
            until("document.querySelector('.mode-indicator strong')?.textContent === 'Geräusche'");
            screenshot("02-geraeusche");
            js("document.querySelector('[data-action=correct]').click()");
            until("JSON.parse(localStorage.getItem('wortspiel.state.v1')).session.log.length === 1");
            js("document.querySelector('[data-action=pause]').click()");
            until("JSON.parse(localStorage.getItem('wortspiel.state.v1')).session.phase === 'paused'");
            screenshot("03-pause");
            String groups = js("JSON.stringify(JSON.parse(localStorage.getItem('wortspiel.state.v1')).groups)");
            String session = js("JSON.stringify(JSON.parse(localStorage.getItem('wortspiel.state.v1')).session)");
            scenario.recreate();
            until("document.querySelector('[data-action=resume]')");
            assertEquals(groups, js("JSON.stringify(JSON.parse(localStorage.getItem('wortspiel.state.v1')).groups)"));
            assertEquals(session, js("JSON.stringify(JSON.parse(localStorage.getItem('wortspiel.state.v1')).session)"));
            js("Capacitor.registerPlugin('LudeverbisDocuments').open().then(r => window.nativeOpenCancelled = r.cancelled)");
            Thread.sleep(1500);
            InstrumentationRegistry.getInstrumentation().getUiAutomation().performGlobalAction(android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_BACK);
            until("window.nativeOpenCancelled === true");
            assertEquals(groups, js("JSON.stringify(JSON.parse(localStorage.getItem('wortspiel.state.v1')).groups)"));
            // Native-back listener asks before closing and does not erase the game.
            InstrumentationRegistry.getInstrumentation().getUiAutomation().performGlobalAction(android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_BACK);
            until("document.querySelector('#modal')?.open");
            assertEquals(session, js("JSON.stringify(JSON.parse(localStorage.getItem('wortspiel.state.v1')).session)"));
            js("document.querySelector('[data-action=close-dialog]').click()");
        } finally { scenario.close(); }
    }
}
