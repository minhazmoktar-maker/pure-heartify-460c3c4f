import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Locales the native shells declare, mirroring `APP_LOCALES` in
 * `src/config/globalization.ts`. Duplicated (not imported) on purpose: the
 * Capacitor CLI loads this file outside Vite, so the `@/…` path alias used by
 * the app source is not resolvable here. Keep the two lists in sync — the
 * generated native files are `android/app/src/main/res/xml/locales_config.xml`
 * and the `CFBundleLocalizations` block in `docs/ios-localization.plist`.
 */
const APP_LOCALE_TAGS = [
  'bn', 'bn-IN', 'ur', 'ur-IN', 'ps',
  'en', 'en-GB',
  'ar', 'fa', 'tr',
  'id', 'ms',
  'ha', 'sw',
  'fr', 'de', 'es', 'es-419', 'pt-PT', 'pt-BR',
  'zh-Hans', 'zh-Hant', 'ja', 'ko',
] as const;



/**
 * Capacitor configuration.
 *
 * SECURITY / STORE-COMPLIANCE:
 * The native app MUST ship the bundled `dist/` assets — never a remote
 * `server.url` pointing at a preview/staging origin. Apple and Google will
 * either reject the binary or brick it in the wild the moment the remote
 * origin changes.
 *
 * If you truly need Capacitor live-reload against the Lovable sandbox during
 * local development, export CAP_LIVE_RELOAD_URL before running `npx cap run`
 * (for example: `CAP_LIVE_RELOAD_URL="https://<sandbox>.lovableproject.com?forceHideBadge=true" npx cap run ios`).
 * Production builds MUST run with the variable unset so the app boots from
 * `webDir` and passes review.
 */
const liveReloadUrl = process.env.CAP_LIVE_RELOAD_URL?.trim();

const config: CapacitorConfig = {
  appId: 'app.lovable.6731527d4fb54e95bb9e47de8bea4363',
  appName: 'heartify',
  webDir: 'dist',
  ...(liveReloadUrl
    ? {
        server: {
          url: liveReloadUrl,
          cleartext: true,
          allowNavigation: ['heartifyapp.com', '*.heartifyapp.com', 'heartify.app', '*.heartify.app'],
        },
      }
    : {}),
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0F172A',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  /**
   * iOS shell.
   * - `scheme` backs the custom `heartify://` deep links handled in
   *   `src/hooks/useDeepLinks.ts`; universal links come from
   *   `public/.well-known/apple-app-site-association`.
   * - `limitsNavigationsToAppBoundDomains` keeps the WKWebView pinned to the
   *   bundled app, which App Review expects for a store build.
   * - `preferredContentMode: 'mobile'` prevents desktop-width layouts on iPad.
   * - `backgroundColor` matches the splash so RTL locales don't flash white.
   */
  ios: {
    scheme: 'heartify',
    contentInset: 'always',
    preferredContentMode: 'mobile',
    limitsNavigationsToAppBoundDomains: true,
    backgroundColor: '#0F172A',
    // Declared for reference; the authoritative list lives in
    // ios/App/App/Info.plist (see docs/ios-localization.plist).
    // @ts-expect-error — informational only, ignored by the Capacitor CLI.
    localizations: APP_LOCALE_TAGS,
  },
  /**
   * Android shell.
   * - `allowMixedContent: false` + `captureInput` keep the WebView store-safe.
   * - `webContentsDebuggingEnabled` is off for release builds.
   * - Per-app language support comes from
   *   `android/app/src/main/res/xml/locales_config.xml` (API 33+), referenced
   *   from AndroidManifest as `android:localeConfig`.
   */
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: '#0F172A',
    // Declared for reference; the authoritative list lives in
    // android/app/src/main/res/xml/locales_config.xml.
    // @ts-expect-error — informational only, ignored by the Capacitor CLI.
    localizations: APP_LOCALE_TAGS,
  },
};

export default config;
