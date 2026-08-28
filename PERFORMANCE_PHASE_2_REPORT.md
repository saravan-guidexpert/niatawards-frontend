# Performance optimization — Phase 2 report

**Date:** 28 August 2026  
**Scope:** Remove unused dependencies and unnecessary globally mounted providers. Phase 1 code splitting was not revisited. No Framer Motion, analytics, image, CSS, or rendering work.

**Package manager:** `npm` (`package-lock.json`; `npm run dev`). Lockfile updated with `npm uninstall`.

---

## Every dependency investigated

| Dependency | Verdict | Evidence |
|---|---|---|
| `@tanstack/react-query` | **Removed** | Only `QueryClient` / `QueryClientProvider` in `App.tsx`. No `useQuery`, `useMutation`, `useInfiniteQuery`, `useQueryClient`, or dynamic import anywhere in `src/`. All data fetching uses `fetch` in `src/lib/api.ts`. |
| `sonner` | **Removed** | Mounted globally as `<Sonner />` in `App.tsx` via `src/components/ui/sonner.tsx`. `toast` from `sonner` was never imported by application code. Every toast uses `useToast()` from `@/hooks/use-toast` (Radix). |
| `next-themes` | **Removed** | Only `useTheme()` in `sonner.tsx`. No `ThemeProvider` anywhere. No theme switching UI. |
| `embla-carousel-react` (and transitive `embla-carousel`, `embla-carousel-reactive-utils`) | **Removed** | Only imported by unused `src/components/ui/carousel.tsx`. No page or live component imported `Carousel`. Already absent from the Phase 1 production JS graph. |
| `framer-motion` | **Kept** | Used by landing hero/navbar and admin. Out of scope for Phase 2. |
| `@radix-ui/react-toast` + `src/hooks/use-toast.ts` | **Kept** | Real toast system. All nomination, login, and admin toasts depend on it. |
| `input-otp` | **Kept** | Used by `MobileOtpField` (lazy on `/`, also Login). |
| `recharts` | **Kept** | Used by `WhatsAppOpsPanel` (admin route). |
| `cmdk` | **Kept** | Used by `SearchableSelect` → admin Digital Marketing. |
| `react-day-picker` + `date-fns` | **Kept** | Used by `Calendar` on admin pages. |
| `vaul` | **Kept** (not in production JS) | Only `src/components/ui/drawer.tsx`, which is never imported by a live page. Tree-shaken. Removing it would be unused-shadcn cleanup, not a homepage-bundle win. |
| `react-hook-form`, `zod`, `@hookform/resolvers` | **Kept** (not in production JS) | Only `src/components/ui/form.tsx`, never imported by live pages. Forms use local state, not RHF. |
| `react-resizable-panels` | **Kept** (not in production JS) | Only `src/components/ui/resizable.tsx`, never imported. |
| `@radix-ui/react-tooltip` | **Kept** in `package.json`; **unmounted from App** | Live Radix `Tooltip` / `TooltipTrigger` / `TooltipContent` exist only in unused `sidebar.tsx`. `App.tsx` was the only live import (`TooltipProvider`). After unmounting, the package is no longer in the homepage bundle. The npm package remains because `tooltip.tsx` still exists as unused shadcn (same pattern as other unused Radix wrappers). |

---

## Files changed

| File | Change |
|---|---|
| `src/App.tsx` | Removed `QueryClientProvider`, `Sonner`, and `TooltipProvider`. Left Radix `Toaster`. |
| `vite.config.ts` | Removed `vendor-query` `manualChunks` entry. |
| `src/components/ui/sonner.tsx` | Deleted (only consumer of `sonner` and `next-themes`). |
| `src/components/ui/carousel.tsx` | Deleted (only consumer of Embla; unused by the app). |
| `package.json` | Removed the four packages. |
| `package-lock.json` | Updated via `npm uninstall`. |

---

## Global providers / components removed

| Item | Why it was safe |
|---|---|
| `QueryClientProvider` + `new QueryClient()` | No React Query hooks or queries in the app. |
| `<Sonner />` | Duplicate toaster; never called. Radix `<Toaster />` remains. |
| `TooltipProvider` wrapping the whole app | No live Radix tooltip. Admin Recharts `Tooltip` is a different component. Unused `sidebar.tsx` already nests its own `TooltipProvider`. |

---

## Before and after production bundle sizes

Baseline: Phase 1 build (`/tmp/niat-perf-phase1`).  
After: Phase 2 build (`/tmp/niat-perf-phase2`). Both succeeded.

### Initial `/` graph (`index.html` modulepreload + entry)

| Asset | Phase 1 (min / gzip) | Phase 2 (min / gzip) |
|---|---:|---:|
| `index-*.js` | 153.25 KB / 49.11 KB | **85.19 KB / 27.06 KB** |
| `vendor-query` (`@tanstack/react-query`) | 25.19 KB / 7.78 KB | **removed** |
| `vendor-react` | 162.78 KB / 53.14 KB | 162.78 KB / 53.14 KB |
| `vendor-motion` | 123.12 KB / 41.13 KB | 123.12 KB / 41.13 KB |
| `vendor-ui` | 26.83 KB / 5.71 KB | 26.83 KB / 5.71 KB |
| CSS | 93.49 KB / 15.80 KB | 92.34 KB / 15.65 KB |

`index.html` no longer preloads `vendor-query`. Grep of all Phase 2 JS chunks found no `react-query`, `QueryClient`, `sonner`, `next-themes`, `embla`, or `useTheme`.

### Estimated initial homepage JavaScript reduction

| | Minified | Gzip |
|---|---:|---:|
| Phase 1 eager JS | 491.17 KB | 157.87 KB |
| Phase 2 eager JS | **397.92 KB** | **127.04 KB** |
| **Reduction** | **−93.25 KB (−19%)** | **−30.83 KB (−20%)** |

Main `index-*.js` alone: −68.06 KB minified (−22.05 KB gzip), from dropping React Query, Sonner, next-themes, and Radix tooltip (via `TooltipProvider`).

### Other chunks

| Chunk | Phase 1 | Phase 2 | Note |
|---|---:|---:|---|
| `AdminPage-*.js` | 640.55 KB / 176.75 KB | 667.40 KB / 186.59 KB | Grew because Rollup reassigned some previously shared main-chunk modules after `vendor-query` / App graph changed. No admin features were added. |
| Lazy form / OTP / photo | Unchanged role | Still separate; not in homepage preload | |

CSS shrank slightly after deleting unused `carousel.tsx` (Tailwind no longer emits those classes).

---

## Production build result

**Success.** `vite build` completed in ~2.3s (3685 modules; was 3735 in Phase 1).

Post-change source search in `src/` and `package.json` / `package-lock.json`: no remaining imports or package entries for the removed libraries.

---

## Looked unused but had to remain

| Package | Why it stayed |
|---|---|
| `vaul`, `react-hook-form`, `zod`, `@hookform/resolvers`, `react-resizable-panels` | Unused by live pages, but **not in the production homepage bundle** (tree-shaken). Removing them would only delete unused shadcn wrappers, which is outside this phase’s bundle goal. |
| `@radix-ui/react-tooltip` (npm) | Unmounted from `App`; no longer in homepage JS. Package left because `tooltip.tsx` / `sidebar.tsx` still exist as unused kit files. |
| `framer-motion` | Used on the landing page; explicitly out of scope. |
| Radix toast (`sonner` counterpart) | Required; all user-facing toasts go through it. |

Phase 2 stops here.
