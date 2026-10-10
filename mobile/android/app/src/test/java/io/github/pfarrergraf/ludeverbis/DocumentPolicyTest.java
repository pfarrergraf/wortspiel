package io.github.pfarrergraf.ludeverbis;

import org.junit.Test;
import static org.junit.Assert.*;

public class DocumentPolicyTest {
    @Test public void onlySimpleUserDocumentNamesAreAccepted() {
        assertTrue(DocumentPolicy.validName("wortspiel-speicher-2026-10-10.json"));
        assertTrue(DocumentPolicy.validName("spende-jugendarbeit.png"));
        for (String invalid : new String[]{null, "", "../secret", "a/b.json", "a\\b.json", "..", "a\u0000.json", "x".repeat(121)})
            assertFalse("Must reject " + invalid, DocumentPolicy.validName(invalid));
    }
    @Test public void fileSizeBoundaryAndMimeAreEnforced() {
        assertTrue(DocumentPolicy.validSize(0));
        assertTrue(DocumentPolicy.validSize(5 * 1024 * 1024));
        assertFalse(DocumentPolicy.validSize(5 * 1024 * 1024 + 1));
        assertFalse(DocumentPolicy.validSize(-1));
        assertTrue(DocumentPolicy.validMime("application/json"));
        assertTrue(DocumentPolicy.validMime("image/png"));
        assertFalse(DocumentPolicy.validMime("text/html"));
        assertFalse(DocumentPolicy.validMime(null));
    }
}
