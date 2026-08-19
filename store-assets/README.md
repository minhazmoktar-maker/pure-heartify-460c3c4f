# Heartify — Store Submission Assets

Everything in this folder is produced from the repo and can be uploaded as-is.
Regenerate the screenshots after any significant UI change:

```bash
bun run store:screenshots            # against the local dev server
bun run store:screenshots -- https://www.heartifyapp.com   # against production
```

## Ready to upload

| Asset | File | Where it goes |
| --- | --- | --- |
| Play feature graphic (1024×500) | `play-feature-graphic.jpg` | Play Console → Store listing → Graphics |
| iPhone 6.7" screenshots (1290×2796) | `screenshots/ios-6.7/*.png` | App Store Connect → iPhone 6.7" |
| iPhone 6.1" screenshots (1179×2556) | `screenshots/ios-6.1/*.png` | App Store Connect → iPhone 6.1" |
| iPad 12.9" screenshots (2048×2732) | `screenshots/ipad-12.9/*.png` | App Store Connect → iPad Pro |
| Android phone screenshots (1080×1920) | `screenshots/android/*.png` | Play Console → Phone |
| Android tablet screenshots (1600×2560) | `screenshots/android-tablet/*.png` | Play Console → Tablet |
| App icon (1024×1024) | `../public/icons/icon-source.png` | App Store Connect icon / `@capacitor/assets` source |
| Adaptive + PWA icons | `../public/icons/icon-512.png`, `icon-192.png` | Play Console / manifest |
| Splash source | `../public/icons/splash-source.png` | `@capacitor/assets` source |

Screenshot order tells the listing story: Today → Search → Listen → Streak →
Challenges. Captured signed-out on purpose so no personal data ships to the
stores.

## Listing text

- Long-form copy: `docs/STORE_LISTING.md`
- Data Safety / privacy answers: `docs/STORE_SUBMISSION_TEMPLATES.md`, `docs/play-data-safety.md`
- Info.plist strings: `docs/ios-info-plist-additions.xml`

## Still needs your accounts (cannot be done from the repo)

- Apple Team ID → `public/.well-known/apple-app-site-association`
- Play App Signing + upload key SHA-256 → `public/.well-known/assetlinks.json`
- Paddle vendor ID + client-side token → checkout keys for Heartify Plus
- Age-rating questionnaires, tax/banking, and the two testing tracks
