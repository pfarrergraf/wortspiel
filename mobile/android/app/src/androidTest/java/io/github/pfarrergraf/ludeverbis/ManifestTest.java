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
        assertArrayEquals(new String[]{"android.permission.INTERNET"}, info.requestedPermissions);
        assertEquals(0, info.applicationInfo.flags & ApplicationInfo.FLAG_ALLOW_BACKUP);
        assertEquals(36, info.applicationInfo.targetSdkVersion);
    }
}
