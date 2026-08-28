# Performance optimization — Phase 3 report

**Date:** 28 August 2026  
**Scope:** Third-party script loading only. Tracking IDs unchanged. No Framer Motion, code-splitting, or dependency work.

---

## Audit (before changes)

All four services were initialized only from `frontend/index.html`. No env vars, `main.tsx` logic, or Vite/Vercel config loaded them. `index.html` is the SPA shell for every route.

| Service | IDs | Original load | Original init location | Auto page view? | App custom events / conversions | Pages |
|---|---|---|---|---|---|---|
| **GA4** | `G-9BZPGSKKYE` | `<script async src="https://www.googletagmanager.com/gtag/js?id=G-9BZPGSKKYE">` in `<head>` plus inline stub | Inline `gtag('config', 'G-9BZPGSKKYE')` | Yes — default `send_page_view` on config | `get_otp_clicked`, `otp_resent`, `otp_verified`, `form_step2_opened`, `nomination_submitted`, `utm_capture` + `user_properties` | All routes (full HTML load) |
| **Google Ads** | `AW-16608374468`; conversion `AW-16608374468/EtKvCIHcoegcEMTdvu89` | Same gtag.js as GA4 | Inline `gtag('config', 'AW-…')` then `gtag('event', 'conversion', …)` | N/A | **Yes** — “Page view_Guru_pant” conversion on every non-`/admin` document load | Skipped when `pathname.startsWith('/admin')` |
| **Meta Pixel** | `618460890635684` | Official stub in `<head>` injects `fbevents.js` (`async`) | `fbq('init')` + `fbq('track', 'PageView')` | Yes — `PageView` | **None** in `src/` (no `fbq` calls) | All routes; noscript `PageView` img kept for no-JS |
| **Microsoft Clarity** | `y8xb26d5ve` | Official snippet injects `https://www.clarity.ms/tag/y8xb26d5ve` (`async`) | Same snippet | Session recording, not a marketing page view | **None** in `src/` (no `clarity()` calls) | All routes |

### SPA page tracking

There was **no** `gtag('config')` / `fbq('track','PageView')` on client-side route changes. Only full document loads counted. That behavior is preserved (no extra SPA page views were added).

### Duplicates

None. One gtag.js URL, one Pixel init, one Clarity tag. The gtag stub + async `gtag.js` pair is the standard queue, not a double load.

### Blocking impact (original)

`async` scripts in `<head>` still **download and parse during initial load**, competing with first-party JS for bandwidth and the main thread. Inline Pixel/Clarity snippets also insert those network requests before React paints. Clarity session replay is especially expensive once it runs.

---

## New loading method

| Service | New method | Why it is safe |
|---|---|---|
| **GA4 + Google Ads** | Tiny **inline stub only** in `index.html` (`dataLayer` + `function gtag`). Config, Ads conversion (still skipped on `/admin*`), and later app events are **queued immediately** in `scheduleThirdPartyTracking()`. `gtag.js` is injected **after first paint** (double `requestAnimationFrame`). Script `id="niat-gtag"` — once only. | Stub exists before React, so `HeroSection` / `InlineNominationForm` / `utm.ts` `gtag()` calls never throw and are not dropped. Conversion is queued at app start, same payload as before, then flushed when `gtag.js` loads (typically milliseconds after paint, not a long timeout). |
| **Meta Pixel** | Stub + `init` / `PageView` queued at app start. `fbevents.js` injected **after first paint** (`id="niat-pixel"`). Noscript img unchanged. | Same official queue as the previous snippet. No app code calls `fbq` after init. Failed load: `onerror` is a no-op. |
| **Clarity** | Injected on **`requestIdleCallback` with `timeout: 2500`**, or `setTimeout(0)` if rIC is missing (`id="niat-clarity"`). | No conversions or custom events depend on Clarity. Idle + 2.5s cap avoids waiting forever without using an arbitrary 10s delay. Session replay starts slightly later; early interactions may be missing from recordings. |

Ad blockers / failed scripts: inject uses `onerror = () => undefined`. The app does not depend on these globals after the stubs.

---

## Files changed

| File | Change |
|---|---|
| `index.html` | Removed gtag.js, Ads conversion snippet, Pixel snippet, Clarity snippet. Left JSON-LD, a 4-line gtag stub, and the noscript Pixel img. |
| `src/lib/thirdPartyTracking.ts` | **New.** Stubs, queued bootstrap events, one-shot script inject, paint/idle scheduling. |
| `src/main.tsx` | Calls `scheduleThirdPartyTracking()` once before `createRoot`. |

No tracking IDs were changed. `App.tsx` and feature `gtag("event", …)` call sites were not modified.

---

## Duplicate tracking removed

No duplicate tags existed. The new loader **prevents** double inject via `scheduled` / `gtagQueued` / `pixelQueued` flags and script element ids.

---

## Before / after initial HTML

**Before:** `<head>` started `gtag.js`, Pixel `fbevents.js`, and Clarity during HTML parse (async, but still on the critical network path).

**After (production `index.html`):** no `googletagmanager.com`, `connect.facebook.net`, or `clarity.ms` script URLs. Only:

- JSON-LD
- inline gtag **stub** (no network)
- first-party module + CSS (Vite default)
- noscript Pixel img

Vendor scripts are created at runtime after paint (GA/Pixel) or idle (Clarity).

Production HTML size: **7.73 KB → 6.21 KB** (gzip **2.73 → 2.10 KB**), from removing the inline third-party snippets.

First-party `index-*.js` grew **85.19 → 86.91 KB** (~1.7 KB) for the loader — far smaller than downloading the three vendor runtimes during parse.

---

## Production build result

**Success.** `vite build` completed. Built `index.html` contains the stub and first-party assets only. IDs `G-9BZPGSKKYE`, `AW-16608374468`, `618460890635684`, and `y8xb26d5ve` appear in the main JS chunk (loader), not as blocking `<head>` script `src`s.

Could not drive a real browser network waterfall in this environment; architecture was verified from the production HTML and the loader source.

---

## Could not / should not fully delay

| Item | Reason |
|---|---|
| **gtag stub in HTML** | Must exist as a real global so ES-module `gtag()` calls (OTP, form, UTM) queue instead of throwing. Zero network cost. |
| **Queueing GA config + Ads conversion at app start** | Delaying the *queue* until idle could miss page-view conversions on short visits. The *network* fetch of `gtag.js` is what we delay (until after paint). |
| **SPA route `page_view`s** | Never implemented. Adding them would change counts vs historical data. |

Clarity is the only tag fully deferred to idle, because nothing in the app emits Clarity or Ads/GA events through it.

Phase 3 stops here.
