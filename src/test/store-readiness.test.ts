/**
 * Store-submission guardrails. These fail loudly if a change would get the
 * app rejected by Google Play or App Review.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import {
  ANDROID_PERMISSIONS,
  ANDROID_SDK,
  IOS_USAGE_STRINGS,
  SIGNING_GRADLE,
} from '../../scripts/apply-native-config.mjs';

const read = (p: string) => readFileSync(p, 'utf8');

describe('android store config', () => {
  it('targets an API level Play accepts for updates', () => {
    expect(ANDROID_SDK.targetSdk).toBeGreaterThanOrEqual(35);
    expect(ANDROID_SDK.compileSdk).toBeGreaterThanOrEqual(ANDROID_SDK.targetSdk);
    expect(ANDROID_SDK.minSdk).toBeGreaterThanOrEqual(24);
  });

  it('requests only the permissions the app actually uses', () => {
    expect(ANDROID_PERMISSIONS).toContain('android.permission.POST_NOTIFICATIONS');
    for (const forbidden of [
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_CONTACTS',
      'android.permission.READ_SMS',
      'android.permission.QUERY_ALL_PACKAGES',
      'android.permission.ACCESS_BACKGROUND_LOCATION',
    ]) {
      expect(ANDROID_PERMISSIONS).not.toContain(forbidden);
    }
  });

  it('never hardcodes keystore secrets in the signing gradle', () => {
    expect(SIGNING_GRADLE).toContain('signingConfigs');
    expect(SIGNING_GRADLE).toContain('ANDROID_KEYSTORE_PASSWORD');
    expect(SIGNING_GRADLE).not.toMatch(/storePassword\s+["'][^"']+["']/);
  });
});

describe('ios store config', () => {
  it('declares every permission string the app can trigger', () => {
    expect(Object.keys(IOS_USAGE_STRINGS)).toEqual(
      expect.arrayContaining([
        'NSUserNotificationsUsageDescription',
        'NSLocationWhenInUseUsageDescription',
      ]),
    );
    // Undeclared APIs => review rejection; declared-but-unused => also flagged.
    expect(IOS_USAGE_STRINGS).not.toHaveProperty('NSCameraUsageDescription');
  });

  it('ships a privacy manifest with tracking disabled', () => {
    const manifest = read('docs/privacy-info.xcprivacy');
    expect(manifest).toMatch(/<key>NSPrivacyTracking<\/key>\s*<false\/>/);
    expect(manifest).toMatch(/<key>NSPrivacyTrackingDomains<\/key>\s*<array\/>/);
    expect(manifest).toContain('NSPrivacyCollectedDataTypeCrashData');
  });
});

describe('capacitor config', () => {
  const config = read('capacitor.config.ts');

  it('boots from bundled assets unless live reload is explicitly requested', () => {
    expect(config).toContain('CAP_LIVE_RELOAD_URL');
    expect(config).toContain("webDir: 'dist'");
  });

  it('keeps the app id and name stable', () => {
    expect(config).toContain("appId: 'app.lovable.6731527d4fb54e95bb9e47de8bea4363'");
    expect(config).toContain("appName: 'heartify'");
  });
});

describe('submission paperwork', () => {
  it('has every prepared answer sheet on disk', () => {
    for (const doc of [
      'docs/PLAY_CONTENT_RATING.md',
      'docs/APP_STORE_PRIVACY_LABELS.md',
      'docs/STORE_READINESS_MATRIX.md',
      'docs/play-data-safety.md',
      'docs/STORE_LISTING.md',
      'docs/BETA_TESTFLIGHT_PLAY.md',
      'store-assets/play-feature-graphic.jpg',
      'public/icons/icon-source.png',
      'public/icons/splash-source.png',
    ]) {
      expect(existsSync(doc), `${doc} is missing`).toBe(true);
    }
  });

  it('ships screenshots for every required store size', () => {
    for (const dir of [
      'store-assets/screenshots/android',
      'store-assets/screenshots/android-tablet',
      'store-assets/screenshots/ios-6.7',
      'store-assets/screenshots/ios-6.1',
      'store-assets/screenshots/ipad-12.9',
    ]) {
      expect(existsSync(dir), `${dir} is missing`).toBe(true);
    }
  });
});
