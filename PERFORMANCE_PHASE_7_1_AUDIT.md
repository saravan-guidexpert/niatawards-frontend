# Performance optimization — Phase 7.1 audit

**Date:** 28 August 2026  
**Scope:** Investigation and reporting only. No application code was changed. Tracking IDs, Meta Pixel, GA, Ads, Clarity, and Snap Pixel were not removed. Phase 7.2 was not started.

**Method:** Static inspection of `frontend/` source, production `vite build` output, previous phase reports, and `npm audit`. **PageSpeed Insights was not re-run in this environment.** Score numbers below are the ones supplied for this phase. Findings that would require a live Lighthouse JSON / Issues panel dump are marked as such.

**Current PSI (provided):**

| | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | Speed Index | CLS |
|---|---|---|---|---|---|---|---|---|---|
| Mobile | 70 | 88 | 58 | 100 | 3.0 s | 3.6 s | 400 ms | 5.7 s | 0 |
| Desktop | 76 | 96 | 58 | 100 | 0.7 s | 0.8 s | 530 ms | 1.3 s | 0 |

CLS 0 and SEO 100 are treated as already healthy. The remaining work is Best Practices (58 both), Accessibility (especially mobile 88), TBT, and LCP timing.

---

## 1. Best Practices findings

Lighthouse Best Practices **58 on both form factors** is a strong signal that the failures are **shared document/runtime issues**, not mobile-only layout. This audit did not capture a Lighthouse JSON, so each row is **code evidence**, not a confirmed failed audit ID.

| Finding | File | Exact code/API | Likely Lighthouse impact | Confidence |
|---|---|---|---|---|
| Snap Pixel injects `scevent.min.js` during HTML parse | `index.html` (also production `dist/index.html`) | IIFE creates `<script async src="https://sc-static.net/scevent.min.js">`, then `snaptr('init', 'eaf0e62f-…')` + `snaptr('track', 'PAGE_VIEW')` | **Highest-probability cause of 58.** Third-party scripts commonly fail `errors-in-console` and Chrome **Issues** (third-party cookies, attributions, failed beacons). Also competes with first-party JS for bandwidth/main thread. Undoes Phase 3’s “no vendor `src` in initial HTML.” | **High** that it affects BP + TBT; **medium** that it alone explains 58 without a PSI dump |
| Deprecated Apple meta tag | `index.html` L7 | `<meta name="apple-mobile-web-app-capable" content="yes" />` | Chrome flags this as **deprecated** in favor of `mobile-web-app-capable` (already present on L6). Lighthouse **Avoids deprecated APIs** is a weighted Best Practices audit. | **High** for a deprecation warning; **medium** for how many points it costs |
| No `Content-Security-Policy` | `vercel.json` headers | HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` are set; **CSP is absent** | Lighthouse `csp-xss` is often **informative / unscored**. Do **not** treat this as proven cause of 58. | **Low** for score 58; real security gap regardless |
| Third-party cookies / Issues panel (GA, Ads, Pixel, Clarity, Snap) | `thirdPartyTracking.ts` + Snap in HTML | `gtag.js`, `fbevents.js`, `clarity.ms/tag/…`, `sc-static.net/scevent.min.js` | Chrome Issues for third-party cookies / related-website sets frequently fail **Issues were logged in the Issues panel**. Same score on mobile and desktop fits. | **High** that Issues fire; **medium** that they are scored (Lighthouse versions vary) |
| GA4 + Ads + Pixel still execute inside the lab window | `src/lib/thirdPartyTracking.ts` | `afterFirstPaint` → `loadGtag()` + `loadPixel()`; Ads conversion queued immediately via stub | Console / Issues from GTM/Facebook, not first-party `console.error`. Unlikely to be the *only* BP failure because Phase 3 already deferred them; Snap is the new head-blocking tag. | **Medium** |
| Clarity session script | `thirdPartyTracking.ts` `whenIdle` | `requestIdleCallback(..., { timeout: 2500 })` then `https://www.clarity.ms/tag/y8xb26d5ve` | Clarity often logs and records; timeout **forces** load by 2.5s, inside typical PSI TBT/Issues window | **Medium** for BP; **high** for TBT (see §3) |
| App `console.error` / `console.warn` | `InlineNominationForm.tsx` L392; `NotFound.tsx` L13–15 | `console.error("Nomination submit failed:", err)`; `console.warn` only if `import.meta.env.DEV` | **Not** on a successful `/` load. Should not fail PSI homepage unless the user hits submit-error or a 404. | **High** that these are *not* the homepage 58 |
| `document.write`, sync XHR, `unload` handlers | searched under `frontend/src` | None found | No first-party evidence for those BP audits | **High** (absence) |
| Source maps | `vite.config.ts`; `dist/` | No `sourcemap: true`; **zero** `.map` files in `dist/` | Lighthouse “valid source maps” is typically N/A or pass when maps are not published. Unlikely to fail. | **High** that maps are not the issue |
| Image aspect ratio (homepage) | `HeroSection.tsx` L246; `Navbar.tsx` L46–53 | Card logo: intrinsic WebP **259×326**, attributes **36×44** (`~0.794` vs `0.818`, ~3%). Nav lockup SVG **237×56** with CSS `h-8 w-auto` preserves ratio. | Lighthouse fails when displayed vs natural aspect differ by a large margin (often ~5%+). Homepage **probably passes**. | **Medium** (pass) |
| Image aspect ratio (not `/`) | `LoginPage.tsx` L70; `AdminPage.tsx` header | `niat-logo-tight.webp` (259×326) displayed as **36×36** / **20×20** | Would fail **if** those URLs were tested. PSI is homepage-only. | **High** for those pages; **none** for current `/` score |
| Manifest icon sizes | `public/manifest.json` | Claims `192×192` and `512×512` for `/niat-logo.png` which is **500×600** (Phase 6) | PWA / installable audits, **not** typically Best Practices scoring | **Low** for 58 |
| Vulnerable JS libraries | `package.json` / `npm audit` | Production: `react-router-dom@6.30.1` → `@remix-run/router` GHSA-2w69-qvjg-hvjx (open redirect). `lodash` is pulled by **recharts** (Admin chunk, not `/`). | Lighthouse `js-libraries` / retire.js only flags libraries it **detects in served JS**. Minified `vendor-react` did **not** contain a `6.30.1` version string. | **Low–medium** that PSI sees it; **do not** `npm audit fix` blindly in 7.2 without a lockfile review |
| Missing CSP / COOP | hosting | No `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` | Not required for this site; SharedArrayBuffer deprecations unlikely | **Low** |
| HTTP URLs in app | `apiBase.ts`, `vite.config.ts` | `http://localhost:5000` only in **dev** | Production API is HTTPS. No mixed-content from this. | **High** (not a prod BP fail) |
| `target="_blank"` without `rel` | `CampaignsPanel.tsx` some admin links | Homepage Footer/Hero Terms links **have** `rel="noopener noreferrer"` | Not on `/` | **High** (not homepage) |
| Vite `MutationObserver` | production `index-*.js` | Vite modulepreload polyfill observes `document` for `link[rel=modulepreload]` | Standard Vite; not “MutationObserver misuse.” Unlikely to be flagged. | **High** (not a finding) |
| Browserslist stale warning | build log | `caniuse-lite` 14 months old | Build-time warning only; not a runtime BP audit | **High** (not PSI) |
| Network 404s in first-party HTML | `dist/index.html` | Fonts, lockup, logo, CSS, `index` + `vendor-react` + `vendor-ui` modulepreloads | No obvious broken first-party URLs. Third-party 404s/ad-block would still show as console/network failures. | **Medium** |

**What is *not* claimed:** this environment did not open DevTools Issues or PSI “Diagnostics.” The **58 on both** form factors plus Snap in `<head>` is the strongest combined explanation.

---

## 2. Accessibility findings

PSI Accessibility **mobile 88 / desktop 96** means **at least one high-weight axe audit is mobile-only** (icon menu, closed-menu `aria-hidden`, tap targets), plus shared issues that keep desktop below 100.

Homepage live tree: `Navbar` + `HeroSection` (eager) + lazy below-fold sections (`WhySection`, `HowItWorksSection`, `WinnersReceiveSection`, `FinalCTASection`) + `Footer`. OTP/form/photo chunks are **not** in the initial graph; they matter after interaction or if the user is already authenticated.

| Issue | Component/file | Element | Exact problem | Likely mobile/desktop impact | Recommended fix |
|---|---|---|---|---|---|
| Icon-only control has no accessible name | `Navbar.tsx` L97–99 | `<button id="btn-nav-mobile-menu">` wrapping Lucide `Menu` / `X` | No `aria-label`, no visually hidden text. axe **button-name** (high weight). Hidden on `md+` via `md:hidden`. | **Primary explanation of 88 vs 96.** Desktop never exposes this button. | Add `aria-label={open ? "Close menu" : "Open menu"}` and `aria-expanded={open}` |
| Missing `aria-expanded` / `aria-controls` | `Navbar.tsx` | Same hamburger | Menu is a disclosure; not announced as expanded/collapsed | Mobile only | `aria-expanded={open}` + `aria-controls` pointing at the menu `id` |
| Focusable nodes inside `aria-hidden` | `Navbar.tsx` L104–107 | Menu `div` with `aria-hidden={!open}` containing `<a>` and `<button>` | When closed, `aria-hidden="true"` but links/buttons remain in the accessibility tree / tab order (`overflow: hidden` + `grid-template-rows: 0fr` does **not** remove tab stops). axe **aria-hidden-focus**. | **Mobile only** (menu markup is `md:hidden` but still in DOM) | When closed: `inert`, or `visibility: hidden` / `display: none`, or `tabIndex={-1}` on descendants; do not use `aria-hidden` while descendants are focusable |
| Nested interactive | `Navbar.tsx` L79–84, L118–128 | `<Link><button>Nominate…</button></Link>` | Invalid HTML; axe **nested-interactive**. Present on **desktop and mobile**. | Both; contributes to desktop 96 | Style the `Link` as the button; remove inner `<button>` |
| Form labels not associated | `HeroSection.tsx` `Field` L112–130 | `<label>` is a **sibling**, not wrapping the `<input>`; no `htmlFor` / `id` | axe **label**. Name and phone fields on the default `/` card. | **Both** (hero card is visible on desktop and mobile) | `htmlFor` + matching `id`, or wrap the input in `<label>` |
| OTP label not associated | `MobileOtpField.tsx` L17–19 | Sibling `<label>` “Enter 6-Digit OTP”; `InputOTP` has no `id` / `aria-labelledby` | Same **label** rule. **Not** on initial `/` unless OTP step is shown. | Neither for default PSI `/`; both after OTP | Associate label with the hidden OTP input (`aria-labelledby` / `htmlFor`) |
| Placeholder-only inputs | `InlineNominationForm.tsx` L469+ | Many `<input placeholder="…">` with no `<label>` | axe **label**. Lazy; only after auth/OTP. | Not default `/` | Visible `<label htmlFor>` per field |
| CustomSelect is an unlabeled combobox | `InlineNominationForm.tsx` `CustomSelect` L37–41 | `<button>` shows placeholder text; no `aria-expanded`, `aria-haspopup`, listbox | Partial name from button text; missing ARIA pattern. Lazy. | Not default `/` | `aria-expanded`, `aria-haspopup="listbox"`, label the control |
| Login phone/name unlabeled | `LoginPage.tsx` L95–98, L163 | Tel and name inputs: placeholder only | **label**. Lazy route `/login`. | Not PSI `/` | Labels / `aria-label` |
| Low contrast muted text | `HeroSection.tsx`, `Footer.tsx`, `FinalCTASection.tsx`, `HowItWorksSection.tsx` | `text-white/20`, `/30`, `/35`, `/40`, `/45`, `/55`, `/60` on ~`#0a0a0a` | Approximate contrast: white/20 ≈ **1.4:1**, /35 ≈ **2.5:1**, /55 ≈ **3.9:1** vs 4.5:1 AA for small text. Footer copyright and legal links are the worst. | **Both**, but more footer/legal text may sit in the **mobile** first screen after stack; desktop 96 suggests contrast is not the only gap | Raise muted text to ≥ `text-white/70` or a token that hits 4.5:1 |
| Low contrast helper on hero card | `HeroSection.tsx` L253, L275 | `text-white/55`, Terms `text-white/50` / `text-white/30` | Small text on dark glass card | Both | Darken/lighten until AA |
| Decorative images/icons announced | `HeroSection.tsx` orbs/particles; Lucide `Sparkles`, `Calendar`, `User`, `Phone` | Orbs have no `aria-hidden`; many icons sit next to text | Redundant announcement. Orbs/particles should be `aria-hidden="true"`. Icons beside visible text should be `aria-hidden`. | Both, usually **minor** (not a big score delta) | `aria-hidden` on decorative nodes |
| Hero card logo alt | `HeroSection.tsx` L246 | `alt="NIAT"` next to heading “Nominate Your Teacher” | Acceptable; slightly redundant. Not an empty-alt decorative case. | Both, low | Optional `alt=""` if purely decorative beside the heading |
| Heading hierarchy | `HeroSection` h1; lazy sections h2/h3 | Index has one `h1`. `#categories` is **not** on Index (`CategoriesSection` unused). | Order is valid if lazy sections mount. Nav “Categories” points at missing `id="categories"` (broken in-page link, not typically an a11y score fail). | Both, low for score | Restore section or retarget the nav hash (product, not PSI) |
| Duplicate IDs | homepage controls | Unique `btn-nav-*`, `btn-hero-*` | No duplicate IDs found on `/` | None | — |
| `role="main"` on `<main>` | `Index.tsx` L17 | Redundant, not invalid | None | Leave or drop `role` |
| Skip link | `App.tsx` L80–83 | Targets `#main-content`; valid | Bypass audit should pass | — |
| Closed toast close control | `toast.tsx` `ToastClose` | Icon `X`, no `aria-label`; Radix may expose “Close” | Viewport is empty until a toast fires | Unlikely on PSI `/` | Add `aria-label="Close"` if toasts appear in audits |
| Dialogs | `dialog.tsx` | Close has `sr-only` “Close”; used on admin, not homepage | Not `/` | — |
| How-it-works decorative number | `HowItWorksSection.tsx` L56 | `aria-hidden` on large “01” — correct | Desktop grid only | Fine |
| `niat-reveal` opacity 0 | below-fold sections | Content starts `opacity: 0` until in view | Hidden content is often skipped by contrast; once revealed, `text-white/55` still fails | After scroll / after lazy paint | Same contrast fix |
| Landmark / language | `index.html` `lang="en"` | Page is `en-IN` in JSON-LD/manifest | Minor; SEO is 100 | Optional `lang="en-IN"` |

**Not found on homepage:** empty `alt` on meaningful images; invalid ARIA roles in landing components; duplicate `id="main-content"` on `/` (only one). Login and Thank You duplicate `id="main-content"` **across routes**, never simultaneously.

---

## 3. Runtime / main-thread risks (application)

TBT **400 ms mobile / 530 ms desktop** remains after Phases 1–6. Desktop TBT **higher** than mobile is consistent with **more JS finishing inside the lab window** on a faster CPU (tracking + below-fold chunks), not with a single 1 Hz countdown.

| Source | What it does | TBT risk | Notes |
|---|---|---|---|
| `main.tsx` | `scheduleThirdPartyTracking()` then `createRoot` | Stubs are cheap; **script inject** is deferred (except Snap in HTML) | Snap is **not** in this loader |
| `AuthProvider` | Sync `localStorage.getItem` + `JSON.parse` on first render; write-back `useEffect` | **Low** | Tiny payload |
| `UtmCapture` | `captureUtmParams` on pathname/search | **Low** unless UTMs present (then `fetch` keepalive) | No UTMs on a clean PSI URL |
| `Toaster` + Radix toast | Mounted on every route | **Low–medium** | Extra radix runtime in `index-*.js` |
| `Index` | Eager `Navbar` + `HeroSection` + `Footer`; **four** `lazy()` sections inside `Suspense` immediately | **Medium–high** | `React.lazy` **starts the fetch as soon as Index renders**, not on scroll. `useInViewOnce` only gates CSS fade, not JS download. Chunks: Why 3.18 KB, HowItWorks 3.79, Winners 2.05, CTA 2.88, plus `use-in-view` 0.32 — small parse, but still extra tasks after FCP |
| `HeroSection` countdown | `setInterval` 1s → `setNow` → re-render 4 boxes; `key={value}` remounts digit | **Low** for TBT (short tasks) | Visibility pause is good. Remount animation is compositor/layout, not 400 ms JS |
| `QuickNominateCard` | `getDraftSession()` in `useState`; possible `createNominationDraft` if already authenticated | **Low** on anonymous PSI | Authenticated users skip OTP and **pull** `InlineNominationForm` + `vendor-motion` |
| `Field` / form handlers | Cheap | Low | — |
| Lucide on `/` | Navbar `Menu`/`X`; Hero `Calendar`, `Sparkles`, `User`, `Phone`, `Loader2`, `CheckCircle2` | Pulls **entire** `vendor-ui` **26.83 KB / 5.71 KB gzip** into the **initial** graph (modulepreloaded) | Expected; not a new regression |
| No scroll/resize listeners in `src/` | Searched | None first-party | `useInViewOnce` uses IntersectionObserver (cheap, one-shot) |
| Forced reflow | No read/write layout loops found | Low | Blur orbs are **paint/GPU**, not TBT |
| `HeroSection` particles (10) + orbs | CSS infinite animations | Not TBT; can hurt **Speed Index** / compositor | `prefers-reduced-motion` already disables them |
| `InlineNominationForm` | Framer Motion + lots of state | **High** but **lazy** until OTP/auth | `vendor-motion` 114 KB / 38 KB gzip |
| AdminPage | 668 KB / 187 KB gzip | Excluded from `/` | Confirmed |

---

## 4. Third-party runtime analysis

Phase 3 deferred GA, Ads, Pixel, Clarity. **Snap Pixel was later added back into `index.html` `<head>`** and is **not** in `thirdPartyTracking.ts`.

`requestIdleCallback(..., { timeout: 2500 })` is **not** “wait until the page is idle.” The timeout **guarantees** Clarity is injected by **2.5 seconds**, which sits inside PSI’s TBT window.

| Service | Load timing | Runtime impact risk | Needed for critical functionality? | Possible optimization |
|---|---|---|---|---|
| **GA4** `G-9BZPGSKKYE` | Stub in HTML (no network). Config + events queued in `scheduleThirdPartyTracking`. `gtag.js` after **double rAF** (after first paint) | **Medium–high** once downloaded (gtag + extra GA/Ads hits) | No — analytics only | Keep. Optionally delay inject until idle **without** a short timeout, or after first input. Do not drop the stub or IDs. |
| **Google Ads** `AW-16608374468` + conversion `…/EtKvCIHcoegcEMTdvu89` | Same gtag.js; conversion **queued immediately** (skipped only on `/admin*`) | Same as GA4; conversion beacon after script loads | No — ads measurement | Same as GA4. Conversion still fires on `/` as today. |
| **Meta Pixel** `618460890635684` | Stub + `PageView` queued at start; `fbevents.js` after first paint. Noscript 1×1 img in body | **Medium** (Facebook runtime) | No | Same deferral as GA. Do not remove Pixel. |
| **Microsoft Clarity** `y8xb26d5ve` | Idle callback, **max wait 2500 ms** | **High** (session replay, mutation observers, continual work) | No | Raise timeout substantially, or inject on first `pointerdown`/`scroll`/`keydown` (still load on every session, just later). Expect less complete early-session recordings. |
| **Snap Pixel** `eaf0e62f-1796-47bd-8c5e-863aa746a9e3` | **Immediate** in `<head>` via official snippet → `https://sc-static.net/scevent.min.js` | **Highest** of all tags: parse during initial HTML, competes with fonts + first-party modules, typical source of console/Issues | No — ads measurement | Move into `thirdPartyTracking.ts` with the **same after-paint (or idle) policy** as Pixel. Keep init + `PAGE_VIEW`. **Do not remove.** |

**Can any script run before meaningful interaction?** Yes: Snap (immediately); GA/Ads/Pixel (milliseconds after first paint, no user gesture); Clarity (by 2.5s even with no input).

---

## 5. Homepage initial execution graph (`/`)

```
index.html
  ├─ Google Fonts CSS (blocking stylesheet in <head>)
  ├─ JSON-LD
  ├─ gtag stub (no network)
  ├─ Snap Pixel IIFE → scevent.min.js (async, starts immediately)   ← should not be here for first paint
  ├─ modulepreload: vendor-react, vendor-ui
  ├─ index-*.js + index-*.css
  └─ noscript Pixel img (no-JS only)
→ main.tsx
  → scheduleThirdPartyTracking()
       stubs + queue GA config/Ads conversion/Pixel PageView
       afterFirstPaint → inject gtag.js + fbevents.js
       whenIdle (≤2.5s) → inject Clarity
  → createRoot
    → App
      → BrowserRouter
      → Toaster
      → AuthProvider          (localStorage read)
      → UtmCapture            (effect after paint)
      → skip link
      → Routes → Index        (eager, not lazy)
          → Navbar            Must execute before first paint (fixed header)
          → main#main-content
              → HeroSection   Must execute before first paint (LCP region)
                    QuickNominateCard (eager)
                    MobileOtpField        Already lazy (OTP step)
                    InlineNominationForm  Already lazy (after verify/auth)
              → Suspense
                    Why / HowItWorks / Winners / FinalCTA
                    lazy() but requested as soon as Index commits
          → Footer            Eager (below fold; JS still in index chunk)
```

| Item | Classification |
|---|---|
| Fonts CSS + first-party CSS/JS + Snap | Executes before / during first paint |
| AuthProvider, Router, Index, Navbar, Hero, Footer, Toaster | **Must execute before first paint** (current architecture) |
| GA/Pixel network | **Can execute after first paint** (already) |
| Clarity | **Can execute after first paint / on idle**; current timeout is too aggressive |
| Snap | **Can execute after first paint**; currently does not |
| Below-fold section chunks | **Can execute after first paint / near viewport**; currently fetch on Index mount |
| OTP / nomination form / photo / `vendor-motion` | **Can execute on interaction** (already lazy) |
| Login, Thank You, Admin, AdminLogin, NotFound | **Already lazy** |

**Executing on initial load that does not need to:** Snap Pixel; Clarity by 2.5s; below-fold landing section JS (animation-only sections); Google Ads conversion + GA config as soon as gtag.js arrives (product requirement — keep, but they are not needed for first paint).

---

## 6. Production bundle verification

Command: `npm run build` (Vite 5.4.19), 28 August 2026. **No strategy changes.**

### `dist/index.html` modulepreloads

```
/assets/index-BHVcXLSg.js          (entry module)
/assets/vendor-react-CmlBTYJ6.js
/assets/vendor-ui-D-9XRMw3.js
/assets/index-DxXFgpXT.css
```

No preload of `vendor-motion`, `AdminPage`, OTP, or form chunks.

### Exact production chunk sizes

| File | Minified | gzip |
|---|---|---|
| `index.html` | 6.98 kB | 2.47 kB |
| `index-DxXFgpXT.css` | 75.22 kB | 13.27 kB |
| `index-BHVcXLSg.js` | 85.98 kB | 27.68 kB |
| `vendor-react-CmlBTYJ6.js` | 163.72 kB | 53.32 kB |
| `vendor-ui-D-9XRMw3.js` | 26.83 kB | 5.71 kB |
| `vendor-motion-aIzCNUn1.js` | 114.27 kB | 37.75 kB |
| `AdminPage-DaTrlvAX.js` | 668.13 kB | 186.97 kB |
| `InlineNominationForm-CUQoxCrL.js` | 16.98 kB | 5.11 kB |
| `MobileOtpField-CyTykU03.js` | 11.64 kB | 4.66 kB |
| `TeacherPhotoUpload-CXHhTlW7.js` | 3.25 kB | 1.53 kB |
| `LoginPage-CWXgOE6K.js` | 7.98 kB | 2.53 kB |
| `ThankYouPage-DYNB1ckM.js` | 2.98 kB | 1.35 kB |
| `AdminLoginPage-B0gqbqKQ.js` | 4.50 kB | 1.70 kB |
| `NotFound-BA9JCIBv.js` | 1.30 kB | 0.69 kB |
| `WhySection-DdnQbtqF.js` | 3.18 kB | 1.44 kB |
| `HowItWorksSection-CzR0cfyg.js` | 3.79 kB | 1.43 kB |
| `WinnersReceiveSection-B1WApgAl.js` | 2.05 kB | 1.00 kB |
| `FinalCTASection-BDLEygVQ.js` | 2.88 kB | 1.22 kB |
| `use-in-view-CSmICpSD.js` | 0.32 kB | 0.25 kB |
| `NominatePage-BmBHtxAx.js` | 0.33 kB | 0.25 kB |
| `label-CJjZE4u9.js` | 2.71 kB | 1.07 kB |
| `cloudinaryUrl-a6SotC1D.js` | 0.42 kB | 0.29 kB |

**Initial JS for `/` (modulepreloaded + entry):** `vendor-react` + `vendor-ui` + `index` ≈ **276.5 kB** minified / **86.7 kB** gzip, plus CSS **75.22 / 13.27**.

### Checks requested

| Check | Result |
|---|---|
| `vendor-motion` excluded from `/` | **Yes.** Only imported by lazy form/login/thank-you/404/admin-login. Not in `index.html` preloads. |
| `AdminPage` excluded from `/` | **Yes.** |
| OTP / form / photo remain lazy | **Yes.** Listed in `__vite__mapDeps` on the index chunk as dynamic imports. |
| Third-party scripts absent from initial HTML | **No.** `sc-static.net/scevent.min.js` is in HTML. GA/Pixel/Clarity URLs are still absent (Phase 3 intact). gtag **stub** remains (no network). |
| Unexpected dependency on `/` | **No new vendor.** `vendor-ui` is expected (Lucide). Snap is the unexpected **runtime** on the critical path. |
| Source maps | None emitted. |

---

## 7. LCP candidate analysis

No Lighthouse trace was captured here. Candidates are from DOM/CSS (same reasoning as Phase 6, with animation timing spelled out).

**There is still no large hero bitmap.** Backgrounds are gradients + blurred orbs.

| Candidate | Why it could be LCP | Could its paint be delayed? | Evidence |
|---|---|---|---|
| Hero `<h1>` (“NIAT Guru Ratna Awards 2026”) | Largest text in the first viewport on mobile; `text-4xl` / `lg:text-6xl` on desktop | **Yes.** Parent is `overflow-hidden`. Animation `niat-hero-title`: `transform: translateY(80px) → 0`, duration **0.7s**, delay **0.1s**, `fill-mode: both`. For ~100 ms the title sits 80px down and is **clipped**. Full rest position at ~**0.8s**. Animation is transform-only (not opacity), so some ink may paint while clipped. | `HeroSection.tsx` L349–357; `index.css` `@keyframes niat-hero-title`, `.niat-hero-title` |
| Hero subtitle / badge | Smaller than h1 | Yes — `niat-fade-up` / `niat-fade-in` start at **opacity: 0** (0.5–0.6s) | `index.css` `.niat-fade-up`, `.niat-fade-in` |
| Nomination card (right column) | Large painted box; on mobile it sits **below** the h1 | **Yes, strongly.** `.niat-hero-right` starts `opacity: 0` + `translateX(40px)`, delay **0.3s**, duration **0.8s** (`both`). Card is invisible until ~0.3s and not fully opaque until ~1.1s. Unlikely first LCP; could become LCP **after** the heading if Chrome updates the candidate. | `HeroSection.tsx` L379; `index.css` `.niat-hero-right` |
| Card logo `/niat-logo-tight.webp` | 36×44, 7.7 KB | Delayed with the right column (opacity 0) | Phase 6; too small to be a good LCP |
| Navbar lockup SVG | Always visible; 32px/40px tall | Unlikely LCP (small area). Could be an **early** LCP if the h1 is still clipped | `Navbar.tsx`; no `fetchPriority` (removed in Phase 6) |
| Web fonts (Inter / DM Sans) | `display=swap` via Google CSS in `<head>` | **Yes.** Late font swap can change text LCP. Fonts compete with Snap + first-party JS | `index.html` fonts.googleapis.com stylesheet |
| Countdown digits | Medium text in right column | Delayed with `niat-hero-right`; digits also `niat-fade-up` with delays 0.7–1.0s | `HeroSection.tsx` `CountdownBox` |

**Mobile 3.6 s LCP vs 3.0 s FCP:** a 0.6 s gap is consistent with (a) heading clip/animation, (b) webfont, (c) Snap/gtag competing, or (d) LCP element switching — **not proven** without a trace.

**Desktop 0.8 s LCP** vs **0.7 s FCP:** heading animation (~0.8 s to rest) lines up with desktop LCP if the h1 is the candidate. Do **not** change the animation in 7.1.

---

## 8. Ranked recommended fixes

Do not implement in this phase. Do not remove tracking. Verify with PSI + a local Lighthouse run after any 7.2 change.

### Priority 1 — Directly likely to improve Lighthouse score

**1. Defer Snap Pixel the same way as Meta Pixel (keep ID and PAGE_VIEW)**  
- **Expected benefit:** Best Practices 58 (console/Issues), TBT, less contention with LCP/fonts. Restores Phase 3 HTML invariant.  
- **Risk:** Snap may miss a few hundred ms of PAGE_VIEW on bounce; usually acceptable.  
- **Files:** `index.html`, `src/lib/thirdPartyTracking.ts`, `src/main.tsx` (only if the schedule function is extended).  
- **Behavior change:** Load timing only, not event payload.  
- **Browser verification:** Yes — PSI Best Practices + Network (no `scevent.min.js` in initial HTML; script appears after paint).

**2. Remove deprecated `apple-mobile-web-app-capable`**  
- **Expected benefit:** Clears **Avoids deprecated APIs** if that audit is failing. `mobile-web-app-capable` already exists.  
- **Risk:** Negligible on modern iOS (Apple still documents the apple-prefixed name; removing it is the Chrome-facing fix).  
- **Files:** `index.html`  
- **Behavior change:** None for Chrome; iOS PWA “capable” still set via the non-deprecated meta.  
- **Browser verification:** Yes — Issues panel / Best Practices.

**3. Confirm with one PSI/Lighthouse JSON before more BP work**  
- **Expected benefit:** Avoids guessing among Issues vs deprecations vs libraries.  
- **Risk:** None (measurement).  
- **Files:** none  
- **Behavior change:** No  
- **Browser verification:** Yes (this *is* the verification).

### Priority 2 — Likely to reduce TBT / runtime work

**4. Soften Clarity `timeout: 2500`**  
- **Expected benefit:** Lower TBT (Clarity observers/replay). Desktop TBT 530 may drop if replay starts later.  
- **Risk:** Early-session recordings incomplete; product already accepted a delay in Phase 3.  
- **Files:** `src/lib/thirdPartyTracking.ts`  
- **Behavior change:** Recording start time only.  
- **Browser verification:** Yes — Performance panel + PSI TBT.

**5. Optionally delay GA/Pixel inject until idle or first input (stubs stay)**  
- **Expected benefit:** Extra TBT headroom after Snap is fixed.  
- **Risk:** Ads conversion and GA page_view fire later; bounces under ~1s may under-count. Product-sensitive.  
- **Files:** `thirdPartyTracking.ts`  
- **Behavior change:** Timing of beacons.  
- **Browser verification:** Yes — Network + Ads diagnostics.

**6. True below-fold code split (import when near viewport)**  
- **Expected benefit:** Small; those chunks are ~12 kB gzip combined. May shave a long task after FCP.  
- **Risk:** Brief empty placeholders (already have `SectionLoader`).  
- **Files:** `src/pages/Index.tsx` (wrapper), possibly a tiny `lazyOnView` helper.  
- **Behavior change:** Sections appear a frame later on fast connections.  
- **Browser verification:** Yes — homepage scroll.

**7. Do not pull `vendor-motion` for anonymous `/`** — already true. No change unless auth-on-load is common in PSI (it is not).

### Priority 3 — Accessibility fixes

**8. Name + expand/collapse the mobile menu; fix `aria-hidden` + focus**  
- **Expected benefit:** Best chance to close the **88 → 96** gap.  
- **Risk:** Low.  
- **Files:** `Navbar.tsx`, maybe `index.css` (use `inert` / `visibility`).  
- **Behavior change:** SR/keyboard only.  
- **Browser verification:** Yes — mobile VoiceOver/TalkBack + axe.

**9. Replace `Link > button` with a single control**  
- **Expected benefit:** nested-interactive; helps desktop 96.  
- **Risk:** Low if styles are copied.  
- **Files:** `Navbar.tsx`  
- **Behavior change:** None if href/styling preserved.  
- **Browser verification:** Yes.

**10. Associate hero `Field` labels with inputs**  
- **Expected benefit:** axe **label** on the default homepage card.  
- **Risk:** Low.  
- **Files:** `HeroSection.tsx`  
- **Behavior change:** None visual if layout kept.  
- **Browser verification:** Yes.

**11. Raise muted foreground contrast (footer, legal, hero helpers)**  
- **Expected benefit:** color-contrast on both form factors.  
- **Risk:** Visual design (lighter gray → more visible).  
- **Files:** `Footer.tsx`, `HeroSection.tsx`, possibly `FinalCTASection.tsx` / `HowItWorksSection.tsx`  
- **Behavior change:** Appearance of secondary text.  
- **Browser verification:** Yes — both viewports.

**12. Labels on Login + InlineNominationForm + OTP (not required for `/` PSI)**  
- **Expected benefit:** Those routes’ a11y.  
- **Risk:** Low.  
- **Files:** `LoginPage.tsx`, `InlineNominationForm.tsx`, `MobileOtpField.tsx`  
- **Behavior change:** None if placeholders remain as hints.  
- **Browser verification:** Yes on those routes.

### Priority 4 — Cleanup with uncertain PSI impact

**13. Manifest / login image aspect / unused `CategoriesSection` vs `#categories`**  
- **Expected benefit:** PWA correctness; login a11y; nav hash works. Unlikely to move homepage Performance 70.  
- **Risk:** Low.  
- **Files:** `manifest.json`, `LoginPage.tsx`, `Index.tsx` / `Navbar.tsx`  
- **Behavior change:** Nav “Categories” currently goes nowhere.  
- **Browser verification:** Partial.

**14. CSP header**  
- **Expected benefit:** Security; Lighthouse CSP audit may stay informative.  
- **Risk:** High if Pixel/GA/Snap/Clarity/fonts/Cloudinary are not allowlisted correctly.  
- **Files:** `vercel.json`  
- **Behavior change:** Possible breakage of tracking or images.  
- **Browser verification:** **Required.**

**15. React Router advisory bump**  
- **Expected benefit:** Only if Lighthouse detects the library. Open-redirect GHSA is real but may not appear in PSI.  
- **Risk:** Router minor upgrades can change behavior.  
- **Files:** `package.json` / lockfile  
- **Behavior change:** Possible.  
- **Browser verification:** Full regression.

**16. Hero title animation**  
- **Expected benefit:** If LCP is the clipped h1, removing delay/`overflow-hidden` could cut LCP toward FCP.  
- **Risk:** Visual; user asked **not** to change this in 7.1.  
- **Files:** `index.css`, `HeroSection.tsx`  
- **Behavior change:** Motion.  
- **Browser verification:** **Required** (LCP element in Performance panel).

---

## Out of scope (explicit)

- Phase 7.2 implementation  
- Removing GA, Ads, Meta Pixel, Clarity, or Snap  
- Changing tracking IDs  
- UI/business logic changes  
- Dependency removal  

**Stop.** This file is the Phase 7.1 deliverable.
