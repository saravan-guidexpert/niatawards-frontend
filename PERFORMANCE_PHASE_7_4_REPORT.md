# Performance optimization — Phase 7.4 report

**Date:** 28 August 2026  
**Scope:** Reduce remaining initial-route JavaScript execution and TBT on `/`. Phases 1–7.3 were not reverted. Tracking IDs and the Phase 3 / 7.2 load strategy are unchanged. Viewport-gated homepage sections from Phase 7.3 are unchanged. Phase 7.5 was not started.

**Measured PSI / Lighthouse was not re-run.** The PageSpeed Insights API returned HTTP 429 (quota). There is no browser MCP in this session, and Playwright Chromium is not installed locally, so interactive Lighthouse was not run. Score claims below are architectural and production-build verification only. Baseline numbers are the ones supplied for this phase.

**Supplied PSI baseline (before 7.4; after 7.2, with 7.3 unmeasured):**

| | Performance | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|
| Mobile | 74 | 2.7 s | 2.9 s | 690 ms | 0 |
| Desktop | 83 | 0.7 s | 0.9 s | 370 ms | 0 |

Accessibility 100, SEO 100, Best Practices 58 (both). CLS 0.

---

## 1. Exact initial execution audit

Call chain on `/` (unchanged architecture, smaller modules after this phase):

1. `index.html` — gtag stub only; no Snap / Pixel / Clarity / gtag.js network scripts.
2. `main.tsx` — `scheduleThirdPartyTracking()` then `createRoot().render(<App />)`.
3. Tracking bootstrap (sync, before React): install stubs, queue GA4 config + Ads conversion + Pixel `PageView` + Snap `PAGE_VIEW`. Script tags for gtag / fbevents / scevent are scheduled on double `requestAnimationFrame`. Clarity on `requestIdleCallback` (`timeout: 2500`).
4. `App.tsx` — `BrowserRouter`, `ToastHost` (store subscriber only), `AuthProvider`, `UtmCapture`, skip link, `Routes` with eager `Index`.
5. `Index.tsx` — eager `Navbar`, `HeroSection`, `Footer`; four `ViewportLazySection` sentinels (observers, no `import()` until near viewport).
6. `Navbar` — `useAuth`, `Menu` / `X` icons, hash scroll.
7. `HeroSection` — countdown `setInterval(1000)`, nomination card, `useToast` dispatcher, static public API imports. OTP field and inline form remain `React.lazy()`.
8. `AuthProvider` — reads `localStorage` `niat_user` on init; `sendOtp` / `verifyOtp` are not called until the user submits.

**Downloaded and executed on first `/` load (after this phase):**

| Module | Why it runs |
|---|---|
| `vendor-react` | React, ReactDOM, scheduler, react-router |
| `index-*.js` | App, Index, Navbar, Hero, Footer, ViewportLazySection, Auth, public API client, UTM, funnel helper, toast *store*, tracking scheduler, homepage Lucide icons |
| CSS | Unchanged from 7.3 |

**Not downloaded until later:**

| Trigger | Chunks |
|---|---|
| Near viewport (or matching hash) | Why / HowItWorks / Winners / FinalCTA + `use-in-view` + those sections’ icons |
| Get OTP → OTP step | `MobileOtpField` + `input-otp` |
| OTP verified | `InlineNominationForm` |
| First `toast()` | `toaster` + Radix toast primitives + `clsx` / `tailwind-merge` (`utils-*.js`) |
| `/login`, `/admin`, `/thank-you`, 404 | Route chunks |
| Admin data calls | `apiAdmin-*.js` |

---

## 2. What each initial chunk contains

### Before (Phase 7.3 production build)

HTML `modulepreload`: `vendor-react`, `vendor-ui`, entry JS.

| Chunk | Min / gzip | Contents on `/` |
|---|---|---|
| `vendor-react` | 163.72 / 53.32 | React, ReactDOM, router, scheduler |
| `vendor-ui` | 26.83 / 5.71 | **62 Lucide icons** from the whole app (admin, OTP, below-fold, homepage) forced into one `manualChunks` bucket |
| `index-*.js` | 87.68 / 28.23 | App + landing + Auth + **Radix toast UI** + **every admin API path** (`whatsapp-ops`, `niat_admin_session`, promo/digital/users) + tracking + homepage icons’ consumers |

`vendor-ui` icon names included `EyeOff`, `GraduationCap`, `Trophy`, `Heart`, `Megaphone`, `Trash2`, and 50+ others that `/` never renders.

### After (this phase)

HTML `modulepreload`: **`vendor-react` only**. Entry script: `index-BHf_zS6P.js`.

| Chunk | Min / gzip | Contents on `/` |
|---|---|---|
| `vendor-react-By-XjgUq.js` | 163.72 / 53.32 | Unchanged |
| `index-BHf_zS6P.js` | **42.12 / 13.40** | App, Index, Navbar, Hero, Footer, viewport helper, Auth, public OTP/draft client, UTM, funnel, toast *memory store* + `ToastHost`, tracking, Lucide factory + **8 homepage icons only** (`Menu`, `X`, `Calendar`, `Sparkles`, `User`, `Phone`, `LoaderCircle`/`Loader2`, `CircleCheck`/`CheckCircle2`) |

No `vendor-ui` file. No `ToastProvider` / `data-radix` / `/api/admin/` / `niat_admin_session` / `whatsapp-ops` in the entry.

Tracking IDs still present in the entry (unchanged): `G-9BZPGSKKYE`, `AW-16608374468`, Pixel `618460890635684`, Snap `eaf0e62f-1796-47bd-8c5e-863aa746a9e3`, Clarity `y8xb26d5ve`.

---

## 3. What was unnecessarily executing or importing

Evidence from the 7.3 `dist` graph (not speculation):

1. **`manualChunks` dumped all Lucide into `vendor-ui`.** Homepage Navbar/Hero/App import `lucide-react`, so `/` **preloaded** that chunk. The chunk contained **62 icons**, not the 8 above-the-fold ones. Admin/OTP/section icons were therefore parsed on the landing page.

2. **Radix `<Toaster />` was mounted in `App` on every route**, including `/` with an empty toast list. That pulled `@radix-ui/react-toast` (DismissableLayer, Presence, Portal, Viewport) plus `class-variance-authority` and `cn()` / `tailwind-merge` into `index-*.js`. No toast is shown until validation or an API error.

3. **`src/lib/api.ts` was a barrel.** `AuthContext` and `HeroSection` import OTP/draft helpers, so the whole module evaluated on `/`, including `adminSession` and every admin endpoint string (WhatsApp ops, funnel, users, promo, digital). None of those functions run for an anonymous homepage visitor.

4. **Tracking bootstrap** runs before React by design (stubs + queued events). The work is a handful of function assignments and `dataLayer.push`. **Not changed** — no evidence it is a large first-party long task compared with React parse, and delaying it further would violate the “do not undo Phase 3 / 7.2” rule.

---

## 4. Every change made and why

| File | Change | Why |
|---|---|---|
| `vite.config.ts` | Removed `lucide-react` → `vendor-ui` `manualChunks` rule. Left `vendor-motion` and `vendor-react`. | Stopped `/` from downloading every icon in the app. |
| `src/components/ui/ToastHost.tsx` | **New.** Subscribes to `useToast()`; `lazy()`-loads `Toaster` only after `toasts.length > 0`. | Radix toast UI is interaction-only. |
| `src/App.tsx` | `<Toaster />` replaced with `<ToastHost />`. | Same as above. `Loader2` PageLoader kept (lazy-route fallback). |
| `src/lib/apiClient.ts` | **New.** Shared `ApiError` + `request()` with optional `onUnauthorized`. | Lets public and admin API live in different chunks without duplicating fetch logic. |
| `src/lib/api.ts` | Public OTP, draft, nomination, photo only. No `adminSession`. | Homepage no longer parses admin APIs. |
| `src/lib/apiAdmin.ts` | **New.** All `admin*` functions and admin types. 401 still clears admin session (except login, which still uses plain `request`). | Admin chunk only. |
| Admin pages/panels (7 files) | Imports switched from `@/lib/api` to `@/lib/apiAdmin`. | So Rollup does not pull `apiAdmin` into `/`. |

Not changed: `Index.tsx`, `ViewportLazySection.tsx`, `HeroSection.tsx`, `Navbar.tsx`, `Footer.tsx`, `thirdPartyTracking.ts`, `index.html`, fonts, images, Framer Motion, backend, tracking IDs/events.

---

## 5. Before / after JS sizes

Initial `/` JavaScript (HTML `modulepreload` + entry script):

| Asset | 7.3 min / gzip | 7.4 min / gzip |
|---|---:|---:|
| `index-*.js` | 87.68 / 28.23 | **42.12 / 13.40** |
| `vendor-react` | 163.72 / 53.32 | 163.72 / 53.32 |
| `vendor-ui` | 26.83 / 5.71 | **removed from `/`** |
| **Total initial JS** | **278.23 / 87.26** | **205.84 / 66.72** |

**Delta: −72.39 kB minified (−26%), −20.54 kB gzip (−24%).**

`index.html` 6.33 → 6.25 kB (lost one preload link). CSS unchanged (75.18 / 13.27).

Deferred (not initial):

| Chunk | Min / gzip | When |
|---|---|---|
| `toaster-*.js` | 13.74 / 4.83 | First toast |
| `utils-*.js` (clsx + tailwind-merge) | 20.47 / 6.94 | First toast or form |
| Radix helpers (`index-CNVdDhJa.js`, `index-Bmp1Y2Wl.js`) | 9.78+2.92 / 3.65+1.40 | First toast |
| `apiAdmin-*.js` | 7.48 / 2.73 | Admin routes |
| Why / HowItWorks / Winners / CTA | ~3–4 kB each | Viewport / hash |
| `vendor-motion` | 114.27 / 37.75 | Still not on `/` |
| `AdminPage` | 682.45 / 190.39 | `/admin` only |

---

## 6. Before / after initial network / request behavior

| | Phase 7.3 | Phase 7.4 |
|---|---|---|
| HTML `modulepreload` | `vendor-react`, `vendor-ui`, entry | **`vendor-react` only** |
| Lucide on first request | 62 icons in `vendor-ui` | 8 icons inlined in entry |
| Radix toast | Parsed/executed with App | `import()` on first `toast()` |
| Admin API module | Parsed with `/` | `apiAdmin` + Admin page |
| Below-fold sections | Viewport-gated (7.3) | Unchanged |
| OTP / form / photo / motion | Lazy | Unchanged |
| Tracking script injection | After first paint / idle | Unchanged |
| Preview `GET /` | — | One entry JS + one react preload + CSS; no `scevent` in HTML |

SPA routes (`/login`, `/admin-login`, `/nominate-student`) still return the same `index.html` (200). Their extra JS is requested only after the router matches.

---

## 7. Expected impact on TBT / FCP / LCP

**Not measured** (PSI 429; no Lighthouse run).

| Metric | Estimate (not a score) | Reasoning |
|---|---|---|
| **TBT (mobile)** | Should drop vs 690 ms, amount unknown | Less parse/compile/execute: −72 kB initial JS, no Radix toast, no 54 extra icons, no admin API evaluation. Remaining TBT: React 164 kB, Hero + countdown, post-paint gtag/Pixel/Snap (and later Clarity). Those third-party scripts still run after FCP by design. |
| **FCP / LCP** | Possible small improvement, not guaranteed | Less JS before first paint helps FCP if parse was on the critical path. LCP is still the hero heading/card (Phase 6 image work unchanged). |
| **CLS** | Should stay 0 | No layout/image/font changes. Toast UI still absent until an error/success toast. |
| **Best Practices** | Unchanged unless third-party audits change | No first-party BP work in this phase. |

Do not treat the −26% initial JS figure as a Lighthouse point estimate.

---

## 8. Risks or regressions checked

| Area | Check | Result |
|---|---|---|
| Viewport-gated sections | `280px` rootMargin and Why/HowItWorks still only in `__vite__mapDeps` | Preserved |
| Hash `#how-it-works` / `#prizes` | Sentinels still in `Index` | Unchanged code |
| Tracking IDs + `PAGE_VIEW` / conversion | Counted in entry JS | All five IDs present; Snap still not in HTML |
| Framer Motion on `/` | `vendor-motion` only in mapDeps | Not eager |
| Admin 401 logout | `adminRequest` calls `clearAdminSession` on 401; `adminLogin` uses plain `request` (no clear on login 401) | Same as previous `request()` path rules |
| First toast UX | Toaster chunk ~14 kB + utils ~20 kB after first `toast()` | Short delay possible before the first toast paints; later toasts reuse the chunk |
| `Loader2` PageLoader | Still in App for lazy routes | Unchanged |
| Production preview | `vite preview` `GET /` returns title + entry + react preload only | HTTP 200 |
| Typecheck via Vite | `npm run build` | Succeeded |
| Interactive nomination / admin / mobile menu | Playwright Chromium missing; no browser MCP | **Not exercised in a real browser this phase** |

---

## 9. Investigated but intentionally left unchanged

| Item | Evidence | Why left |
|---|---|---|
| Tracking stubs before `createRoot` | Tiny sync work; scripts already after paint | Instructions: do not undo 3 / 7.2; IDs must stay; no arbitrary delay |
| `AuthProvider` on `/` | Navbar + Hero `useAuth`; localStorage read only | Required for logged-in chrome and OTP |
| Public `api.ts` on `/` | Hero draft + Auth OTP are used on Get OTP (and on mount if already logged in) | Dynamic-import would add click latency for a small remaining module |
| `getNominationDraft` / photo upload living in `api.ts` | Same module as eager OTP/draft | Extra file split ~1 kB; not worth churn |
| Hero countdown `setInterval(1000)` | Isolated `HeroCountdown`; ticks after load | Not initial parse cost; memoizing would be speculative |
| Footer eager | Small, no Lucide | 7.3 left it eager; not a TBT driver vs React |
| Lucide → inline SVG | 8 homepage icons now ~inlined in 42 kB entry | Instructions: do not replace Lucide for theoretical savings |
| `vendor-react` 163.72 kB | Framework + router | Unavoidable without dropping React Router |
| Best Practices 58 | No new first-party Lighthouse JSON | 7.3 already found no remaining first-party `target=_blank` / deprecated meta |
| `#categories` missing on `Index` | Product gap | Out of scope |
| Admin 668→682 kB | Icons moved into Admin instead of `vendor-ui` | Correct; not on `/` |

---

## 10. Production build result

`npm run build` **succeeded** (Vite 5.4.19, 2.16s, 3692 modules).

Admin chunk-size warning remains (`AdminPage` 682 kB, not on `/`).

Preview: `GET /` serves `index-BHf_zS6P.js` + `modulepreload` `vendor-react-By-XjgUq.js` + CSS. No Snap script in HTML.

---

## Files changed

| File | Role |
|---|---|
| `vite.config.ts` | Stop Lucide mega-chunk |
| `src/App.tsx` | `ToastHost` |
| `src/components/ui/ToastHost.tsx` | New |
| `src/lib/apiClient.ts` | New |
| `src/lib/api.ts` | Public API only |
| `src/lib/apiAdmin.ts` | New |
| `src/pages/AdminPage.tsx` | Import path |
| `src/pages/AdminLoginPage.tsx` | Import path |
| `src/components/admin/CampaignsPanel.tsx` | Import path |
| `src/components/admin/DigitalMarketingPanel.tsx` | Import path |
| `src/components/admin/AccessManagementPanel.tsx` | Import path |
| `src/components/admin/FunnelAnalytics.tsx` | Import path |
| `src/components/admin/WhatsAppOpsPanel.tsx` | Import path |
| `PERFORMANCE_PHASE_7_4_REPORT.md` | This report |

---

## Expected visual or behavioral changes

- First paint of `/`: same Navbar, Hero, Footer, sentinels. No intended visual change.
- First validation/API toast: may appear a few hundred milliseconds later while `toaster-*.js` (and `utils` / Radix helpers) download. Subsequent toasts are instant.
- Admin / login / nomination: same UI; admin fetch helpers load with the admin route instead of the homepage.

Accessibility 100 / SEO 100 / CLS 0 were not re-measured; no a11y, SEO, or layout code was changed.

---

Phase 7.4 ends here. Do not start Phase 7.5 from this report.
