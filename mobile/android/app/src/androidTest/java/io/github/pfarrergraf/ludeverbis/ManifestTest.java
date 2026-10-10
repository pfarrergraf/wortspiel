package io.github.pfarrergraf.ludeverbis;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import static org.junit.Assert.*;

public class ManifestTest {
    @Test public void mergedPackageHasOnlyInternetAndNoAutomaticBackup() throws Exception {
        Context app = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals("io.github.pfarrergraf.ludeverbis", app.getPackageName());
        PackageInfo info = app.getPackageManager().getPackageInfo(app.getPackageName(), PackageManager.GET_PERMISSIONS);
        assertTrue(java.util.Arrays.asList(info.requestedPermissions).contains("android.permission.INTERNET"));
        for (String permission : info.requestedPermissions) {
            // AndroidX adds its own signature-only broadcast permission; it
            // grants no user data access and is not a runtime permission.
            assertTrue(permission, permission.equals("android.permission.INTERNET") ||
                permission.equals(app.getPackageName() + ".DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION"));
        }
        assertEquals(0, info.applicationInfo.flags & ApplicationInfo.FLAG_ALLOW_BACKUP);
        assertEquals(36, info.applicationInfo.targetSdkVersion);
    }
}
