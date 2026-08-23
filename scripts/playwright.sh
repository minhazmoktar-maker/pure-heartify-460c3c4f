#!/usr/bin/env bash
# Playwright launcher that works on both CI (Ubuntu images, system libs from
# `playwright install --with-deps`) and Nix-based sandboxes where the
# downloaded Chromium/`chrome-headless-shell` binaries cannot find libglib and
# friends.
#
# Usage: scripts/playwright.sh [playwright test args...]
#   PLAYWRIGHT_BASE_URL=http://localhost:4189 scripts/playwright.sh tests/e2e
set -euo pipefail

# On Nix hosts, derive the shared-library path from the pre-patched Chromium
# that ships with the sandbox image and force the full browser build (the
# headless shell links against a narrower library set).
NIX_CHROMIUM_LIBS=""
if [ -d /nix/store ]; then
  WRAPPED=$(ls -d /nix/store/*-playwright-chromium/chrome-linux/.chrome-wrapped 2>/dev/null | head -1 || true)
  if [ -n "$WRAPPED" ] && command -v patchelf >/dev/null 2>&1; then
    NIX_CHROMIUM_LIBS=$(patchelf --print-rpath "$WRAPPED" 2>/dev/null || true)
  fi
  NIX_CHROME_BIN=$(ls -d /nix/store/*-playwright-chromium/chrome-linux/chrome 2>/dev/null | head -1 || true)
  if [ -n "$NIX_CHROME_BIN" ] && [ -z "${PLAYWRIGHT_CHROMIUM_PATH:-}" ]; then
    export PLAYWRIGHT_CHROMIUM_PATH="$NIX_CHROME_BIN"
  fi
  if [ -n "$NIX_CHROMIUM_LIBS" ]; then
    export LD_LIBRARY_PATH="${NIX_CHROMIUM_LIBS}${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
    export PLAYWRIGHT_CHANNEL="${PLAYWRIGHT_CHANNEL:-chromium}"
  fi
fi

# Fallback: some sandbox images pre-install browsers under
# PLAYWRIGHT_BROWSERS_PATH at a *different* revision than the one the pinned
# @playwright/test expects (e.g. chromium-1194 installed, 1217 expected). The
# binary is API-compatible for our specs, so point at whatever full Chromium
# build is actually present instead of failing to launch.
if [ -z "${PLAYWRIGHT_CHROMIUM_PATH:-}" ]; then
  BROWSERS_DIR="${PLAYWRIGHT_BROWSERS_PATH:-/opt/ms-playwright}"
  CANDIDATE=$(ls -d "$BROWSERS_DIR"/chromium-*/chrome-linux/chrome 2>/dev/null | sort -V | tail -1 || true)
  if [ -n "$CANDIDATE" ] && [ -x "$CANDIDATE" ]; then
    export PLAYWRIGHT_CHROMIUM_PATH="$CANDIDATE"
    export PLAYWRIGHT_CHANNEL="${PLAYWRIGHT_CHANNEL:-chromium}"
  fi
fi

exec bunx playwright test "$@"
