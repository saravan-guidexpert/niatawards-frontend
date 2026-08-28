# Performance optimization — Phase 5 report

**Date:** 28 August 2026  
**Scope:** CSS delivery, unused Tailwind output, expensive paint effects, and font loading. Phases 1–4 were not revisited. No Framer Motion, tracking, or business-logic changes.

---

## 1. CSS files and styles investigated

| Source | Role | In production `/` CSS? |
|---|---|---|
| `src/index.css` | Only global stylesheet (`main.tsx` import). Tailwind layers, tokens, landing motion, a11y | Yes — the single `index-*.css` |
| `src/App.css` | Leftover Vite template (`#root` max-width, `.logo` `will-change: filter`) | **Never imported.** Deleted this phase |
| Component CSS modules / `<style>` | None | — |
| `DEPLOYMENT_GUIDE.html` | Docs-only fonts | Not in the app bundle |
| Production `dist/assets/index-*.css` | One file for the whole SPA | Yes (render-blocking `<link>` in `index.html`) |

Vite emitted **one** CSS file before and after. Lazy JS routes do **not** get their own CSS chunks, because all utilities come from the Tailwind scan of TSX, not per-route CSS imports.

---

## 2. Tailwind / PostCSS findings

**PostCSS:** `tailwindcss` + `autoprefixer` only. Unchanged.

**Before:** `content` was `./src/**/*.{ts,tsx}` plus leftover Next-style `./pages`, `./components`, `./app` (those folders do not exist at the frontend root). Tailwind therefore emitted classes from unused shadcn files.

**Unused UI scanned before (not imported by live pages):**  
`accordion`, `alert`, `alert-dialog`, `aspect-ratio`, `avatar`, `breadcrumb`, `card`, `checkbox`, `collapsible`, `context-menu`, `drawer`, `dropdown-menu`, `form`, `hover-card`, `menubar`, `navigation-menu`, `pagination`, `progress`, `radio-group`, `resizable`, `scroll-area`, `separator`, `sheet`, `sidebar` (~637 lines), `skeleton`, `slider`, `table`, `tabs`, `toggle`, `toggle-group`, `tooltip`, `chart` (Recharts wrapper).

Phase 4 CSS contained **70** `sidebar` hits and accordion keyframes. Those are gone after the content fix.

**Used UI still scanned:** `badge`, `button`, `calendar`, `command`, `dialog`, `input`, `input-otp`, `label`, `popover`, `select`, `switch`, `textarea`, `toast`, `toaster`.

**`tailwindcss-animate`:** kept. Toast, Select, Popover, Dialog, and Command use `animate-in` / `zoom-in-95` / slide utilities. A first content-glob attempt using `!./src/components/ui/**` **wiped those files** and dropped toast animations; that glob was replaced with **positive paths only**. Production CSS now contains `animate-in`, `fade-out-80`, `slide-in-from-top-full`, `zoom-in-95`.

**`darkMode: ["class"]`:** unused `dark:` utilities lived mainly in unused `alert.tsx` / `chart.tsx`. No `class="dark"` on the app. Config left as-is (harmless once those files are not scanned).

**Admin/lazy-route styles:** still in the homepage CSS. Tailwind cannot split by route unless we add a second CSS pipeline. Production output confirms a single stylesheet. Admin classes remain in that file by architecture, not by mistake.

---

## 3. Font loading findings

| Item | Finding |
|---|---|
| Provider | Google Fonts (`fonts.googleapis.com` / `fonts.gstatic.com`) |
| Families | **2:** Inter (body), DM Sans (headings / `font-heading`) |
| Weights | **4 per family:** 400, 500, 600, 700 (all used in live TSX: `font-medium` / `semibold` / `bold` plus default 400) |
| Files | Up to **8** `@font-face` files (one per family×weight). Browser CSS uses woff2 + unicode-range; a non-browser fetch of the CSS URL returns TTF |
| Blocking | **Before:** `@import` at the top of `index.css` — first-party CSS parse **waited** on Google CSS, then font files. `index.html` already had `preconnect` but nothing actually requested fonts until CSS `@import` ran |
| `font-display` | Already `display=swap` on the Google URL. Unchanged |
| Unused weights | None proven safe to drop (500 is used widely) |
| Self-host | Possible later; not done (same files, more repo churn, easy visual mismatch) |

**Safe change applied:** same Google URL moved to `<link rel="stylesheet">` in `index.html` (with existing preconnect). CSS `@import` removed. Parallel download with first-party CSS instead of a chained `@import`.

---

## 4. Expensive CSS effects found

| Location | Property | Above fold? | Static / animated | Risk | Action |
|---|---|---|---|---|---|
| `HeroSection` 3 orbs | `filter: blur(100–150px)` on 400–700px circles | Yes | **Static** blur; motion is `transform`/`opacity` (Phase 4) | High paint cost if the layer invalidates; blur itself is not animated | **Kept** — the look of the hero |
| `HeroSection` countdown | `blur-md` on 56px tile | Yes | Static | Low | Kept |
| Hero / form card | `backdrop-filter: blur(28px)` over `rgba(10,3,3,0.88)` | Yes | Static | Extra compositing over orbs | **Kept** — glass on the nomination card is intentional |
| `WhySection` / `FinalCTASection` orbs | `blur-[120px]`–`150px` | No | Static blur + CSS transform/opacity | Same as hero, smaller viewport overlap | Kept |
| Login / admin login | `blur-3xl`, `backdrop-blur-sm` | Lazy routes | Static | Medium | Kept (not homepage-critical; still in shared CSS) |
| Admin header | `backdrop-blur-lg` | `/admin` | Static | Medium | Kept |
| Button `hero-outline` | `backdrop-blur-sm` | Admin | Static | Low | Kept |
| `App.css` `.logo` | `will-change: filter` + animated `filter` | Dead file | — | — | **Deleted** with the unused file |
| `html { scroll-behavior: smooth }` | scroll | Yes | On hash nav | Can cost on low-end; already off under `prefers-reduced-motion` | Kept |
| `* { -webkit-overflow-scrolling: touch }` | universal | Yes | — | Extra style recalc | **Scoped** to `html, body` |
| Clip-path / width / top/left animation | — | — | — | None in landing CSS | — |
| `will-change` in live CSS | — | — | — | None after deleting `App.css` | — |

Landing motion already uses `transform`/`opacity` only (Phase 4). No further orb redesign.

---

## 5. What was changed

1. **Tailwind `content`** — scan live pages, landing, nomination, admin, hooks, contexts, lib, plus the 14 used UI files. Do not scan unused shadcn.
2. **Removed unused theme keyframes** — `accordion-up/down`, `float`, `pulse-glow` (never used outside unused accordion).
3. **`index.css`** — dropped Google `@import`; dropped unused `.skip-link`, `.text-gradient-hero`, `.bg-gradient-hero`, `.shadow-elevated`, `--gradient-hero`, `--shadow-elevated`, `--sidebar-*`.
4. **Fonts** — same CSS2 URL in `index.html` `<link rel="stylesheet">`.
5. **`* { -webkit-overflow-scrolling }`** → `html, body`.
6. **Deleted `src/App.css`** (unreferenced Vite template).

---

## 6. What was intentionally kept

- Single global Tailwind CSS (Vite does not emit a second CSS file for lazy routes).
- Unused shadcn **TSX files** on disk (not deleted; only unscanned).
- `tailwindcss-animate` (toast / overlay enter-exit).
- Hero/Why/CTA **large static blurs** and card **backdrop-filter**.
- Inter + DM Sans at 400/500/600/700 and `display=swap`.
- `html { scroll-behavior: smooth }` (in-page nav).
- Phase 4 landing keyframes and reduced-motion rules.
- Admin utilities inside the shared CSS file.

---

## 7. Phase 4 vs Phase 5 CSS sizes

| Asset | Phase 4 | Phase 5 |
|---|---:|---:|
| `index-*.css` | **98.09 KB / 16.82 KB gzip** | **75.02 KB / 13.27 KB gzip** |
| CSS files in `dist/assets` | 1 | **1** (no lazy CSS chunk) |
| `@import` Google Fonts in CSS | Yes | **No** |
| `sidebar` / accordion utilities | Present | **Absent** |

**CSS reduction:** **−23.07 KB minified (−24%)**, **−3.55 KB gzip (−21%)**.

---

## 8. Initial homepage asset changes

| Asset | Phase 4 | Phase 5 |
|---|---|---|
| `index.html` | 6.12 KB / 2.09 KB gzip | 6.39 KB / 2.20 KB gzip (font `<link>`) |
| First-party CSS | 98.09 / 16.82 | **75.02 / 13.27** |
| Eager JS (`index` + `vendor-react` + `vendor-ui`) | 85.91 + 163.72 + 26.83 | Unchanged |
| `vendor-motion` preload | None | None (unchanged) |
| Font request | After CSS `@import` | Parallel `<link>` + existing preconnect |

Production `index.html` stylesheets: Google Fonts CSS, then Vite `index-*.css`. Modulepreload: `vendor-react`, `vendor-ui` only.

---

## 9. Files changed

| File | Change |
|---|---|
| `tailwind.config.ts` | Precise `content`; removed unused accordion/float/pulse-glow theme keys |
| `src/index.css` | No `@import`; unused utilities/vars removed; overflow-scrolling scoped |
| `index.html` | Google Fonts `<link rel="stylesheet">` (same URL as before) |
| `src/App.css` | Deleted |

---

## 10. Production build result

**Success.** `vite build` completed (~2.1s). One CSS file. Toast/select animation classes present. Landing orb blurs (`blur-[100px]`–`150px`) present. No `vendor-motion` in `index.html`. No Google `@import` in first-party CSS.

Could not toggle OS fonts or drive a browser here. Please confirm Inter/DM Sans still apply on `/` and that a toast still slides in.

---

## 11. Visual changes

None intended. Removed CSS was unused (sidebar kit, skip-link never referenced, Vite logo template). Fonts and weights are the same; only the **request order** changed (`<link>` vs CSS `@import`), so a brief fallback flash is still governed by `display=swap` as before.

Phase 5 stops here. Do not start Phase 6.
