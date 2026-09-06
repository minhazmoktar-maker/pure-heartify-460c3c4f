# Android release handover (Heartify)

Final verified state of the native Android project. Nothing here changes the
web app — it documents the exact toolchain and commands needed to build.

## Identity

| Item | Value |
| --- | --- |
| Application / package ID | `com.heartifyapp.app` |
| App name | `heartify` |
| Custom URL scheme | `heartify://` |
| App Links hosts | `heartifyapp.com`, `www.heartifyapp.com` |

The ID appears in `capacitor.config.ts`, `android/app/build.gradle`
(`namespace` + `applicationId`), `android/app/src/main/res/values/strings.xml`
and `public/.well-known/assetlinks.json`. All four match.

## Toolchain (verified compatible)

| Component | Required version |
| --- | --- |
| Capacitor (core / android / cli) | 8.3.1 |
| JDK | 21 (Temurin 21 recommended; JDK 17 will fail — `capacitor.build.gradle` pins Java 21) |
| Gradle (wrapper) | 8.14.3 |
| Android Gradle Plugin | 8.13.0 |
| Node | 20 or 22 |
| compileSdk | 36 |
| targetSdk | 36 |
| minSdk | 24 (Android 7.0) |
| Android Build Tools / Platform | Android 36 platform + latest build-tools, via Android Studio SDK Manager |

`google-services` Gradle plugin: 4.4.4, applied only when
`android/app/google-services.json` exists.

## Fresh build on Windows (PowerShell)

```powershell
git clone <your-repo> heartify
cd heartify
npm install
npm run build                      # produces dist/
npx cap sync android               # copies dist/ + regenerates plugin config

cd android
.\gradlew.bat assembleDebug        # debug APK
.\gradlew.bat bundleRelease        # release AAB (needs signing, see below)
```

Outputs:
- `android/app/build/outputs/apk/debug/app-debug.apk`
- `android/app/build/outputs/bundle/release/app-release.aab`

Set `JAVA_HOME` to a JDK 21 install and `ANDROID_HOME` to your SDK
(`%LOCALAPPDATA%\Android\Sdk`) before running Gradle, or build from Android
Studio (Open → `heartify/android`).

`npx cap sync android` must be re-run after every `npm run build`; the web
assets in `android/app/src/main/assets/public` are git-ignored and generated.

## Signing

`android/app/heartify-signing.gradle` is already wired into
`android/app/build.gradle`. It reads credentials from, in order:

1. `android/keystore.properties` (git-ignored) with keys
   `storeFile`, `storePassword`, `keyAlias`, `keyPassword`
2. environment variables `ANDROID_KEYSTORE_PATH`,
   `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`
   (used by `android/fastlane/Fastfile`)

If neither is present, `bundleRelease` still builds but produces an unsigned
bundle. No keystore, password, or fingerprint is committed anywhere in this
repo; `*.jks`, `*.keystore` and `keystore.properties` are git-ignored.

Create the upload key locally (never commit it):

```powershell
keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias heartify
```

## App Links / SHA-256 fingerprints

After creating the upload key, print its fingerprint:

```powershell
keytool -list -v -keystore upload-keystore.jks -alias heartify
```

Insert the SHA-256 values into **`public/.well-known/assetlinks.json`**,
replacing:

- `REPLACE_WITH_UPLOAD_KEY_SHA256_FINGERPRINT` — your upload key
- `REPLACE_WITH_PLAY_APP_SIGNING_SHA256_FINGERPRINT` — from Play Console →
  Release → Setup → App signing (available after the first upload)

That file must be served at `https://heartifyapp.com/.well-known/assetlinks.json`
(it is, via `public/`). Until real fingerprints are published, `https://`
Heartify links open in the browser instead of the app; the `heartify://` scheme
works regardless. This is not a launch blocker.

## Firebase / push notifications

`android/app/google-services.json` is **not** in the repo and is not required
to build or ship.

Without it:
- Local notifications, prayer reminders, in-app notifications, deep links,
  audio playback, offline Qur'an — all work.
- Remote/background push via FCM does **not** work: no FCM token is issued,
  so server-side fanout has no Android device to target.

To enable push, create a Firebase project with package `com.heartifyapp.app`,
download `google-services.json` into `android/app/`, and rebuild. The Gradle
plugin auto-applies when the file is present.

## Independence from Lovable

No Lovable runtime dependency is required for the Android build. The app talks
to the hosted backend over HTTPS using the publishable key in `.env`
(`VITE_SUPABASE_*`); no Lovable SDK, plugin, or preview URL is compiled into a
release build (`server.url` is only set when `CAP_LIVE_RELOAD_URL` is exported
for local live-reload).
