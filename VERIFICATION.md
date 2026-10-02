# Verification — 2026-10-02

## Completed

`python3 -m unittest discover -s tests -v`: **25 tests passed**.

Verified accounting and authorization behavior:

- 2D/3D/4D exact matching, leading zeroes and payouts of 80x/650x/6000x.
- Stake deduction, losing entries, repeat settlements and receipt reconciliation.
- Repeated/concurrent requests deduct or pay once; concurrent bets cannot overdraw.
- Insufficient balance and payout-cap errors roll back the complete transaction.
- 18:00 Asia/Yangon is an inclusive cutoff; results cannot publish early.
- Three separate draws each day; new dates receive separate draw records.
- Player/admin permissions, malformed inputs and immutable published results.
- Daily limits across all markets and voluntary breaks.
- Password/session storage, login, logout, HttpOnly and SameSite cookies.
- Unauthorized HTTP requests, mutation header protection, private file access and security headers.

JavaScript syntax passed `node --check` for the inline UI script and browser-test script. Python source compiled using `py_compile`.

## Not completed

- Browser integration and visual QA: `tests/test_ui.cjs` attempted to launch Playwright, but the environment has no Chromium executable. No browser assertions ran; no screenshot was generated. The test script is included for a machine with Playwright/Chromium installed.
- APK compilation: no Android SDK, Gradle or Java compiler is available in this environment. The Android project and workflow are provided but not compiled or device-tested.
- HTTPS hosting, production database, backups, release signing, cash payments, identity verification and legal authorization are not configured.
- No GitHub repository, Render service or Neon database was created or modified for this project. No paid resources were created.

This verification covers a development prototype. It does not establish readiness for real-money operation.

Build compatibility reference: [Android Gradle Plugin 8.7](https://developer.android.com/build/releases/agp-8-7-0-release-notes) — Gradle 8.9, JDK 17, maximum API 35.
