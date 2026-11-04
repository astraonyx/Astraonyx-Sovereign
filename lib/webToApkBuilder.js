// lib/webToApkBuilder.js — Polaris Web-to-APK Project Builder Engine
// Extracts web zip files and scaffolds complete Android WebView Gradle Project
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const BUILDS_DIR = path.resolve('./tmp/apk_builds');

// Ensure output directory exists
if (!fs.existsSync(BUILDS_DIR)) {
  fs.mkdirSync(BUILDS_DIR, { recursive: true });
}

/**
 * Builds an Android WebView project from uploaded web ZIP
 */
async function buildWebToApk({
  zipBase64,
  appName = 'Polaris App',
  packageId = 'com.polaris.webapp',
  versionName = '1.0.0',
  versionCode = 1,
  targetMode = 'offline',
  backendUrl = '',
  orientation = 'portrait',
  themeColor = '#0f172a',
  permissions = ['INTERNET', 'ACCESS_NETWORK_STATE']
}) {
  const buildId = `apk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const buildDir = path.join(BUILDS_DIR, buildId);
  const logs = [];

  const log = (msg) => {
    logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
  };

  try {
    log(`Memulai build proyek APK: "${appName}" (${packageId})...`);
    fs.mkdirSync(buildDir, { recursive: true });

    // 1. Ekstrak aset web
    const wwwDir = path.join(buildDir, 'app', 'src', 'main', 'assets', 'www');
    fs.mkdirSync(wwwDir, { recursive: true });

    if (zipBase64) {
      log('Mengekstrak berkas ZIP web ke direktori assets/www...');
      const zipBuffer = Buffer.from(zipBase64.replace(/^data:.*?;base64,/, ''), 'base64');
      const zip = new AdmZip(zipBuffer);
      zip.extractAllTo(wwwDir, true);
      log(`Ekstraksi selesai. Total berkas diekstrak: ${fs.readdirSync(wwwDir).length}`);
    } else {
      log('Tidak ada ZIP diunggah, membuat starter web template...');
      const starterHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${appName}</title>
  <style>
    body { background: #0f172a; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
    h1 { color: #38bdf8; }
  </style>
</head>
<body>
  <div>
    <h1>🚀 ${appName}</h1>
    <p>Aplikasi web Android berhasil dibangun dengan Polaris Web-to-APK Studio!</p>
  </div>
</body>
</html>`;
      fs.writeFileSync(path.join(wwwDir, 'index.html'), starterHtml, 'utf-8');
    }

    // 2. Buat direktori Java source
    const packageParts = packageId.split('.').filter(Boolean);
    const javaDir = path.join(buildDir, 'app', 'src', 'main', 'java', ...packageParts);
    fs.mkdirSync(javaDir, { recursive: true });

    // 3. Generate MainActivity.java
    log('Menyusun MainActivity.java dengan WebView & WebChromeClient modern...');
    const mainActivityJava = `package ${packageId};

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;

public class MainActivity extends Activity {
    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private final static int FILECHOOSER_RESULTCODE = 1;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        ProgressBar progressBar = findViewById(R.id.progressBar);

        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        webSettings.setUseWideViewPort(true);
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setMediaPlaybackRequiresUserGesture(false);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file://")) {
                    return false;
                }
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
                } catch (Exception e) {
                    return true;
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (newProgress < 100) {
                    progressBar.setVisibility(View.VISIBLE);
                    progressBar.setProgress(newProgress);
                } else {
                    progressBar.setVisibility(View.GONE);
                }
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback,
                                              FileChooserParams fileChooserParams) {
                if (MainActivity.this.filePathCallback != null) {
                    MainActivity.this.filePathCallback.onReceiveValue(null);
                }
                MainActivity.this.filePathCallback = filePathCallback;

                Intent intent = fileChooserParams.createIntent();
                try {
                    startActivityForResult(intent, FILECHOOSER_RESULTCODE);
                } catch (Exception e) {
                    MainActivity.this.filePathCallback = null;
                    return false;
                }
                return true;
            }
        });

        ${targetMode === 'remote' && backendUrl ? `webView.loadUrl("${backendUrl}");` : `webView.loadUrl("file:///android_asset/www/index.html");`}
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if ((keyCode == KeyEvent.KEYCODE_BACK) && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}
`;
    fs.writeFileSync(path.join(javaDir, 'MainActivity.java'), mainActivityJava, 'utf-8');

    // 4. Generate AndroidManifest.xml
    log('Menyusun AndroidManifest.xml dengan permissions...');
    const manifestPermissions = (permissions || []).map(p => `    <uses-permission android:name="android.permission.${p}" />`).join('\n');
    const androidManifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${packageId}">

${manifestPermissions}

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher"
        android:supportsRtl="true"
        android:usesCleartextTraffic="true"
        android:theme="@style/Theme.App">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden"
            android:screenOrientation="${orientation || 'portrait'}">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;
    fs.writeFileSync(path.join(buildDir, 'app', 'src', 'main', 'AndroidManifest.xml'), androidManifest, 'utf-8');

    // 5. Generate Resource files (res/layout/activity_main.xml, res/values/strings.xml, colors.xml)
    log('Menyusun layout XML & resource values...');
    const resDir = path.join(buildDir, 'app', 'src', 'main', 'res');
    const layoutDir = path.join(resDir, 'layout');
    const valuesDir = path.join(resDir, 'values');
    fs.mkdirSync(layoutDir, { recursive: true });
    fs.mkdirSync(valuesDir, { recursive: true });

    const layoutXml = `<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="${themeColor}">

    <ProgressBar
        android:id="@+id/progressBar"
        style="?android:attr/progressBarStyleHorizontal"
        android:layout_width="match_parent"
        android:layout_height="4dp"
        android:layout_alignParentTop="true"
        android:visibility="gone" />

    <WebView
        android:id="@+id/webview"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />
</RelativeLayout>`;
    fs.writeFileSync(path.join(layoutDir, 'activity_main.xml'), layoutXml, 'utf-8');

    const stringsXml = `<resources>
    <string name="app_name">${appName.replace(/"/g, '\\"')}</string>
</resources>`;
    fs.writeFileSync(path.join(valuesDir, 'strings.xml'), stringsXml, 'utf-8');

    const colorsXml = `<resources>
    <color name="primary_color">${themeColor}</color>
</resources>`;
    fs.writeFileSync(path.join(valuesDir, 'colors.xml'), colorsXml, 'utf-8');

    const stylesXml = `<resources>
    <style name="Theme.App" parent="android:Theme.Material.Light.NoActionBar">
        <item name="android:statusBarColor">${themeColor}</item>
        <item name="android:windowBackground">${themeColor}</item>
    </style>
</resources>`;
    fs.writeFileSync(path.join(valuesDir, 'styles.xml'), stylesXml, 'utf-8');

    // 6. Generate Gradle files (app/build.gradle, root build.gradle, settings.gradle)
    log('Menyusun skrip Gradle Android Studio...');
    const appBuildGradle = `plugins {
    id 'com.android.application'
}

android {
    namespace '${packageId}'
    compileSdk 34

    defaultConfig {
        applicationId "${packageId}"
        minSdk 21
        targetSdk 34
        versionCode ${versionCode || 1}
        versionName "${versionName || '1.0.0'}"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
}`;
    fs.writeFileSync(path.join(buildDir, 'app', 'build.gradle'), appBuildGradle, 'utf-8');

    const rootBuildGradle = `buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.2.2'
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}`;
    fs.writeFileSync(path.join(buildDir, 'build.gradle'), rootBuildGradle, 'utf-8');

    const settingsGradle = `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "${appName.replace(/[^a-zA-Z0-9_-]/g, '_')}"
include ':app'`;
    fs.writeFileSync(path.join(buildDir, 'settings.gradle'), settingsGradle, 'utf-8');

    // README Petunjuk Kompilasi
    const readmeText = `# ${appName} — Paket Proyek Android APK
Dihasilkan otomatis oleh **Polaris Web-to-APK Builder Studio** pada ${new Date().toLocaleString('id-ID')}.

## Cara Kompilasi Menjadi File .APK:
1. Ekstrak file ZIP ini ke komputer Anda.
2. Buka software **Android Studio** (atau via command-line \`gradlew assembleDebug\`).
3. Pilih menu **File &rarr; Open** lalu pilih folder proyek ini.
4. Tunggu Gradle Sync selesai (otomatis mengunduh library yang dibutuhkan).
5. Klik menu **Build &rarr; Build Bundle(s) / APK(s) &rarr; Build APK(s)**.
6. File APK siap dipasang di HP Android Anda di folder \`app/build/outputs/apk/debug/app-debug.apk\`!

Mode: ${targetMode.toUpperCase()}
Package ID: ${packageId}
Versi: ${versionName} (Build ${versionCode})
`;
    fs.writeFileSync(path.join(buildDir, 'README.md'), readmeText, 'utf-8');

    // 7. Kompres seluruh struktur proyek menjadi 1 file ZIP unduhan
    log('Mengompres paket proyek lengkap menjadi file ZIP siap unduh...');
    const finalZipPath = path.join(BUILDS_DIR, `${buildId}_package.zip`);
    const outputZip = new AdmZip();
    outputZip.addLocalFolder(buildDir);
    outputZip.writeZip(finalZipPath);

    log(`✅ Proyek APK berhasil dibangun! Ukuran paket: ${(fs.statSync(finalZipPath).size / 1024).toFixed(1)} KB`);

    return {
      success: true,
      buildId,
      fileName: `${appName.replace(/[^a-zA-Z0-9_-]/g, '_')}_Android_Project.zip`,
      downloadUrl: `/api/tools/web-to-apk/download/${buildId}`,
      logs,
    };
  } catch (err) {
    log(`❌ Error pembangunan proyek APK: ${err.message}`);
    return {
      success: false,
      error: err.message,
      logs,
    };
  }
}

module.exports = {
  buildWebToApk,
  BUILDS_DIR,
};
