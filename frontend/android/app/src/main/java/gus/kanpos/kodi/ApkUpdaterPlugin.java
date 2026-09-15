package gus.kanpos.kodi;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Update aplikasi di luar Play Store: unduh APK dari KanPOS Cloud, cocokkan
 * SHA-256, lalu serahkan ke layar pemasangan bawaan Android.
 *
 * File disimpan di `files/updates/<versionCode>.apk`. Unduhan yang terputus
 * disimpan sebagai `.part` dan dilanjutkan dengan header Range, karena koneksi
 * HP di warung sering putus-sambung.
 */
@CapacitorPlugin(name = "ApkUpdater")
public class ApkUpdaterPlugin extends Plugin {

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final AtomicBoolean cancelled = new AtomicBoolean(false);
    private final AtomicBoolean running = new AtomicBoolean(false);

    private File updatesDir() {
        File dir = new File(getContext().getFilesDir(), "updates");
        if (!dir.exists()) dir.mkdirs();
        return dir;
    }

    private File apkFile(int versionCode) {
        return new File(updatesDir(), versionCode + ".apk");
    }

    /** Sumber pemasangan: "com.android.vending" berarti dari Play Store. */
    @PluginMethod
    public void getInstallSource(PluginCall call) {
        String installer = null;
        try {
            String pkg = getContext().getPackageName();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                installer = getContext().getPackageManager().getInstallSourceInfo(pkg).getInstallingPackageName();
            } else {
                installer = getContext().getPackageManager().getInstallerPackageName(pkg);
            }
        } catch (Exception ignored) {
        }
        JSObject ret = new JSObject();
        ret.put("installer", installer);
        call.resolve(ret);
    }

    /** APK versi ini sudah lengkap dan terverifikasi di perangkat? */
    @PluginMethod
    public void getDownloaded(PluginCall call) {
        int versionCode = call.getInt("versionCode", 0);
        File f = apkFile(versionCode);
        JSObject ret = new JSObject();
        ret.put("downloaded", f.exists());
        call.resolve(ret);
    }

    @PluginMethod
    public void download(PluginCall call) {
        String url = call.getString("url");
        String sha256 = call.getString("sha256", "");
        int versionCode = call.getInt("versionCode", 0);
        if (url == null || versionCode <= 0) {
            call.reject("url dan versionCode wajib diisi");
            return;
        }
        if (!running.compareAndSet(false, true)) {
            call.reject("Unduhan lain sedang berjalan", "BUSY");
            return;
        }
        cancelled.set(false);

        executor.execute(() -> {
            try {
                File target = apkFile(versionCode);
                if (!target.exists()) {
                    // Buang sisa unduhan versi lain supaya penyimpanan HP tidak menumpuk.
                    File[] lama = updatesDir().listFiles();
                    if (lama != null) {
                        for (File f : lama) {
                            if (!f.getName().startsWith(versionCode + ".")) f.delete();
                        }
                    }
                    unduh(url, target, versionCode);
                    if (!sha256.isEmpty() && !sha256.equalsIgnoreCase(hitungSha256(target))) {
                        target.delete();
                        call.reject("File update rusak. Coba unduh lagi.", "CHECKSUM");
                        return;
                    }
                }
                JSObject ret = new JSObject();
                ret.put("path", target.getAbsolutePath());
                call.resolve(ret);
            } catch (CancelledException e) {
                call.reject("Unduhan dibatalkan", "CANCELLED");
            } catch (Exception e) {
                call.reject("Unduhan gagal: " + e.getMessage(), "NETWORK", e);
            } finally {
                running.set(false);
            }
        });
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        cancelled.set(true);
        call.resolve();
    }

    private static class CancelledException extends Exception {}

    private void unduh(String url, File target, int versionCode) throws Exception {
        File part = new File(updatesDir(), versionCode + ".part");
        // Tiga kali percobaan; tiap percobaan melanjutkan dari byte terakhir.
        Exception terakhir = null;
        for (int percobaan = 0; percobaan < 3; percobaan++) {
            if (cancelled.get()) throw new CancelledException();
            try {
                unduhSekali(url, part);
                if (!part.renameTo(target)) throw new Exception("Gagal menyimpan file");
                return;
            } catch (CancelledException e) {
                throw e;
            } catch (Exception e) {
                terakhir = e;
                Thread.sleep(2000L * (percobaan + 1));
            }
        }
        throw terakhir;
    }

    private void unduhSekali(String url, File part) throws Exception {
        long sudah = part.exists() ? part.length() : 0;
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setConnectTimeout(15000);
        conn.setReadTimeout(30000);
        if (sudah > 0) conn.setRequestProperty("Range", "bytes=" + sudah + "-");
        conn.connect();

        int code = conn.getResponseCode();
        boolean lanjut = code == 206;
        if (code == 416) {
            // Server bilang rentangnya sudah habis: file .part sudah lengkap.
            conn.disconnect();
            return;
        }
        if (code != 200 && code != 206) {
            conn.disconnect();
            throw new Exception("HTTP " + code);
        }
        if (!lanjut) sudah = 0;

        long total = conn.getContentLengthLong();
        if (total > 0) total += sudah;

        try (InputStream in = conn.getInputStream();
             OutputStream out = new FileOutputStream(part, lanjut)) {
            byte[] buf = new byte[64 * 1024];
            long terbaca = sudah;
            long terakhirLapor = 0;
            int n;
            while ((n = in.read(buf)) != -1) {
                if (cancelled.get()) throw new CancelledException();
                out.write(buf, 0, n);
                terbaca += n;
                long now = System.currentTimeMillis();
                if (now - terakhirLapor > 250) {
                    terakhirLapor = now;
                    JSObject p = new JSObject();
                    p.put("downloaded", terbaca);
                    p.put("total", total);
                    notifyListeners("progress", p);
                }
            }
            JSObject p = new JSObject();
            p.put("downloaded", terbaca);
            p.put("total", total > 0 ? total : terbaca);
            notifyListeners("progress", p);
        } finally {
            conn.disconnect();
        }
    }

    private static String hitungSha256(File f) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        try (InputStream in = new FileInputStream(f)) {
            byte[] buf = new byte[64 * 1024];
            int n;
            while ((n = in.read(buf)) != -1) md.update(buf, 0, n);
        }
        StringBuilder sb = new StringBuilder();
        for (byte b : md.digest()) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    /** Android 8+: izin "Instal aplikasi tak dikenal" khusus untuk KanPOS. */
    @PluginMethod
    public void canInstall(PluginCall call) {
        boolean boleh = Build.VERSION.SDK_INT < Build.VERSION_CODES.O
                || getContext().getPackageManager().canRequestPackageInstalls();
        JSObject ret = new JSObject();
        ret.put("allowed", boleh);
        call.resolve(ret);
    }

    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void install(PluginCall call) {
        int versionCode = call.getInt("versionCode", 0);
        File f = apkFile(versionCode);
        if (!f.exists()) {
            call.reject("File update tidak ditemukan", "NOT_FOUND");
            return;
        }
        Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }
}
