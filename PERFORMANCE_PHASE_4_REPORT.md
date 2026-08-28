# Performance optimization — Phase 4 report

**Date:** 28 August 2026  
**Scope:** Framer Motion and landing-page animation cost only. Phases 1–3 were not revisited. Framer Motion was **not** uninstalled. Analytics / third-party tracking were not touched.

---

## 1. Every original Framer Motion usage found

**What loaded Framer Motion on `/`:** `Index` eagerly mounts `Navbar` and `HeroSection`. Both imported `framer-motion`. The four below-fold sections (`WhySection`, `HowItWorksSection`, `WinnersReceiveSection`, `FinalCTASection`) also imported it and load in the same `Suspense` on first render. Any one of those was enough to put `vendor-motion` on the critical path. `CategoriesSection` imported motion but is **not** rendered on `Index`.

No `layoutId`, `useSpring`, `useMotionValue`, or `drag` existed anywhere.

| # | File | Component | Purpose | Above fold | Runs on load | Continuous | Layout changes | CSS instead? | Must stay FM? | Priority |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `HeroSection.tsx` | Hero orbs (3) | Infinite scale/opacity/translate on large blurred blobs | Yes | Yes | Yes | No (transform) | Yes | No | **Critical** |
| 2 | `HeroSection.tsx` | Particles (10) | Infinite float/fade dots | Yes | Yes | Yes | No | Yes | No | **Critical** |
| 3 | `HeroSection.tsx` | `useScroll` / `useTransform` | Parallax `y` on the orb wrapper | Yes | Yes (scroll listener) | While scrolling | Transform only | Prefer static | No | **High** |
| 4 | `HeroSection.tsx` | `HeroSection` + `useCountdown` | `setInterval(1000)` on the **whole hero**, plus `AnimatePresence mode="popLayout"` digit flip | Yes | Yes | Yes (1 Hz) | Yes (popLayout) | Digit enter via CSS | Countdown logic yes; FM no | **High** |
| 5 | `HeroSection.tsx` | Title / copy / right column | Entrance fade/slide, underline `scaleX` | Yes | Yes (once) | No | No | Yes | No | Medium |
| 6 | `HeroSection.tsx` | Get OTP button | `whileHover`/`whileTap` + infinite shine `x` | Yes | Shine yes | Shine yes | No | Yes | No | Medium |
| 7 | `HeroSection.tsx` | Form ↔ OTP | `AnimatePresence` slide | Yes (card) | On step change | No | No | Yes | No | Medium |
| 8 | `Navbar.tsx` | Mobile menu | `AnimatePresence` + `height: 0 → auto` | Yes (header) | On open | No | **Yes** (height) | Grid `0fr`/`1fr` | No | **High** |
| 9 | `WhySection.tsx` | Background orb | Infinite scale/opacity | No | When section mounts (immediately via `Suspense`) | Yes | No | Yes | No | High |
| 10 | `WhySection.tsx` | Header + 3 cards | `useInView` fade-up; card `whileHover` y; icon spring rotate | No | On view | Hover only | No | Yes | No | Medium |
| 11 | `HowItWorksSection.tsx` | Header + 3 steps | `useInView` fade-up / mobile `x` | No | On view | No | No | Yes | No | Medium |
| 12 | `WinnersReceiveSection.tsx` | Header + 3 prizes | `useInView` spring scale; hover lift; emoji rotate | No | On view | Hover only | No | Yes | No | Medium |
| 13 | `FinalCTASection.tsx` | 2 orbs + 8 particles | Infinite decorative motion | No | On mount | Yes | No | Yes | No | High |
| 14 | `FinalCTASection.tsx` | Copy + CTA | `useInView` fade; hover/tap scale; infinite arrow + shine | No | On view / always | Arrow + shine | No | Yes | No | Medium |
| 15 | `CategoriesSection.tsx` | Grid (unused on `/`) | `useInView` + hover springs | n/a | If ever mounted | Hover | No | Yes | No | Low |
| 16 | `InlineNominationForm.tsx` | Step 1 ↔ 2 | `AnimatePresence mode="wait"` slide | After OTP | Lazy | No | No | Could | **Yes for this phase** (lazy route; form UX) | Low on `/` |
| 17 | `LoginPage.tsx` | Card + steps | Fade-in + `AnimatePresence` phone/OTP/name | Lazy `/login` | No | No | No | Could | Keep (not homepage) | Low |
| 18 | `ThankYouPage.tsx` | Check icon + card | Spring scale + fade | Lazy `/thank-you` | No | No | No | Could | Keep | Low |
| 19 | `AdminLoginPage.tsx` | Card; shake | Entrance fade; error shake | Lazy | No | No | No | Could | Keep | Low |
| 20 | `AdminPage.tsx` | Modals, stats, rows, **width bars** | Dialog enter; list fade; `animate={{ width }}` | Lazy `/admin` | No | No | **Width bars yes** | Partial | **Yes** (admin UX + layout bars) | — |
| 21 | `FunnelAnalytics.tsx` / `CampaignsPanel.tsx` / `DigitalMarketingPanel.tsx` | Width bars, card enter | Progress fill via `width` | Admin | No | No | Yes | Could (CSS width) | Keep | — |
| 22 | `AccessManagementPanel.tsx` / `WhatsAppOpsPanel.tsx` | Cards / buttons | Fade/slide enter | Admin | No | No | No | Could | Keep | — |
| 23 | `NotFound.tsx` | Center copy | Fade-up | Lazy 404 | No | No | No | Could | Keep | Low |
| 24 | `StudentNominationForm.tsx` / `TeacherSelfNominationForm.tsx` | Dead forms | Entrance / category hover | Not routed | No | No | No | n/a | Untouched (dead) | Low |

**Import count before:** 20 files (`framer-motion`). **After:** 13 files. Landing folder: **0**.

---

## 2. Which usages were changed

Landing and chunking only:

- Hero, Navbar, Why, How It Works, Winners, Final CTA, Categories (unused on `/` but converted so it cannot reintroduce FM).
- `vite.config.ts` `manualChunks`: array form was putting `react/jsx-runtime` inside `vendor-motion`, so the homepage **still statically imported** that chunk after landing CSS conversion. Function-form chunks keep jsx with React.

Unchanged: all admin, login, thank-you, 404, inline form, and dead nomination forms.

---

## 3. Which animations were replaced with CSS

All landing motion now uses `transform` / `opacity` (and one grid-rows menu). Classes live in `src/index.css`:

| Effect | CSS |
|---|---|
| Hero copy / title / underline / right column | `niat-fade-up`, `niat-hero-title`, `niat-underline`, `niat-hero-right` |
| Hero orbs / particles | `niat-orb-a/b/c`, `niat-particle` (`--niat-dur` / `--niat-delay`) |
| Countdown digit enter | `niat-countdown-digit` (no exit) |
| OTP step swap | `niat-step-form` / `niat-step-otp` |
| Button press / shine | `niat-btn-press`, `niat-shine` |
| Why orb + card hover | `niat-why-orb`, `niat-card-lift`, `niat-icon-pop` |
| Scroll-in reveals | `niat-reveal` → `niat-reveal-on` via `useInViewOnce` (native Intersection Observer, once) |
| How-it-works mobile | `niat-reveal-left` / `niat-reveal-left-on` |
| Prize hover | `niat-prize-lift`, `niat-emoji-pop` |
| CTA orbs / particles / arrow / shine | `niat-cta-orb-*`, `niat-cta-particle`, `niat-arrow-nudge`, `niat-cta-shine`, `niat-cta-press` |
| Mobile nav | `niat-nav-menu` grid `0fr` → `1fr` (avoids `height: auto`) |

Blur stays as a **static** Tailwind `blur-[…]` class. Filter is not animated.

---

## 4. Which Framer Motion usages remain and why

Kept on **lazy routes only** so `framer-motion` stays installed and shared as `vendor-motion`:

- **Inline nomination form** (loaded after OTP on `/`, or via nominate routes): step transition with enter/exit.
- **Login / admin login / thank-you / 404:** page-level enter and step waits.
- **Admin dashboard + panels:** modals, list stagger, and **width** progress bars (`animate={{ width }}`). Those are layout animations; replacing them was out of homepage scope.

Dead `StudentNominationForm` / `TeacherSelfNominationForm` still import FM; they are not in the `/` graph.

---

## 5. Continuous animations — deferred or optimized

| Before | After |
|---|---|
| FM JS loops on 3 hero orbs + 10 particles | Same 13 nodes; **CSS** infinite `transform`/`opacity` (compositor). Still start with first paint so the look does not pop in late. No extra timers. |
| Why orb + CTA 2 orbs + 8 particles | CSS, same node counts (static arrays, no React state) |
| CTA arrow + button shines | CSS keyframes |
| Hero `useScroll` parallax | **Removed** (no scroll-linked JS) |
| `document.hidden` | Countdown interval **pauses** when the tab is hidden |

Decorative CSS loops are disabled under `prefers-reduced-motion: reduce`. They were not delayed with `requestAnimationFrame` because that would need more JS and would flash a static frame first.

---

## 6. Countdown optimization

**Before:** `useCountdown` lived in `HeroSection`, so every second re-rendered orbs, particles, copy, and the nomination card, and Framer `popLayout` measured digit boxes.

**After:**

- `HeroCountdown` + `useCountdown` are a **separate subtree**. Only the four digit boxes re-render.
- Values and deadline (`2026-09-03T23:59:59`) are unchanged (`padStart(2,"0")`, same units).
- Interval pauses on `document.hidden` and refreshes on visible.
- Digit change: `<span key={value} className="niat-countdown-digit">` — enter animation only.

OTP resend timer is unchanged and still local to `QuickNominateCard`.

---

## 7. Scroll / parallax

Hero `useScroll({ target: sectionRef })` + `useTransform` → `style={{ y: bgY }}` is **gone**. Orbs are position-fixed in the section (CSS motion only). Below-fold had no scroll-linked motion (`useInView` was one-shot; replaced with `useInViewOnce`).

---

## 8. Layout animation changes

- **No `layout` / `layoutId`** in the repo before or after.
- Navbar mobile menu no longer animates `height: auto` (forced layout). It uses CSS grid row fraction.
- Countdown `popLayout` removed.
- Admin `width` bars **unchanged**.

---

## 9. `prefers-reduced-motion`

`@media (prefers-reduced-motion: reduce)` in `src/index.css` (present in production CSS):

- All `niat-*` keyframe animations set to `none`.
- Reveal / fade classes forced to `opacity: 1; transform: none`.
- Hover/active scale and lift disabled.
- Nav menu transition disabled.
- `html { scroll-behavior: auto }` in that query.

Verified in built `index-*.css` (`prefers-reduced-motion: reduce` at ~byte 54715). Could not toggle the OS setting in a browser in this environment.

---

## 10. Files changed (this phase)

| File | Change |
|---|---|
| `src/index.css` | Landing keyframes, hover transitions, reduced-motion |
| `src/hooks/use-in-view.ts` | **New.** One-shot Intersection Observer |
| `src/components/landing/HeroSection.tsx` | No FM; isolated countdown; CSS orbs/particles/entrance |
| `src/components/landing/Navbar.tsx` | No FM; CSS menu |
| `src/components/landing/WhySection.tsx` | CSS + `useInViewOnce` |
| `src/components/landing/HowItWorksSection.tsx` | Same |
| `src/components/landing/WinnersReceiveSection.tsx` | Same |
| `src/components/landing/FinalCTASection.tsx` | Same |
| `src/components/landing/CategoriesSection.tsx` | Same (still unused on `Index`) |
| `vite.config.ts` | `manualChunks(id)` so only `node_modules/framer-motion` is `vendor-motion` |

`framer-motion` remains in `package.json`. Phases 1–3 files (`App.tsx`, `thirdPartyTracking.ts`, `index.html` tracking stub, lazy OTP/form/photo) were not edited for this phase.

---

## 11. Phase 3 vs Phase 4 bundle sizes

Phase 3 figures: `PERFORMANCE_PHASE_3_REPORT.md` (`index` 86.91 KB) plus Phase 2 vendor chunks (motion still on `/`).

### Initial `/` graph (`index.html` entry + modulepreload)

| Asset | Phase 3 (min / gzip) | Phase 4 (min / gzip) |
|---|---:|---:|
| `index-*.js` | 86.91 KB / ~27.5 KB | **85.91 KB / 27.63 KB** |
| `vendor-react` | 162.78 KB / 53.14 KB | 163.72 KB / 53.32 KB |
| `vendor-motion` | **123.12 KB / 41.13 KB (preloaded)** | **not in `index.html`** |
| `vendor-ui` | 26.83 KB / 5.71 KB | 26.83 KB / 5.71 KB |
| CSS | ~92.34 KB / 15.65 KB (Phase 2; Phase 3 did not change CSS) | 98.09 KB / 16.82 KB |
| `index.html` | 6.21 KB / 2.10 KB | 6.12 KB / 2.09 KB |

`vendor-react` grew ~1 KB because `jsx-runtime` moved **out** of `vendor-motion` and back into React (correct).

### Lazy chunks (not homepage preload)

| Chunk | Phase 4 | Loads `vendor-motion`? |
|---|---|---|
| Below-fold landing sections | 2.05–3.79 KB each | **No** |
| `MobileOtpField` | 11.64 KB | **No** (`mapDeps` `[otp, react, ui]`) |
| `InlineNominationForm` | 16.94 KB | **Yes** (first homepage path that fetches FM) |
| `vendor-motion` | 114.27 KB / 37.75 KB | Shared by form, login, thank-you, admin, 404 |

---

## 12. Initial homepage JS reduction

| | Minified | Gzip |
|---|---:|---:|
| Phase 3 eager JS | **399.64 KB** | **~127.5 KB** |
| Phase 4 eager JS | **276.46 KB** | **86.66 KB** |
| **Reduction** | **−123.18 KB (−31%)** | **~−41 KB (−32%)** |

Eager JS = `index` + `vendor-react` + `vendor-ui` (Phase 4) vs those plus `vendor-motion` (Phase 3).

Production `index.html` modulepreload: `vendor-react`, `vendor-ui` only — **no `vendor-motion`**.

---

## 13. `vendor-motion` before / after

| | Phase 3 | Phase 4 |
|---|---|---|
| On initial `/` | Yes (modulepreload + static import) | **No** |
| Chunk still built | 123.12 / 41.13 KB | 114.27 / 37.75 KB |
| Why smaller | — | jsx-runtime no longer inside it; unused landing APIs (`useScroll`, `useTransform`, `useInView`) tree-shaken |
| First fetch | HTML parse | After user reaches OTP→form, `/login`, `/thank-you`, `/admin*`, or 404 |

---

## 14. Production build result

**Success.** `vite build` completed (~2.4s, 3687 modules).

Lazy graph check (entry `mapDeps`): Why / How / Winners / Final CTA / OTP do **not** list `vendor-motion`. Inline form, Login, ThankYou, Admin, AdminLogin, NotFound **do**.

---

## 15. Visual behavior that changed

Unchanged on purpose: copy, layout, colors, countdown numbers, OTP/form business logic, particle counts and positions, orb sizes/blur, CTA copy and links.

**Small visual deltas:**

1. **No hero scroll parallax** — background blobs no longer drift with scroll.
2. **Countdown digits** — new value still animates in; the old digit no longer exits downward (`popLayout` removed).
3. **Mobile nav** — same open/close; height is grid-based rather than measured `auto`.
4. **Hover springs** (cards, icons, prizes, CTA) are CSS easing, not FM springs — very close, slightly less “bouncy”.
5. **Form/OTP swap** in the hero card is CSS enter only (no exit tween).

Could not drive a real browser (no browser tools in this session). Verification was production HTML, chunk graph, and source/CSS. Please spot-check `/` with DevTools Network (FM should not download until the inline form), countdown ticking, mobile menu, below-fold reveals, and OS “reduce motion”.

Phase 4 stops here. Do not start Phase 5.
