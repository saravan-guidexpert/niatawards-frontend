# Performance optimization — Phase 1 report

**Date:** 28 August 2026  
**Scope:** Route-level and component-level code splitting only. No UI, styling, business logic, API, Framer Motion, or dependency changes.

---

## Files changed

| File | Change |
|---|---|
| `src/components/landing/HeroSection.tsx` | `MobileOtpField` and `InlineNominationForm` loaded with `React.lazy()` + `Suspense` |
| `src/components/nomination/InlineNominationForm.tsx` | `TeacherPhotoUpload` loaded with `React.lazy()` + `Suspense` on form step 2 |

`src/App.tsx` was inspected and **not modified**. Non-home routes were already lazy.

---

## What was previously eagerly loaded

- **`App.tsx`** statically imported `Index` (landing). Other routes already used `lazyRoute()`: `NominatePage`, `ThankYouPage`, `AdminPage`, `AdminLoginPage`, `LoginPage`, `NotFound`.
- **`Index`** statically imported `HeroSection`, which statically imported:
  - `InlineNominationForm` (full two-step nomination form)
  - `MobileOtpField` (`input-otp` widget)
- **`InlineNominationForm`** statically imported `TeacherPhotoUpload`.

Those three modules therefore sat in the main `index-*.js` chunk and downloaded on every visit to `/`.

---

## What is now lazy loaded

| Feature | When the chunk loads | New chunk (minified / gzip) |
|---|---|---|
| OTP widget (`MobileOtpField` + `input-otp`) | User reaches the OTP step (after “Get OTP”) | `MobileOtpField-*.js` — 11.71 KB / 4.69 KB |
| Full nomination form (`InlineNominationForm`) | User reaches the form (OTP verified, or already authenticated) | `InlineNominationForm-*.js` — 17.05 KB / 5.12 KB |
| Photo upload (`TeacherPhotoUpload`) | User reaches form step 2 | `TeacherPhotoUpload-*.js` — 3.24 KB / 1.51 KB |

Fallbacks reserve height (OTP field, photo dropzone) or a matching empty card (nomination form) so the hero column does not collapse.

Admin and other non-home routes remain lazy; they are **not** in `index.html` modulepreloads.

---

## Before and after production bundle sizes

Builds: previous audit (`vite build` to `/tmp/niat-perf-audit`) vs Phase 1 (`vite build` to `/tmp/niat-perf-phase1`).

### Initial `/` graph (`index.html` modulepreload + entry)

| Asset | Before (min / gzip) | After (min / gzip) |
|---|---:|---:|
| `index-*.js` (app + landing hero) | 183.28 KB / 57.85 KB | **153.25 KB / 49.11 KB** |
| `vendor-react` | 162.78 KB / 53.14 KB | 162.78 KB / 53.14 KB |
| `vendor-motion` | 123.12 KB / 41.13 KB | 123.12 KB / 41.13 KB |
| `vendor-ui` | 26.83 KB / 5.71 KB | 26.83 KB / 5.71 KB |
| `vendor-query` | 25.19 KB / 7.78 KB | 25.19 KB / 7.78 KB |
| CSS | 93.47 KB / 15.79 KB | 93.49 KB / 15.80 KB |

**Main landing JS chunk:** −30.03 KB minified (−8.74 KB gzip), about **−16% / −15%**.

**Eager first-party JS on `/`:** 521.20 KB → **491.17 KB** minified (166.61 KB → **157.87 KB** gzip).

### Confirmed split (not in initial homepage bundle)

| Chunk | After (min / gzip) | In `index.html` preload? |
|---|---:|---|
| `AdminPage-*.js` | 640.55 KB / 176.75 KB | No |
| `InlineNominationForm-*.js` | 17.05 KB / 5.12 KB | No |
| `MobileOtpField-*.js` | 11.71 KB / 4.69 KB | No |
| `TeacherPhotoUpload-*.js` | 3.24 KB / 1.51 KB | No |

Grep of the main `index-*.js` chunk found none of: `Enter 6-Digit OTP`, `What's special about this teacher`, `Add a photo of the teacher`, `Admin Dashboard`.

The production build completed successfully.

---

## Components that could not be lazy loaded (and why)

| Component | Why it stays eager |
|---|---|
| `Index` (landing page) | Required for first paint of `/`. Making it `lazy()` would add a request waterfall and the existing full-page `PageLoader` on the homepage. |
| `HeroSection`, `Navbar`, `Footer` | Above-the-fold (or chrome) on `/`. |
| Name / phone card inside `QuickNominateCard` | Visible in the initial viewport; only OTP + full form were deferred. |
| `AuthProvider`, toasters, `TooltipProvider`, React Query | Mounted in `App.tsx` for every route. Dependency removal is out of Phase 1. |
| `framer-motion` (`vendor-motion`) | Hero/navbar still import it. Motion work is a later phase. |
| `src/lib/api.ts` (including draft helpers used on “Get OTP”) | Already pulled in by `AuthContext` (`apiSendOtp` / `apiVerifyOtp`). Splitting the API module would be an unrelated refactor. |

---

## Limitations / notes

1. **Authenticated returning visitors** still start on the name/phone step, then switch to the form (existing behavior). The form chunk then loads; a same-sized empty card is shown until it arrives.
2. **`LoginPage`** still statically imports `MobileOtpField`. That page is already a lazy route, so this does not affect the `/` bundle. Vite emits a shared OTP chunk used by both Login and the hero OTP step.
3. **`AdminPage` was already route-lazy** before this phase. This work confirms it stays out of the homepage preload list; its 641 KB size is unchanged (admin panel splitting is not Phase 1).
4. Below-fold landing sections (`WhySection`, etc.) were already `lazy()`; unchanged.

Phase 1 stops here. No further optimization phases were started.
