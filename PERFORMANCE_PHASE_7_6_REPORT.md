# Performance optimization — Phase 7.6 report

**Date:** 28 August 2026  
**Scope:** Remaining **measured** mobile bottlenecks after 7.4/7.5: LCP ~3.6 s, FCP 2.7 s, TBT 370 ms, Best Practices 58. Phases 1–7.5 were not reverted. Tracking IDs and event semantics are unchanged. Phase 7.7 was not started.

**PSI API could not be re-run** (HTTP 429 quota). There is no Lighthouse JSON in this session, so the **exact Chrome LCP node selector was not downloaded**. Bottlenecks were identified from: the user-supplied PSI table, the live production HTML (`https://www.niatawards.in/`, Vercel HIT), and the shipped CSS/JS. After-scores were **not** measured.

---

## 1. Baseline

**This phase’s measured PSI (user screenshots, production after 7.4/7.5 deploy):**

| Metric | Mobile | Desktop |
|---|---:|---:|
| Performance | 77 | 85 |
| FCP | 2.7 s | 0.7 s |
| LCP | **3.6 s** | 0.9 s |
| TBT | 370 ms | 320 ms |
| CLS | 0 | 0 |
| Accessibility | 100 | 100 |
| Best Practices | 58 | 58 |
| SEO | 100 | 100 |

Older baselines (pre-7.4) were mobile 74 / LCP 2.9 s / TBT 690 ms. **Do not mix them.** Notable: TBT improved; **mobile LCP got worse** (2.9 s → 3.6 s) while FCP stayed 2.7 s. The new gap is **FCP → LCP ≈ 0.9 s**.

Production at investigation time: HTML 6.25 kB, modulepreload `vendor-react` only, Google Fonts **blocking** `<link rel="stylesheet">`, first-party CSS `index-DfQ_NB_5.css` 75.18 kB.

---

## 2. Exact LCP element

**Not confirmed by a PSI “LCP element” screenshot/JSON in this session.**

From the live homepage DOM (no large hero bitmap; Phase 6 inventory still holds):

| Candidate | Why it can be LCP | Why it was delayed |
|---|---|---|
| Hero `<h1>` (“NIAT Guru Ratna Awards 2026”) | Largest first-column text (`text-4xl` / `lg:text-6xl`), `font-heading` | Wrapper `overflow-hidden` + `niat-hero-title` `from { transform: translateY(80px) }` + `animation: … 0.7s … **0.1s both**`. Fill-mode `both` applies the `from` state during the delay. The heading is **clipped for ~0.8 s** after it exists. |
| Nomination card (`niat-hero-right`) | Large painted rectangle on stacked mobile | `from { **opacity: 0**; translateX(40px) }` + **0.3 s delay** + `both`. Opacity 0 elements are **not LCP candidates** until they become visible. |

Chrome records LCP when the largest **visible** content paints. A 0.9 s FCP→LCP gap on mobile matches “first paint of nav/background, then wait for the clipped title / faded card.” It does **not** match TTFB (Vercel `age`/HIT, HTML 6 kB) or a large image download (none on `/`).

**What was blocking LCP (causal, code-level):**

| Factor | Role |
|---|---|
| Server | Unlikely (cached HTML, small) |
| Images | No LCP image on `/` |
| React | Caps **FCP** (empty `#root` until JS). Does not explain +0.9 s after FCP |
| Title clip + `both` + 0.1 s delay | **Hides/clips the heading after React has painted** |
| Card `opacity: 0` + 0.3 s delay | **Hides the other large candidate after React has painted** |
| Google Fonts CSS | **Render-blocking** on production; delays FCP (and thus LCP), not the 0.9 s post-FCP gap by itself |
| Font files (`display=swap`) | Can **update** text LCP when DM Sans swaps in; secondary to clip/opacity |
| Third-party tags | After first paint by design; can steal main thread **after** FCP (TBT), not the clip |

**Changes (LCP/FCP only):**

1. Removed `overflow-hidden` on the heading wrapper so the `<h1>` is not clipped.
2. Title motion is transform-only, **12px**, **no delay** (still opaque from the first frame).
3. Right column motion is transform-only (no `opacity: 0`), **no 0.3 s delay**.
4. Google Fonts CSS is `preload` + `media="print"` + `onload="this.media='all'"` (same URL, `display=swap`, same weights). It no longer blocks first paint. `<noscript>` keeps a normal stylesheet.

Visual: short slide instead of an 80px wipe / fade-in. `prefers-reduced-motion` still disables these animations.

---

## 3. Main-thread / TBT analysis

Mobile TBT **370 ms** (down from 690 ms in the old baseline) was **not** re-traced with a performance profile (no Lighthouse JSON, no DevTools trace).

What the evidence **does** support:

| Window | Work | Evidence |
|---|---|---|
| Before FCP | Parse/compile `vendor-react` (163.72 kB, ~79% `react-dom`) + entry (42 kB); hydrate Navbar/Hero/Footer | 7.5 sourcemap; SPA `#root` empty until JS |
| After FCP (TBT window) | Same hydrate finishing; then **gtag.js, fbevents.js, scevent.min.js** in one double-rAF callback; Clarity by idle/`timeout: 2500` | `thirdPartyTracking.ts` + production HTML has no those `<script src>` in head |
| Not a long-task source | Viewport observers, countdown `setInterval` (after paint, 1 Hz), toast store | 7.5 audit; no change |

We did **not** change tracking schedule: no new trace naming which vendor script owns which long task. Remaining TBT is still **react-dom + post-paint tags**, not another first-party barrel.

---

## 4. Third-party analysis

IDs unchanged: GA4 `G-9BZPGSKKYE`, Ads `AW-16608374468` / `…/EtKvCIHcoegcEMTdvu89`, Pixel `618460890635684`, Snap `eaf0e62f-1796-47bd-8c5e-863aa746a9e3`, Clarity `y8xb26d5ve`.

| Tag | When it loads | Main-thread | Schedule change this phase |
|---|---|---|---|
| GA / Ads | Stub in HTML; `gtag.js` after double rAF | Vendor parse after FCP — likely part of TBT | **No** (would risk conversion/PageView) |
| Meta Pixel | Stub in JS; `fbevents.js` same rAF as GA | Same | **No** |
| Snap | Stub in JS; `scevent.min.js` same rAF | Same | **No** |
| Clarity | `requestIdleCallback` `timeout: 2500` | Can fire inside the TBT window | **No** (short-session risk) |

Safe scheduling improvement exists **in theory** (stagger Pixel/Snap on idle). It was **not** applied: no PSI long-task breakdown, and bounce PageViews could drop.

Google Fonts is third-party **CSS**, not a tag: that **was** changed (non-blocking), because it was a proven render-blocking resource on production HTML.

---

## 5. CSS analysis (“Unused CSS ~241 KiB”)

| Fact | Value |
|---|---|
| First-party production CSS | **75.18 kB** min / **13.27 kB** gzip (then **75.15 / 13.26** after this phase) |
| Google Fonts CSS (mobile UA) | **13.6 kB**, 36 `@font-face` (unicode-range subsets) |
| Sum of those transfers | ~89 kB, **not** 241 kB |

Lighthouse “Reduce unused CSS” reports **unused rules × stylesheet size**, often **uncompressed**. A minified 75 kB Tailwind file commonly expands to ~200–250 kB of utilities, of which the homepage snapshot uses a minority (admin, toast, OTP, below-fold, hover/responsive variants).

That is **not** 241 kB of extra files we forgot to delete. Phase 5 already stopped scanning unused shadcn (`sidebar`, etc.). Remaining utilities are from **live** admin/nomination/toast files in one SPA stylesheet. Splitting Tailwind per route would need a second CSS pipeline and risks missing hover/responsive classes. **Not done.**

---

## 6. Exact files changed

| File | Why |
|---|---|
| `src/index.css` | LCP: title/card no longer start clipped or at opacity 0 |
| `src/components/landing/HeroSection.tsx` | Removed `overflow-hidden` on the LCP heading wrapper |
| `index.html` | FCP: Google Fonts CSS no longer render-blocking |
| `PERFORMANCE_PHASE_7_6_REPORT.md` | This report |

Not changed: tracking, router, viewport lazy sections, Lucide/toaster/apiAdmin splits, backend.

---

## 7. Before / after measurements

**PSI after this phase: not measured** (API 429). Do not invent scores.

| Metric | Mobile before (screenshots) | Mobile after | Desktop before | Desktop after |
|---|---:|---|---:|---|
| Performance | 77 | *unmeasured* | 85 | *unmeasured* |
| FCP | 2.7 s | *unmeasured* | 0.7 s | *unmeasured* |
| LCP | 3.6 s | *unmeasured* | 0.9 s | *unmeasured* |
| TBT | 370 ms | *unmeasured* | 320 ms | *unmeasured* |
| CLS | 0 | *unmeasured* | 0 | *unmeasured* |
| Accessibility | 100 | *unmeasured* | 100 | *unmeasured* |
| Best Practices | 58 | *unmeasured* | 58 | *unmeasured* |
| SEO | 100 | *unmeasured* | 100 | *unmeasured* |

**Build / network evidence (not Lighthouse):**

| | 7.5 shipping | 7.6 build |
|---|---|---|
| Initial JS | 42.12 + 163.72 = 205.84 kB | **42.11 + 163.72 = 205.83 kB** |
| gzip JS | 13.40 + 53.32 | **13.40 + 53.32** |
| CSS | 75.18 / 13.27 | **75.15 / 13.26** |
| `index.html` | 6.25 / 2.18 | **6.64 / 2.23** (font preload + noscript) |
| modulepreload | `vendor-react` only | same |
| Google Fonts | blocking `rel=stylesheet` | preload + print/onload |

**Expected (not measured):** mobile LCP should move closer to FCP (heading/card paintable immediately). FCP may improve slightly if Google CSS was on the critical path. TBT/Best Practices should be ~unchanged. Font swap can still nudge text LCP when DM Sans arrives (`display=swap`).

---

## 8. Best Practices 58

User-visible remaining audits: **Uses deprecated APIs**, **Uses third-party cookies**, **Issues logged in the Issues panel**.

| Audit | Exact cause in *our* repo | First- vs third-party | Action |
|---|---|---|---|
| Deprecated APIs | No first-party `document.write`, `unload`, `apple-mobile-web-app-capable`, Mutation Events. `apple-mobile-web-app-status-bar-style` remains (not the same deprecation as `capable`). | Likely **gtag / fbevents / scevent / Clarity** after paint | **Unresolved** — cannot patch vendor scripts; removing tags forbidden |
| Third-party cookies | No first-party cookie writes on `/` besides our session/localStorage (not cookies). PSI flags **GA, Meta, Snap, Clarity** cookie/storage | **Third-party** | **Unresolved** — required for those products |
| Issues panel | No first-party match; typically mixed-content/cookie/deprecation from the same vendors | **Third-party** | **Unresolved** without a DevTools Issues dump |

No `rel` spam; homepage `target="_blank"` already has `noopener noreferrer` (7.3). Score 58 is **not** treated as a first-party bug we can safely close this phase.

---

## 9. Regression checks

| Check | Result |
|---|---|
| Production build | Succeeded (Vite 5.4.19, 3692 modules) |
| Initial JS graph | Unchanged vs 7.5 (`vendor-react` + entry) |
| Viewport lazy / hash ids | `Index` / `ViewportLazySection` untouched |
| Tracking IDs / queues | `thirdPartyTracking.ts` untouched |
| Reduced motion | Still kills hero animations and forces `opacity: 1; transform: none` |
| Homepage / mobile nav / hash / OTP / toast / login / admin | **Not clicked in a real browser** (no MCP, Playwright Chromium missing) |

Human pass after deploy: heading still readable on load, card not invisible, fonts still DM Sans/Inter after swap, hamburger and `#how-it-works` / `#prizes`.

---

## 10. Stop

Phase 7.6 ends here. Do not start Phase 7.7.
