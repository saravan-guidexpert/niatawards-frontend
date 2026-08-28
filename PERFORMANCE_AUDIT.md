# Frontend performance audit

**Date:** 28 August 2026  
**Scope:** `frontend/` (Vite 5 + React 18 SPA). No application code was changed.  
**Method:** Full source review of `package.json`, `index.html`, `src/`, routing, effects, listeners, and polling; plus a production `vite build` to measure real chunk sizes.

This is a client-only SPA. There is no Next.js App Router, so **nothing is marked `"use client"`** — and nothing can be a Server Component. Every route waits on JavaScript parse + execute before first paint of the React tree.

---

## Executive summary

The public landing page (`/`) downloads **~521 KB of first-party JavaScript** (minified; **~166 KB gzip**) before it can run, plus **93 KB of CSS** (16 KB gzip) and **four third-party analytics/session-replay scripts** in `index.html`.

The two largest first-party costs on initial load are:

1. **`framer-motion` (~123 KB / 41 KB gzip)** pulled in by the hero, navbar, and countdown.
2. **The main `index` chunk (~183 KB / 58 KB gzip)** which eagerly includes the hero, inline nomination form, photo upload, OTP widget, dual toast stacks, Radix tooltip, and auth.

The admin dashboard is a separate problem: **`AdminPage` is 641 KB minified (177 KB gzip)** because every admin panel, Recharts, and `react-day-picker`/`date-fns` are statically imported together.

| Chunk (production build) | Minified | Gzip | Loaded on `/`? |
|---|---:|---:|---|
| `vendor-react` (React + react-router) | 162.8 KB | 53.1 KB | Yes |
| `index` (app shell + landing hero) | 183.3 KB | 57.9 KB | Yes |
| `vendor-motion` (`framer-motion`) | 123.1 KB | 41.1 KB | Yes |
| `vendor-ui` (`lucide-react`) | 26.8 KB | 5.7 KB | Yes |
| `vendor-query` (`@tanstack/react-query`) | 25.2 KB | 7.8 KB | Yes (unused) |
| CSS (`index-*.css`) | 93.5 KB | 15.8 KB | Yes |
| Lazy landing sections (4 files) | ~13.1 KB | ~5.5 KB | Immediately after first JS |
| `AdminPage` | 640.6 KB | 176.8 KB | No (lazy route) |

**Highest-impact next steps (when work is approved):** delay third-party tags; stop shipping `framer-motion` and the nomination form on first paint; drop unused React Query / Sonner / next-themes; split admin panels; stop Tailwind from scanning unused shadcn files.

---

## Inspection checklist

| # | Area | Result |
|---|---|---|
| 1 | `package.json` dependencies | Full shadcn/Radix kit + several unused heavy libs; `framer-motion`, React Query, lucide-react ship on `/` |
| 2 | Globally imported components | `App.tsx` wraps every route in QueryClient, TooltipProvider, Radix Toaster, Sonner, AuthProvider; `Index` is eager |
| 3 | Third-party scripts | GA4 + Google Ads + Meta Pixel + Microsoft Clarity in `index.html` |
| 4 | Analytics scripts | Same as above; plus `gtag` conversion on every non-admin HTML load |
| 5 | Animation libraries | `framer-motion` on landing, plus infinite CSS-filter animations |
| 6 | Icon libraries | `lucide-react` named imports (tree-shaken) but forced into a vendor chunk |
| 7 | Chat / WhatsApp widgets | No public chat widget; `wa.me` share link only; admin WhatsApp ops panel is internal |
| 8 | Carousels / sliders | `embla-carousel-react` installed; **not used** at runtime |
| 9 | Large client-side components | Hero + inline form on `/`; 1,245-line `AdminPage` + 4 large panels |
| 10 | `"use client"` | N/A — entire app is client JS |
| 11 | Dynamic imports that could be used | Landing form, motion, admin panels, Recharts, calendar not split enough |
| 12 | Code on initial page load | See bundle table; hero animations + countdown interval start immediately |
| 13 | Expensive `useEffect`s | Countdown interval; draft hydrate/create; admin fetch-all; UTM capture |
| 14 | Scroll / resize / mousemove / animation listeners | `useScroll` parallax on hero; `mousedown` on custom selects; no `mousemove` |
| 15 | `setInterval` / polling | 1s countdown; 1s WhatsApp clock; 12s campaign/digital polls; 30s WhatsApp ops |
| 16 | Heavy libs on the wrong pages | React Query + Sonner + motion on `/`; Recharts + day-picker on every admin tab |

---

## Findings

Each finding lists: file, dependency/component, why it hurts, whether it hits **initial page load** of `/`, priority, and a recommended fix.

---

### 1. Third-party analytics and session replay (Critical)

**File path:** `frontend/index.html` (lines 84–129)  
**Dependency / component:** Google tag `gtag.js` (`G-9BZPGSKKYE`), Google Ads (`AW-16608374468`), Meta Pixel (`fbevents.js`, pixel `618460890635684`), Microsoft Clarity (`y8xb26d5ve`)

**Why it affects performance:** These scripts download, parse, and run on the main thread in parallel with the app. Clarity records clicks, scrolls, and DOM mutations (session replay). Pixel + GA4 + Ads each inject their own runtime. Together they are often a larger main-thread cost than first-party React.

**Initial page load:** Yes — all four load from `<head>` on every HTML document, including `/`.

**Priority:** Critical

**Recommended solution:** Load tags after `requestIdleCallback` / `load`, or behind a consent gate. Split GA4 vs Ads vs Pixel vs Clarity. Load Clarity only on a sample of sessions (or drop it on mobile). Move the Google Ads conversion snippet off generic page views (it currently fires on every non-`/admin` load of `index.html`, including the landing page).

---

### 2. `framer-motion` on the landing page (Critical)

**File path:** `frontend/src/components/landing/HeroSection.tsx`, `Navbar.tsx`, `WhySection.tsx`, `HowItWorksSection.tsx`, `WinnersReceiveSection.tsx`, `FinalCTASection.tsx`; also `vite.config.ts` `manualChunks.vendor-motion`

**Dependency / component:** `framer-motion` (^11)

**Why it affects performance:** Production chunk `vendor-motion` is **123 KB / 41 KB gzip**. The library registers animation loops, layout measurement, and gesture plumbing. The hero starts **infinite** scale/opacity/translate tweens on three large blurred orbs, **ten particle tweens**, a scroll-linked `useScroll` / `useTransform` parallax, and `AnimatePresence` on countdown digits every second. That is continuous main-thread + compositor work, especially with `filter: blur(100px–150px)` on 400–700px layers.

**Initial page load:** Yes. Navbar + Hero import motion statically, so the vendor chunk is in the critical path. Below-fold sections import it again (already cached after first load).

**Priority:** Critical

**Recommended solution:** Replace landing motion with CSS (`@keyframes`, `transform`/`opacity` only). Keep `framer-motion` for admin if needed, and **dynamic-import** it there. Respect `prefers-reduced-motion`. If motion is kept, drop infinite blur-orb loops and `useScroll` parallax on mobile.

---

### 3. Eager landing shell: Index + Hero + full nomination flow (Critical)

**File path:** `frontend/src/App.tsx`, `frontend/src/pages/Index.tsx`, `frontend/src/components/landing/HeroSection.tsx`, `frontend/src/components/nomination/InlineNominationForm.tsx`, `frontend/src/components/nomination/TeacherPhotoUpload.tsx`, `frontend/src/components/nomination/MobileOtpField.tsx`

**Dependency / component:** Static `import Index from "./pages/Index.tsx"`; Hero statically imports `InlineNominationForm`, `MobileOtpField` (`input-otp`), and (via the form) `TeacherPhotoUpload`

**Why it affects performance:** `App.tsx` eagerly loads `Index` for **every** route. The main `index-*.js` chunk is **183 KB / 58 KB gzip** and already contains the hero, OTP widget, draft APIs, and photo-upload path. Users who only need the countdown still parse the full form. `/nominate-student` then lazy-loads a **0.4 KB** page because Hero is already in the main bundle.

**Initial page load:** Yes.

**Priority:** Critical

**Recommended solution:** Lazy-load `Index` like other routes, or split Hero: ship copy + CTA first; `import()` the OTP card and `InlineNominationForm` after interaction (or when in view). Lazy-load `TeacherPhotoUpload` only on form step 2.

---

### 4. Hero countdown interval + layout animations every second (High)

**File path:** `frontend/src/components/landing/HeroSection.tsx` (`useCountdown`, `CountdownBox`)

**Dependency / component:** `setInterval(..., 1000)` + `AnimatePresence mode="popLayout"` on four digit `motion.span`s

**Why it affects performance:** Every second the component setState’s a new `Date`, re-renders the hero countdown, and Framer runs enter/exit animations on whichever digits changed. Combined with infinite background tweens, this keeps the main thread busy for the entire visit.

**Initial page load:** Yes — interval starts on mount.

**Priority:** High

**Recommended solution:** Tick only the countdown subtree (isolated component). Skip `AnimatePresence` on seconds, or update seconds with CSS. Pause the interval with `document.hidden`. Compute remaining time without storing a full `Date` in state.

---

### 5. Hero `useScroll` listener (High)

**File path:** `frontend/src/components/landing/HeroSection.tsx`

**Dependency / component:** `framer-motion` `useScroll({ target: sectionRef })` + `useTransform` driving `style={{ y: bgY }}`

**Why it affects performance:** Scroll-linked motion attaches a scroll listener and updates animated values while the user scrolls the first viewport. On low-end phones this competes with Clarity’s scroll recording and `html { scroll-behavior: smooth }`.

**Initial page load:** Yes — subscribed on hero mount.

**Priority:** High

**Recommended solution:** Remove parallax, or enable it only for `pointer: fine` and `prefers-reduced-motion: no-preference`. Prefer a static background.

---

### 6. Unused `@tanstack/react-query` on every page (High)

**File path:** `frontend/src/App.tsx`; `frontend/vite.config.ts` (`vendor-query`); `frontend/package.json`

**Dependency / component:** `QueryClient`, `QueryClientProvider`

**Why it affects performance:** **25 KB / 8 KB gzip** is downloaded, parsed, and a client is constructed. There is **no** `useQuery` / `useMutation` anywhere in `src/`. All data fetching uses `fetch` in `src/lib/api.ts`.

**Initial page load:** Yes.

**Priority:** High

**Recommended solution:** Remove `QueryClientProvider` and the dependency (or introduce it only when a data layer actually needs it).

---

### 7. Dual toast stacks + `next-themes` on every page (High)

**File path:** `frontend/src/App.tsx`, `frontend/src/components/ui/toaster.tsx`, `frontend/src/components/ui/sonner.tsx`, `frontend/src/hooks/use-toast.ts`

**Dependency / component:** Radix `@radix-ui/react-toast` + `sonner` + `next-themes` (`useTheme`)

**Why it affects performance:** Every route mounts **two** toaster trees. All real toasts go through `useToast()` (Radix). `sonner`’s `toast()` is never called. `sonner.tsx` still imports `next-themes`, which runs theme subscription logic **without** a `ThemeProvider`. `useToast` re-subscribes on every state change (`useEffect(..., [state])`), which is extra work per toast.

**Initial page load:** Yes.

**Priority:** High

**Recommended solution:** Keep one toaster. Remove `sonner`, `next-themes`, and the unused `Toaster as Sonner`. Fix `useToast`’s effect to subscribe once (`[]`).

---

### 8. Google Fonts via CSS `@import` (High)

**File path:** `frontend/src/index.css` (line 1); `frontend/index.html` (preconnect only)

**Dependency / component:** Google Fonts CSS for **Inter** and **DM Sans**, weights 400/500/600/700

**Why it affects performance:** `@import` inside the main stylesheet is render-blocking: the browser must download CSS, then discover fonts, then download font files. HTML already `preconnect`s to `fonts.googleapis.com` / `fonts.gstatic.com` but never `<link>`s the stylesheet, so preconnect is under-used. Two families × four weights is more files than this UI needs. Late fonts cause layout shift or FOIT/FOUT around the hero H1.

**Initial page load:** Yes.

**Priority:** High

**Recommended solution:** Self-host one family (or `size-adjust` fallbacks). Use `<link rel="preload" as="font">` for the heading woff2. Drop unused weights. Remove the CSS `@import`.

---

### 9. Inflated CSS from unused shadcn/ui kit (High)

**File path:** `frontend/tailwind.config.ts` (`content: ["./src/**/*.{ts,tsx}"]`); `frontend/src/components/ui/*` (48 files, ~3.9k lines)

**Dependency / component:** Tailwind + `tailwindcss-animate`; unused UI files (`sidebar.tsx` 637 lines, `chart.tsx`, `carousel.tsx`, `menubar.tsx`, etc.)

**Why it affects performance:** Production CSS is **93 KB / 16 KB gzip**. Tailwind includes classes found in **unused** components. `tailwindcss-animate` adds many animation utilities. Larger CSS delays first paint and competes with JS on the main thread during parse.

**Initial page load:** Yes.

**Priority:** High

**Recommended solution:** Narrow `content` to actually used files, or delete unused `src/components/ui/*` and unused Radix packages. Drop `tailwindcss-animate` if unused.

---

### 10. Admin dashboard mega-chunk (High — admin only)

**File path:** `frontend/src/pages/AdminPage.tsx`; `CampaignsPanel.tsx` (1,034 lines); `DigitalMarketingPanel.tsx` (871); `WhatsAppOpsPanel.tsx` (796); `AccessManagementPanel.tsx` (428)

**Dependency / component:** Static imports of all panels; `recharts`; `react-day-picker` + `date-fns`; `cmdk` (via `SearchableSelect`); Radix Select/Popover/Calendar

**Why it affects performance:** `AdminPage-*.js` is **641 KB / 177 KB gzip**. Opening `/admin` parses Recharts and the date picker even on the Nominations tab. `adminGetNominations()` loads **all** nominations; the page then filters and maps **every row** on each render (search `toLowerCase()` inside `filter`). Mobile list renders a full-width photo per row with **no virtualization**.

**Initial page load:** No for `/`. Yes for `/admin`.

**Priority:** High (admin UX / ops machines); Medium for public site

**Recommended solution:** `React.lazy` each panel. Dynamic-import `recharts` and `Calendar`. Paginate or virtualize the nominations table. Memoize `filtered`. Do not fetch nominations when the WhatsApp or Access tab is active.

---

### 11. Below-fold `lazy()` that still loads immediately (Medium)

**File path:** `frontend/src/pages/Index.tsx`

**Dependency / component:** `lazy(() => import(Why/HowItWorks/Winners/FinalCTA))` inside one `Suspense`

**Why it affects performance:** Code-splitting is real (~13 KB extra), but all four chunks are requested as soon as `Index` renders — not when they enter the viewport. Extra HTTP/2 requests compete with the main chunk. Each section still pulls `framer-motion` (already loaded) and starts `useInView` plus, for Why/Final CTA, **infinite** blur/particle animations.

**Initial page load:** Indirectly — they start fetching during/after first JS execution, before the user scrolls.

**Priority:** Medium

**Recommended solution:** Intersection Observer / `react-lazy-load` so chunks download only near the fold. Replace remaining infinite `motion.div` loops with static CSS.

---

### 12. `AuthProvider` + `TooltipProvider` + `UtmCapture` on all routes (Medium)

**File path:** `frontend/src/App.tsx`, `frontend/src/contexts/AuthContext.tsx`, `frontend/src/lib/utm.ts`, `frontend/src/components/ui/tooltip.tsx`

**Dependency / component:** `AuthProvider`, Radix `TooltipProvider`, `captureUtmParams` `useEffect` on every `pathname`/`search` change

**Why it affects performance:** Modest JS, but they run on `/` before the hero paints. Auth reads/writes `localStorage`. UTM may call `gtag` and `fetch('/api/utm/hit')`. TooltipProvider installs Radix context globally even though landing barely uses tooltips.

**Initial page load:** Yes.

**Priority:** Medium

**Recommended solution:** Mount `TooltipProvider` only around UI that uses tooltips (admin). Keep UTM capture, but do not block rendering on it (already true). Consider not wrapping public pages in full auth until the form is shown.

---

### 13. `lucide-react` vendor chunk (Medium)

**File path:** `frontend/vite.config.ts` (`manualChunks["vendor-ui"]`); many files `from "lucide-react"`

**Dependency / component:** `lucide-react` ^0.462.0

**Why it affects performance:** Named imports tree-shake; the production `vendor-ui` chunk is **27 KB / 6 KB gzip** (used icons only — acceptable). Forcing the whole package into `manualChunks` can still prevent finer splitting and always loads icons with the landing page.

**Initial page load:** Yes.

**Priority:** Medium

**Recommended solution:** Keep named imports. Optionally inline the few landing SVG icons and leave lucide on admin. Do not import from a barrel that re-exports every icon.

---

### 14. Unused dependencies that still cost install / CSS / future imports (Medium)

**File path:** `frontend/package.json`; unused wrappers under `frontend/src/components/ui/`

**Dependency / component:**

| Package | Runtime usage |
|---|---|
| `embla-carousel-react` | Only `ui/carousel.tsx` — **not imported** |
| `vaul` | Only `ui/drawer.tsx` — **not imported** |
| `react-hook-form`, `zod`, `@hookform/resolvers` | Only `ui/form.tsx` — **not imported** |
| `react-resizable-panels` | Only `ui/resizable.tsx` — **not imported** |
| `date-fns` | Transitive via `react-day-picker` (admin calendar) |
| `recharts` | WhatsApp ops chart + unused `ui/chart.tsx` |
| `cmdk` | Admin `SearchableSelect` only |
| Most `@radix-ui/react-*` | Only unused UI files (accordion, menubar, hover-card, …) |

**Why it affects performance:** Unused JS is tree-shaken from the production app, but Tailwind still scans the unused TSX (see finding 9). Dead packages increase install size and the chance they get imported later.

**Initial page load:** CSS inflation yes; unused JS no.

**Priority:** Medium

**Recommended solution:** Remove unused packages and unused `ui/*` files. Keep Radix only for Button/Toast/Select/Popover/Label actually imported by live pages.

---

### 15. Admin polling intervals (Medium — admin only)

**File path:** `frontend/src/components/admin/CampaignsPanel.tsx`, `DigitalMarketingPanel.tsx`, `WhatsAppOpsPanel.tsx`

**Dependency / component:** `setInterval(refresh, 12000)` + `focus` / `visibilitychange` listeners; WhatsApp `setInterval(load, 30_000)` and `setInterval(..., 1000)` for a live clock

**Why it affects performance:** Campaign and digital panels refetch every 12s even when the tab is in the background unless visibility handling wins the race. WhatsApp ops re-renders the whole panel every second for `now`, and every 30s refetches overview + lists (up to 200 log rows). Recharts `ResponsiveContainer` also listens to resize.

**Initial page load:** No.

**Priority:** Medium

**Recommended solution:** Poll only the active tab; pause on `document.hidden`. Don’t store `now` at 1 Hz — format “next due” on demand or every 15s. Lazy-load the LineChart.

---

### 16. Inline form effects and document listeners (Medium)

**File path:** `frontend/src/components/nomination/InlineNominationForm.tsx`; `HeroSection.tsx` (`persistDraft` on auth)

**Dependency / component:** `getNominationDraft` / `createNominationDraft` `useEffect`s; 800ms debounced `PATCH`; `CustomSelect` `document.addEventListener("mousedown")`

**Why it affects performance:** Draft hydrate/create is network + JSON parse, not a giant CPU loop, but it runs as soon as the form mounts (including when an already-logged-in user lands on `/`). Each `CustomSelect` adds a document `mousedown` listener. Debounced PATCH on every step-2 keystroke keeps the main thread and network busy while typing.

**Initial page load:** Partially — form JS is in the main chunk; effects run once the card reaches the “nominate” step (or immediately if session is already authenticated).

**Priority:** Medium

**Recommended solution:** Don’t mount `InlineNominationForm` until OTP is verified. Share one click-outside listener. Increase debounce or patch on blur.

---

### 17. Render-blocking / layout CSS (Medium)

**File path:** `frontend/src/index.css`; `HeroSection.tsx` / `InlineNominationForm.tsx` (`backdropFilter: "blur(28px)"`); large `blur-[100px]`–`blur-[150px]` orbs

**Dependency / component:** `html { scroll-behavior: smooth }`; `* { -webkit-overflow-scrolling: touch }`; backdrop-filter; CSS `filter: blur` on huge layers

**Why it affects performance:** Smooth scrolling and huge Gaussian blurs are GPU-heavy and can fall back to the main thread on low-end Android. `backdrop-filter` on the nomination card composites an extra layer over the animated orbs. Universal `*` rules increase style recalc cost.

**Initial page load:** Yes (hero is above the fold).

**Priority:** Medium

**Recommended solution:** Limit `scroll-behavior: smooth` to in-page nav. Replace live `blur()` orbs with a static pre-blurred image/gradient. Use `backdrop-filter` only if the device is capable (`@media (hover: hover)`).

---

### 18. Dead / duplicate nomination components (Low)

**File path:** `frontend/src/components/nomination/StudentNominationForm.tsx`, `TeacherSelfNominationForm.tsx`, `frontend/src/components/landing/CategoriesSection.tsx`

**Dependency / component:** Unused page-level forms and categories grid. Navbar still links to `#categories`, but `Index` never renders `CategoriesSection`.

**Why it affects performance:** Not in the JS bundle (unreferenced). They still inflate Tailwind CSS (finding 9) and confuse future imports. `#categories` clicks do extra `querySelector` / `scrollIntoView` work for a missing node.

**Initial page load:** CSS only.

**Priority:** Low

**Recommended solution:** Delete dead forms or wire `CategoriesSection` back in as a lazy, below-fold section. Remove the nav hash if the section stays gone.

---

### 19. `"use client"` / SSR (Low — architectural)

**File path:** entire `frontend/src` (Vite SPA); `frontend/index.html` `#root`

**Dependency / component:** Client-only React (`main.tsx` → `createRoot`)

**Why it affects performance:** First Contentful Paint of the real UI waits on JS. The HTML is a shell plus analytics. There is nothing to mark `"use client"`; the issue is the opposite — **everything** is client.

**Initial page load:** Yes.

**Priority:** Low as a “fix `'use client'`” task; High as a product architecture choice if TTFB/SEO/LCP must improve without reducing JS.

**Recommended solution:** Do not add fake `"use client"` directives. If LCP is the goal, prerender `/` (Vite SSG / CDN HTML) with the hero heading in static HTML, then hydrate.

---

### 20. `lovable-tagger` in devDependencies (Low)

**File path:** `frontend/package.json`

**Dependency / component:** `lovable-tagger` — **not** referenced in `vite.config.ts`

**Why it affects performance:** Not in the production bundle. Dev-only install weight.

**Initial page load:** No.

**Priority:** Low

**Recommended solution:** Remove if unused.

---

### 21. WhatsApp / chat widgets (Low — none on public site)

**File path:** `frontend/src/pages/ThankYouPage.tsx` (`https://wa.me/?text=...`); `frontend/src/components/admin/WhatsAppOpsPanel.tsx`

**Dependency / component:** Native WhatsApp share URL; admin ops UI (not a third-party chat bubble)

**Why it affects performance:** No Intercom/Crisp/Tawk script. `wa.me` is a navigation, not JS. Admin panel cost is covered in findings 10 and 15.

**Initial page load:** No.

**Priority:** Low (no public widget to remove)

**Recommended solution:** Keep it this way. Do not add a WhatsApp Business widget or chat SDK on `/`.

---

### 22. Carousels and sliders (Low — unused)

**File path:** `frontend/src/components/ui/carousel.tsx`; `frontend/src/components/ui/slider.tsx`

**Dependency / component:** `embla-carousel-react`, `@radix-ui/react-slider`

**Why it affects performance:** Not imported by live pages → not in JS. Still scanned by Tailwind.

**Initial page load:** CSS only.

**Priority:** Low

**Recommended solution:** Delete unused components and `embla-carousel-react`.

---

### 23. `useToast` listener churn (Low)

**File path:** `frontend/src/hooks/use-toast.ts`

**Dependency / component:** `useToast` `useEffect` depends on `[state]`

**Why it affects performance:** Each toast state change unsubscribes/resubscribes the module-level listener. Not a large cost, but unnecessary.

**Initial page load:** Yes (hook mounts with Toaster).

**Priority:** Low

**Recommended solution:** Subscribe in `useEffect` with `[]` (or `useSyncExternalStore`).

---

## Dynamic imports that would help (not used today)

| Target | Current | Suggested |
|---|---|---|
| `pages/Index.tsx` | Static import in `App.tsx` | `lazy()` like other routes |
| `InlineNominationForm` | Static from Hero | `import()` after OTP / “Nominate” click |
| `TeacherPhotoUpload` | Static from form | `import()` on step 2 |
| `framer-motion` | Static on landing | CSS on public pages; `import()` on admin |
| Admin panels + `recharts` + `Calendar` | Static from `AdminPage` | `lazy()` per tab |
| Landing below-fold sections | `lazy()` but all at once | Load on intersection |

---

## What is already in good shape

- Non-landing routes (`Login`, `ThankYou`, `Admin`, `NotFound`) use `React.lazy` with a chunk-reload fallback for deploys.
- No third-party chat/WhatsApp **widget** on the public site.
- No Embla carousel at runtime.
- `lucide-react` uses named imports (icons are tree-shaken).
- Vite `manualChunks` already isolates React vs motion vs query (query should simply go away).
- `@vitejs/plugin-react-swc` and `es2020` target are appropriate.
- Hashed `/assets/*` are cached immutable in `vercel.json`.

---

## Suggested order of work (when changes are approved)

1. Defer or sample-rate Clarity / Pixel / gtag; stop Ads conversion on generic page views.  
2. Remove React Query, Sonner, and `next-themes` from `App.tsx`.  
3. Replace landing `framer-motion` with CSS; isolate/simplify the countdown.  
4. Code-split Hero: OTP + `InlineNominationForm` + photo upload off the critical path.  
5. Delete unused shadcn files so Tailwind CSS shrinks.  
6. Self-host or subset fonts; drop CSS `@import`.  
7. Split admin tabs and stop fetch-all + full-table render.

No files were modified except this report.
