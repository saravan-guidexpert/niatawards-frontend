# Performance optimization — Phase 7.3 report

**Date:** 28 August 2026  
**Scope:** Viewport-gated homepage sections; inspect remaining initial JS; Best Practices only where first-party evidence exists. Tracking IDs and load strategy unchanged. Phase 7.4 was not started.

**Measured PSI was not re-run here.** The PageSpeed Insights API returned HTTP 429 (quota). Score claims below are architectural/build verification only. Baseline numbers are the ones supplied for this phase.

**Supplied PSI baseline (before 7.3):**

| | Performance | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|
| Mobile | 74 | 2.7 s | 2.9 s | 690 ms | 0 |
| Desktop | 83 | 0.7 s | 0.9 s | 370 ms | 0 |

Accessibility 100, SEO 100, Best Practices 58 (both). CLS 0.

---

## 1. Exact files changed

| File | Change |
|---|---|
| `src/pages/Index.tsx` | Stopped rendering four `lazy()` sections inside one mount-time `Suspense`. Each section is wrapped in `ViewportLazySection`. |
| `src/components/landing/ViewportLazySection.tsx` | **New.** Per-section `IntersectionObserver` (`rootMargin: 280px 0px`). Hash deep-link loads that one section immediately. |
| `src/components/landing/HowItWorksSection.tsx` | Removed `id="how-it-works"` (moved to the sentinel so the id is not duplicated when the chunk mounts). |
| `src/components/landing/WinnersReceiveSection.tsx` | Removed `id="prizes"` (same reason). |
| `PERFORMANCE_PHASE_7_3_REPORT.md` | This report. |

Not changed: `thirdPartyTracking.ts`, `index.html`, fonts, images, Framer Motion, hero animations, backend, tracking IDs.

---

## 2. Which homepage sections were previously fetched immediately

`Index` statically imported `Navbar`, `HeroSection`, and `Footer` (eager).

It also declared:

```ts
const WhySection = lazy(() => import("@/components/landing/WhySection"));
const HowItWorksSection = lazy(() => import("@/components/landing/HowItWorksSection"));
const WinnersReceiveSection = lazy(() => import("@/components/landing/WinnersReceiveSection"));
const FinalCTASection = lazy(() => import("@/components/landing/FinalCTASection"));
```

and **rendered all four inside a single `<Suspense>` as soon as `Index` mounted**.

`React.lazy()` only defers *parse of the parent module*; `import()` runs on **first render** of the lazy component. Because those four were children of the initial tree, the browser requested:

- `WhySection-*.js`
- `HowItWorksSection-*.js`
- `WinnersReceiveSection-*.js`
- `FinalCTASection-*.js`
- `use-in-view-*.js` (shared dep of those sections)

immediately after the main `index-*.js` executed — still on the homepage’s initial request chain, even though they were “lazy.”

Navbar and Hero were never in that false-lazy set.

---

## 3. Which sections are now deferred until viewport approach

Independent observers (not one batch):

| Section | Sentinel | When `import()` runs |
|---|---|---|
| Why This Exists | `min-h` 36rem, `bg-[#0a0a0a]` | Near viewport **or** (no hash) |
| How Teachers Are Selected | `id="how-it-works"`, 40rem, same bg | Near viewport **or** `location.hash === #how-it-works` |
| What Winners Receive | `id="prizes"`, 24rem, `bg-[#060606]` | Near viewport **or** `#prizes` |
| Final CTA | 28rem, `bg-[#0a0a0a]` | Near viewport |

`rootMargin` is **`280px 0px`**: start the chunk before the user arrives, without treating the entire rest of the page as “close.”

Navbar hash clicks still work: `#how-it-works` / `#prizes` live on the sentinels even before the chunk loads, so `querySelector` + `scrollIntoView` find a node; the observer then mounts the section as it approaches.

`#categories` is still missing from `Index` (unchanged product gap).

**Desktop caveat:** Hero is `min-h-screen`, so Why’s top sits at ~100vh. A 280px rootMargin can make **Why** intersect on large desktops on first paint. How It Works / Prizes / CTA stay further down and should not. Mobile PSI (tall stacked hero) should keep Why off the initial chain.

---

## 4. Before / after initial chunk behavior

| | Phase 7.2 (false lazy) | Phase 7.3 |
|---|---|---|
| HTML `modulepreload` | `vendor-react`, `vendor-ui`, entry JS | **Same set** — no section chunks |
| When Why / HowItWorks / Winners / CTA `import()` runs | On `Index` commit | When that sentinel intersects (or matching hash) |
| `use-in-view` | Fetched with the four sections on mount | Fetched with the **first** section that actually mounts |
| OTP / form / photo / motion / Admin | Already interaction/route lazy | Unchanged |

Vite still lists those files in `__vite__mapDeps` on `index-*.js` (the factories live there). That is not a network request. Requests start only when `import()` is invoked.

---

## 5. Initial homepage JS chunks after the change

Production `npm run build` (Vite 5.4.19). `dist/index.html` preloads:

| Asset | Minified | gzip |
|---|---|---|
| `index.html` | 6.33 kB | 2.20 kB |
| `index-DfQ_NB_5.css` | 75.18 kB | 13.27 kB |
| `index-BIZceLhu.js` | **87.68 kB** | **28.23 kB** |
| `vendor-react-CmlBTYJ6.js` | 163.72 kB | 53.32 kB |
| `vendor-ui-D-9XRMw3.js` | 26.83 kB | 5.71 kB |

**Initial JS total:** 278.23 kB min / 87.26 kB gzip.

Phase 7.2 `index-*.js` was 86.73 / 27.91. Delta **+0.95 / +0.32 kB** for `ViewportLazySection` (observer + sentinels).

Not preloaded (still async deps): Why 3.18, HowItWorks 3.77, Winners 2.03, FinalCTA 2.88, `use-in-view` 0.32, `vendor-motion` 114.27, Admin 668.13, OTP 11.67, form 18.88, photo 3.30, Login, ThankYou, etc.

No GA / Pixel / Snap / Clarity `<script src>` in HTML (gtag stub only; Snap URL only inside `index-*.js`).

---

## 6. Whether any unintended chunks remain eager

| Chunk | Eager on `/`? |
|---|---|
| `vendor-react` | Yes — required |
| `vendor-ui` (Lucide used by Navbar + Hero) | Yes — required with current hero/nav icons |
| `index-*.js` (App, Auth, toast/radix, Navbar, Hero, Footer, tracking loader, viewport helper) | Yes |
| Why / HowItWorks / Winners / CTA / `use-in-view` | **No** until IO (Why may still fire IO immediately on short desktop hero — see §3) |
| `vendor-motion` | No |
| Admin / Login / ThankYou / OTP / form / photo | No |

Footer remains in `index-*.js` (never a `lazy()` section). Out of scope.

No accidental pull of Admin, Framer Motion, or form chunks onto `/`.

---

## 7. Exact Best Practices issues found

Could **not** download a Lighthouse JSON for `https://www.niatawards.in/` (PSI API 429).

User-visible candidates called out for this phase:

### Uses deprecated APIs

Searched `frontend/src` and `index.html` for first-party `document.write`, `unload` / `beforeunload`, sync XHR, `apple-mobile-web-app-capable` (already removed in 7.2). **No remaining first-party match.**

`apple-mobile-web-app-status-bar-style` is still present; it is not the same Chrome deprecation as `apple-mobile-web-app-capable`. It was **not** removed (no evidence it is the failing API).

Vite’s modulepreload polyfill still uses `MutationObserver` in `index-*.js` (standard Vite). Not a deprecated Mutation Event.

Likely remaining deprecation noise, if PSI still fails this audit: **third-party** `gtag.js` / `fbevents.js` / `scevent.min.js` / Clarity after first paint. Those were not changed (instructions: do not alter tracking strategy without exact URL/API evidence).

### Links to cross-origin destinations are unsafe (`target="_blank"` without `noopener`)

Homepage `/` live links:

| Location | `target="_blank"` | `rel` |
|---|---|---|
| Hero Terms / Privacy | yes | `noopener noreferrer` |
| Footer Privacy / Terms / Grievance | yes | `noopener noreferrer` |

Thank-you WhatsApp and admin campaign “Open” links already include `rel="noopener noreferrer"` (attribute may sit on the next line). **No homepage first-party `target="_blank"` without `noopener`.**

No `rel` attributes were added “everywhere.”

---

## 8. Exact fixes applied for each Best Practices issue

| Issue | Fix |
|---|---|
| Deprecated APIs | **None.** No first-party API identified. Tracking left as in 7.2. |
| Unsafe cross-origin links | **None.** Homepage already had `noopener noreferrer`. |

---

## 9. Anything unresolved and why

| Item | Why unresolved |
|---|---|
| Best Practices still 58 (if unchanged after deploy) | No PSI JSON; remaining failures are likely third-party console/Issues/deprecations. Changing GA/Ads/Pixel/Snap/Clarity would violate this phase’s tracking constraint. |
| Exact deprecated API name | Requires Lighthouse “Avoids deprecated APIs” details (source URL + API). Not available (API quota). |
| Mobile TBT 690 ms | Initial graph is still React + Router + radix toast + Hero + Lucide `vendor-ui` + post-paint tracking. Section IO does not remove that. Further TBT work is Phase 7.4+ (not started). |
| Why may load on desktop first paint | Geometry: section sits at ~100vh with 280px rootMargin. Documented, not a batch load of all four. |
| `#categories` nav | `CategoriesSection` still not on `Index`. Unrelated to this phase. |

---

## 10. Expected visual or behavioral changes

- Below-fold **content** appears when approaching (or on `#how-it-works` / `#prizes`). Sentinels use the same background colors and reserved `minHeight` so the column does not collapse (CLS should stay 0; not re-measured).
- Placeholder is an `sr-only` `h2` until the chunk mounts, then the real section (visible `h2`) replaces it. No duplicate ids.
- Hash nav to How It Works / Prizes still scrolls to a real node.
- Slight pause possible if the user jumps faster than the 280px prefetch; should be rare.
- Hero, Navbar, Footer, nomination card, tracking events/IDs: unchanged.
- Accessibility 100 / SEO 100: headings remain in the DOM (`sr-only` then visible). Not re-measured.

---

## 11. Build result

`npm run build` **succeeded** (2.30s, 3689 modules). Admin chunk-size warning unchanged (668 kB, not on `/`).

---

Phase 7.3 ends here. Do not start Phase 7.4 from this report.
