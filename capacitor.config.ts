import type { CapacitorConfig } from '@capacitor/cli';

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
          allowNavigation: ['heartify.app', '*.heartify.app', 'pure-heartify.lovable.app'],
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
  ios: {
    scheme: 'heartify',
  },
};

export default config;
