package io.github.pfarrergraf.ludeverbis;

final class DocumentPolicy {
    static final int MAX_BYTES = 5 * 1024 * 1024;
    static boolean validName(String name) {
        return name != null && name.matches("[a-zA-Z0-9._-]{1,120}") && !name.contains("..");
    }
    static boolean validSize(int bytes) { return bytes >= 0 && bytes <= MAX_BYTES; }
    static boolean validMime(String mime) { return "application/json".equals(mime) || "image/png".equals(mime); }
}
