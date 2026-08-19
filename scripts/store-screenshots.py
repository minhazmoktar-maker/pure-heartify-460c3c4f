#!/usr/bin/env python3
"""Capture App Store / Play Store screenshots from the running app.

Usage:
    python3 scripts/store-screenshots.py [base_url]

Defaults to http://localhost:8080 (Vite dev server). Output lands in
store-assets/screenshots/<device>/NN-<route>.png at the exact pixel sizes
Apple and Google require, so the files can be uploaded without resizing.

Devices captured:
  ios-6.7   1290 x 2796  (iPhone 15 Pro Max — required)
  ios-6.1   1179 x 2556  (iPhone 15 Pro — required)
  ipad-12.9 2048 x 2732  (iPad Pro — required if iPad is supported)
  android   1080 x 1920  (phone)
  android-tablet 1600 x 2560
"""
import asyncio
import sys
from pathlib import Path

from playwright.async_api import async_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080").rstrip("/")
OUT = Path(__file__).resolve().parent.parent / "store-assets" / "screenshots"

DEVICES = {
    "ios-6.7": (1290, 2796, 3),
    "ios-6.1": (1179, 2556, 3),
    "ipad-12.9": (2048, 2732, 2),
    "android": (1080, 1920, 3),
    "android-tablet": (1600, 2560, 2),
}

# (route, filename slug) — the five story beats of the listing.
ROUTES = [
    ("/", "01-today"),
    ("/search", "02-search"),
    ("/listen", "03-listen"),
    ("/streak", "04-streak"),
    ("/challenges", "05-challenges"),
]


async def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        for device, (w, h, dpr) in DEVICES.items():
            folder = OUT / device
            folder.mkdir(parents=True, exist_ok=True)
            context = await browser.new_context(
                viewport={"width": w // dpr, "height": h // dpr},
                device_scale_factor=dpr,
                is_mobile=dpr == 3,
                has_touch=True,
                reduced_motion="reduce",
            )
            page = await context.new_page()
            for route, slug in ROUTES:
                await page.goto(f"{BASE}{route}", wait_until="domcontentloaded")
                try:
                    await page.wait_for_load_state("networkidle", timeout=8000)
                except Exception:
                    pass
                await page.wait_for_timeout(1500)
                target = folder / f"{slug}.png"
                await page.screenshot(path=str(target))
                print(f"{device}/{slug}.png  {w}x{h}")
            await context.close()
        await browser.close()


asyncio.run(main())
