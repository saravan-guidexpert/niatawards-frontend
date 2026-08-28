# Performance optimization — Phase 7.5 report

**Date:** 28 August 2026  
**Scope:** Audit remaining initial `/` JavaScript execution, especially `vendor-react` (163.72 kB) and main-thread work that feeds mobile TBT. Phases 1–7.4 were not reverted. Tracking IDs and the Phase 3 / 7.2 schedule are unchanged. Viewport-gated sections (7.3) and Lucide/toaster/apiAdmin splits (7.4) are unchanged. Phase 7.6 was not started.

**Measured PSI / Lighthouse was not run.** PageSpeed Insights API returned HTTP 429 (quota). No browser MCP; Playwright Chromium is not installed. All numbers below are production-build / sourcemap composition unless marked otherwise.

The mobile 74 / TBT 690 ms and desktop 83 / TBT 370 ms figures are **pre-7.4 PSI**. They do not describe Phase 7.4 or 7.5.

---

## 1. Executive summary

`vendor-react` is not a junk drawer. A sourcemap byte attribution of the production chunk shows:

| Package | Share of `vendor-react` | Role on `/` |
|---|---:|---|
| `react-dom` (production) | **79%** (~129.5 kB) | Hydrate/render |
| `@remix-run/router` + `react-router` + `react-router-dom` | **13%** (~21.4 kB) | `BrowserRouter` / `Link` / `Routes` |
| `react` + `jsx-runtime` | **4.4%** (~7.3 kB) | Runtime |
| `scheduler` | **2.4%** (~3.9 kB) | React scheduling |

No Radix, no Framer Motion, no Lucide, no admin APIs, no unexpected third-party package is inside `vendor-react`.

The remaining **42.12 kB entry** is application code that actually renders on `/` (Hero ~33% of the entry, Navbar, Footer, tracking, Auth, public API, toast *store*, 8 Lucide icons). Route pages, toaster UI, OTP, form, and motion stay async.

**No application code was changed.** Splitting `vendor-react`, replacing React Router, deferring Auth, staggering Pixel/Snap, or viewport-gating Footer would either still download the same bytes on `/`, change tracking behavior, or alter above-the-fold / legal UI without a proven TBT win.

Initial `/` JS after 7.5 is **identical** to 7.4: **205.84 kB min / 66.72 kB gzip**.

---

## 2. Exact composition of `vendor-react`

Method: `vite build --sourcemap`, then map generated columns in `vendor-react-By-XjgUq.js` back to `sources` (not `sourcesContent` length). Shipping build does **not** include maps (`npm run build` default).

### Byte attribution (minified)

| Source | Bytes | % of chunk |
|---|---:|---:|
| `react-dom/cjs/react-dom.production.min.js` | 129 254 | 78.9% |
| `@remix-run/router/dist/router.js` | 9 097 | 5.6% |
| `react-router/dist/index.js` | 8 711 | 5.3% |
| `react/cjs/react.production.min.js` | 6 540 | 4.0% |
| `scheduler/cjs/scheduler.production.min.js` | 3 840 | 2.3% |
| `react-router-dom/dist/index.js` | 3 595 | 2.2% |
| `react/cjs/react-jsx-runtime.production.min.js` | 580 | 0.4% |
| package entry shims (`react`, `react-dom`, `jsx-runtime`, `client`, `scheduler`) | ~496 | 0.3% |

**Packages present:** `react`, `react-dom`, `scheduler`, `react-router`, `react-router-dom`, `@remix-run/router`.  
**Packages absent:** `@radix-ui/*`, `lucide-react`, `framer-motion`, `clsx`, `tailwind-merge`, app `src/`.

### Why each dependency is in the `/` graph

| Dependency | Why |
|---|---|
| `react` / `jsx-runtime` | `main.tsx` + every component |
| `react-dom` | `createRoot().render` |
| `scheduler` | imported by `react-dom` |
| `react-router-dom` | `App.tsx` static `BrowserRouter`, `Routes`, `Route`, `Navigate`, `useLocation`; `Navbar` / `Hero` / `Footer` static `Link` / `useNavigate` |
| `react-router` / `@remix-run/router` | implementation of `react-router-dom` v6.30.1 |

`manualChunks` assigns anything under `node_modules/react`, `react-dom`, `react-router`, or `scheduler` to this file. `@remix-run/router` does not match those path prefixes; Rollup still **merged** it into `vendor-react` because only that chunk imports it. That is correct (one request, not an extra preload).

Splitting router into `vendor-router` would still **download and execute it on `/`**. Extra HTTP request, same parse cost. Not done.

---

## 3. Full initial `/` import graph

```
index.html
  gtag stub (inline)
  module: index-*.js
  modulepreload: vendor-react-*.js
  stylesheet: index-*.css

main.tsx
  scheduleThirdPartyTracking()     // sync, then rAF / idle
  createRoot().render(<App />)
  index.css (already linked)

App.tsx
  BrowserRouter → ToastHost → AuthProvider → UtmCapture → skip link → Suspense → Routes
  Index          static
  other routes   lazyRoute() → import() only when that route renders
```

Entry sourcemap **app** files (executed as part of `index-*.js`):

`main.tsx`, `App.tsx`, `pages/Index.tsx`, `Navbar.tsx`, `HeroSection.tsx`, `Footer.tsx`, `ViewportLazySection.tsx`, `ToastHost.tsx`, `hooks/use-toast.ts`, `AuthContext.tsx`, `lib/api.ts`, `lib/apiClient.ts`, `lib/apiBase.ts`, `lib/utm.ts`, `lib/funnel.ts`, `lib/nominationDraft.ts`, `lib/thirdPartyTracking.ts`, plus 8 `lucide-react` icon modules.

**Not in the entry sourcemap:** `toaster.tsx`, `toast.tsx`, any `@radix-ui/*`, `InlineNominationForm`, `MobileOtpField`, `apiAdmin.ts`, `AdminPage`, `LoginPage`, landing Why/How/Winners/CTA, `framer-motion`.

`AdminPage` / `LoginPage` / `toaster` strings in the minified entry are **Vite `mapDeps` filenames** (the lazy factory table), not those modules’ code.

---

## 4. Required vs unnecessarily eager

Classification of every initial-graph module:

| Module | Class | Notes |
|---|---|---|
| react / react-dom / scheduler | **A** | Required immediately |
| react-router-dom + remix router | **A** | `BrowserRouter` + `Link` on Navbar/Hero/Footer |
| `Index`, `Navbar`, `HeroSection` | **A** | Above-the-fold |
| `Footer` | **A** (kept) | Below-fold but legal/nav links; 3.0 kB. Viewport-gating would drop it from first HTML/JS DOM for crawlers and needs a placeholder. Not changed. |
| `ViewportLazySection` × 4 | **A** | Observers only; children stay lazy |
| `AuthContext` + `useAuth` | **A** | Navbar user chip + Hero OTP |
| `api.ts` OTP + draft + `apiClient` | **A** / **B** | Parsed on `/`; **called** on Get OTP (or authenticated resume). Public barrel still includes `getNominationDraft` / `createNomination` / `uploadNominationPhoto` (~entry contains `/api/uploads/photo`) because they share the file with Hero/Auth imports. |
| `use-toast` store + `ToastHost` | **A** store / **D** UI | Store is ~1.2 kB; Radix `toaster-*.js` only after first `toast()` |
| `thirdPartyTracking.ts` | **A** stubs / post-paint scripts | Stubs + queue before React; network after paint |
| `utm.ts` + `UtmCapture` | **A** | `useEffect` after paint; module still in entry |
| `nominationDraft.ts` | **A** | `getDraftSession()` in Hero initial state (sessionStorage JSON) |
| `funnel.ts` | **B** | Imported by Auth; `fetch` only on OTP |
| Lucide 8 icons | **A** | Tree-shaken; `CheckCircle2` / `Loader2` used after step change but same Hero module |
| Why / How / Winners / CTA | **C** (viewport) | 7.3 observers |
| OTP / form / photo | **B** | `React.lazy` in Hero |
| Login / Admin / ThankYou / 404 | **C** | `lazyRoute` |
| Radix toast + `utils` (twMerge) | **D** | First toast |
| `apiAdmin` | **C** | Admin chunk |
| `vendor-motion` | **C** | Not on `/` |

**Accidentally eager (E), left in place:** unused *exports* of `api.ts` (`uploadNominationPhoto`, `createNomination`, `getNominationDraft`) live in the entry because they share a module with OTP/draft. Sourcemap: all of `api.ts` is **1.4 kB**. Splitting them would be a barrel cleanup of ~1 kB, not a TBT lever next to 129 kB of `react-dom`. Not done (micro-optimization).

Nothing else in `vendor-react` is accidental.

---

## 5. Router audit

Current setup is already appropriate for `/`.

| Check | Finding |
|---|---|
| Eager route **components** | Only `Index`. `LoginPage`, `NominatePage`, `ThankYouPage`, `AdminPage`, `AdminLoginPage`, `NotFound` use `lazyRoute` → `import()`. |
| `lazyRoute` reload-on-stale-chunk | Small helpers in `App.tsx`; does not pull route modules. |
| Guards | No admin/auth wrapper on `/`. Admin login check lives inside the lazy `AdminPage`. |
| `NominateRedirect` | Tiny `Navigate` in `App`; `/nominate` is not the homepage. |
| `future.v7_startTransition` | Already on. |
| Replace React Router | **Forbidden and not useful.** Router is 13% of `vendor-react`; `Link`/`BrowserRouter` are used on first paint. |

Leaving the router architecture unchanged.

---

## 6. Initial main-thread execution audit

**Before first paint (sync):**

1. HTML parse; inline gtag stub.
2. Load + parse `vendor-react` (163.72 kB) then `index-*.js` (42.12 kB).
3. `scheduleThirdPartyTracking()`: three tiny stubs, `dataLayer.push` of GA config + Ads conversion + Pixel `PageView` + Snap `PAGE_VIEW`; schedule double-rAF and `requestIdleCallback`.
4. `createRoot().render(<App />)`: React create/reconcile of Navbar + Hero + Footer + four sentinels.
5. `AuthProvider` lazy init: `localStorage.getItem("niat_user")` + optional `JSON.parse`.
6. Hero: `getDraftSession()` (`sessionStorage` JSON); `new Date()` for countdown; 10 particle style objects (module-level, already computed).

**Not found:** `getBoundingClientRect`, forced reflow, `JSON.parse` of large payloads, StrictMode (not mounted), layout measurement, duplicate providers.

**After paint (`useEffect`):**

| Work | Cost | Verdict |
|---|---|---|
| `UtmCapture` → `captureUtmParams()` | URLSearchParams; fetch only if UTM present | Leave |
| Auth `localStorage.setItem` / `removeItem` | Mirrors init state | Leave |
| Four `IntersectionObserver`s | Required by 7.3 | Leave |
| Countdown `setInterval(1000)` + `visibilitychange` | Isolated `HeroCountdown`; first tick ~1 s later | Leave — not parse cost; memoization would be speculative |
| Authenticated draft `persistDraft` | **Only if `niat_user` exists** | PSI-style anonymous visitor: no network |
| Tracking script inject (gtag, Pixel, Snap) | After two rAFs | See §7 |
| Clarity | Idle, `timeout: 2500` | See §7 |

`PageLoader` (`Loader2`) does not render on `/` (Index is eager). `Loader2` still lives in Hero.

No `useMemo`/`useCallback` sweep.

---

## 7. Third-party scheduling audit

Unchanged IDs:

- GA4 `G-9BZPGSKKYE`
- Ads `AW-16608374468` / conversion `AW-16608374468/EtKvCIHcoegcEMTdvu89`
- Pixel `618460890635684`
- Snap `eaf0e62f-1796-47bd-8c5e-863aa746a9e3`
- Clarity `y8xb26d5ve`

**Schedule today:** stubs + queued events **synchronously** (events cannot be lost if the user interacts before the vendor file arrives). `loadGtag`, `loadPixel`, `loadSnap` run in **one** double-`requestAnimationFrame` callback. Clarity on `requestIdleCallback` with **`timeout: 2500`**.

| Question | Answer |
|---|---|
| Are GA, Pixel, Snap injected together? | **Yes**, same after-paint callback. Three async downloads, then three parse/execute bursts on the main thread. That **can** concentrate TBT after FCP. |
| First-party scheduler cost? | Negligible vs `react-dom`. Duplicate gtag stub (HTML + `installGtagStub`) is defensive and tiny. |
| Stagger Pixel/Snap on idle? | Would likely **reduce bounce Pixel/Snap `PageView`** if the user leaves before idle. Violates “do not risk existing tracking behavior.” |
| Clarity `timeout: 2500` too aggressive? | Forces Clarity by 2.5 s even on a busy thread, inside a typical TBT window. Raising it delays Clarity on short sessions. **Not changed.** |

**Conclusion:** Phase 3 / 7.2 is still the right compromise. Remaining TBT after 7.4 is expected to be **`react-dom` hydrate + vendor tag execution**, not first-party scheduling mistakes.

---

## 8. Every code change and the evidence for it

**None.** Evidence said the remaining initial bytes are required (`react-dom`, router used on first paint, Hero/Navbar) or already deferred (7.3–7.4). No change met the bar of “proven useful” without replacing React/Router, undoing tracking, or micro-splitting ~1 kB barrels.

---

## 9. Investigated but intentionally NOT changed

| Item | Evidence | Why not |
|---|---|---|
| Split `vendor-react` vs `vendor-router` | Router ~21 kB inside the same chunk | Still eager on `/`; extra request |
| Replace React Router | 13% of vendor-react | Forbidden; `Link` on first paint |
| Replace React / Preact | `react-dom` 79% | Forbidden |
| Defer `AuthProvider` | Navbar + Hero `useAuth` | Would hide session chrome |
| Dynamic-import public `api.ts` on click | Auth/Hero still need it on Get OTP; ~2 kB | Click latency for little parse win |
| Split `uploadNominationPhoto` out of `api.ts` | Present in entry (`/api/uploads/photo`) | ~1 kB barrel; micro-opt |
| Viewport-gate Footer | 3.0 kB, below-fold | Legal links / possible CLS / visual change |
| Inline SVG instead of 8 Lucide icons | 4.5 kB of entry | Forbidden theoretical Lucide swap |
| Delay countdown interval | Effect already after paint | Visual freeze of seconds; speculative |
| Memoize Auth `value` | One mount render | Premature memo |
| Stagger Pixel/Snap or raise Clarity timeout | Same-rAF spike is real | Tracking loss risk |
| Reopen Phase 5 CSS | Hero DOM: 3 orbs + 10 particles, not a duplicate tree | No visual change |
| `autoFocus` on hero name | Not TBT | Appearance/UX |

---

## 10. Before / after chunk sizes

Phase 7.4 vs 7.5 **shipping** `npm run build` (no sourcemap): **same**.

| Asset | 7.4 min / gzip | 7.5 min / gzip |
|---|---:|---:|
| `index.html` | 6.25 / 2.18 | 6.25 / 2.18 |
| `index-*.css` | 75.18 / 13.27 | 75.18 / 13.27 |
| `index-BHf_zS6P.js` | 42.12 / 13.40 | 42.12 / 13.40 |
| `vendor-react-By-XjgUq.js` | 163.72 / 53.32 | 163.72 / 53.32 |
| **Initial JS total** | **205.84 / 66.72** | **205.84 / 66.72** |

No new initial chunks. `vendor-ui` still absent. `toaster`, `apiAdmin`, `vendor-motion`, section chunks unchanged.

Entry composition (sourcemap, for evidence — not a size change):

| Source | kB | % of entry |
|---|---:|---:|
| `HeroSection.tsx` | 14.0 | 33.3% |
| `Navbar.tsx` | 4.5 | 10.6% |
| Lucide (8 icons + factory) | 4.5 | 10.6% |
| `Footer.tsx` | 3.1 | 7.2% |
| `App.tsx` | 2.2 | 5.1% |
| `thirdPartyTracking.ts` | 2.0 | 4.8% |
| Auth + api + utm + toast store + rest | ~12 | ~28% |

---

## 11. Before / after initial network behavior

Unchanged from 7.4:

1. `index.html`
2. `index-*.css`
3. `index-BHf_zS6P.js` (entry)
4. **preload / static import:** `vendor-react-By-XjgUq.js` only

Then after paint: `gtag.js`, `fbevents.js`, `scevent.min.js`. Later: Clarity. On scroll/hash: section chunks. On OTP: `MobileOtpField`. On first toast: `toaster` + `utils` + Radix helpers.

---

## 12. Expected impact on TBT / FCP / LCP

| Metric | Measured this phase? | Estimate |
|---|---|---|
| Initial JS bytes | **Yes** (build) | No change vs 7.4 |
| TBT | **No** | Remaining mobile TBT is still dominated by **react-dom production** (~129 kB parse/hydrate) plus **gtag / Pixel / Snap** after FCP. 7.5 did not reduce those. 7.4’s −72 kB (Lucide dump, Radix, admin API) is the last first-party cut that was evidence-backed. |
| FCP / LCP | **No** | Unchanged architecture; hero still eager |
| CLS | **No** | No layout changes |

Do not treat “7.5” as a Lighthouse improvement. Do not apply the old 74 / 690 ms numbers to this build.

---

## 13. Regression checks and limitations

| Check | How | Result |
|---|---|---|
| `/` chunk graph | Production HTML + sourcemap | Entry + `vendor-react` only |
| Viewport / hash factories | `280px` and Why/HowItWorks in `mapDeps` | Preserved |
| Tracking IDs in entry | Counted in minified JS | All five present; Snap not in HTML |
| Motion / Radix / admin API on `/` | Grep entry | `framer-motion` 0, `@radix-ui` 0, `whatsapp-ops` 0 |
| Lazy routes | Sourcemap of entry has no `LoginPage.tsx` / `AdminPage.tsx` body | Only `mapDeps` names |
| Mobile nav, hash, OTP, first toast, login, admin, queues | Real browser | **Not run** (no Playwright browser, no MCP) |

Behaviors that need a human/browser pass after deploy: hamburger, `#how-it-works` / `#prizes`, Get OTP → toast chunk, login, admin, gtag/fbq/snaptr queues.

---

## 14. Production build result

`npm run build` **succeeded** (Vite 5.4.19, 2.06 s, 3692 modules). Admin chunk warning unchanged (682 kB, not on `/`).

A separate `--sourcemap` build was used only for §2–§4, then discarded in favor of the default (no map) output above.

---

Phase 7.5 ends here. Do not start Phase 7.6 from this report.
