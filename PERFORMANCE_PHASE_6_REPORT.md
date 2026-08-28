# Performance optimization — Phase 6 report

**Date:** 28 August 2026  
**Scope:** Image delivery and Largest Contentful Paint (LCP) resource. Phases 1–5 were not revisited. No Framer Motion, tracking, upload/backend, or branding changes.

---

## 1. Complete relevant image inventory

Live `<img>` / icon / meta images used by the application. Lucide SVG icons are not listed.

| File / URL | Dimensions | Format | Size | Where used | Fold | Homepage `/` | Lazy (before → after) | Width/height reserved | Responsive sizing | Likely LCP? |
|---|---|---|---|---|---|---|---|---|---|---|
| `/niat-lockup.svg?v=2` | 237×56 | SVG | 16.7 KB | Navbar (all public pages) | Above | Yes | No → still eager | Yes (`width`/`height` + 56px nav) | CSS `h-8` / `sm:h-10`, `w-auto` | Unlikely (small paint area) |
| `/niat-lockup.svg?v=2` | 237×56 | SVG | 16.7 KB (same URL) | Footer | Below | Yes (after scroll) | No → **lazy** | Yes | Same as nav | No |
| `/niat-logo-tight.webp` | 259×326 | WebP | 7.7 KB | Hero nomination card (`w-9 h-11`) | Above on desktop; below heading on mobile | Yes | No (kept eager) | **Added** 36×44 | Display 36×44; asset already tiny | Unlikely |
| `/niat-logo-tight.webp` | 259×326 | WebP | 7.7 KB | Login (`w-9 h-9`); Admin header (`w-5 h-5`) | Above on those routes | No | No | **Added** | CSS box only | No (not `/`) |
| `/niat-logo.webp` | 500×600 | WebP | 8.2 KB | Favicon, apple-touch-icon, JSON-LD; Admin login 44×44 | Favicon not LCP; admin login ATF | Favicon only | Browser default | **Added** on admin login | No srcset (tiny) | Favicon: no |
| `/niat-logo.png` | 500×600 | PNG | 53.6 KB | `manifest.json` PWA icons only | N/A | No (install) | N/A | Manifest claims 192/512 (mismatch, unused on `/`) | No | No |
| `/share-poster.jpg` | 1024×1280 | JPEG | 97.3 KB | Thank-you student path **before**; unused as display src after | Thank-you ATF | No | No | None before | Displayed `max-w-[240px]` | No (not `/`) |
| `/share-poster-480.jpg` | 480×600 | JPEG | 62.1 KB | Thank-you student path **after** | Thank-you ATF | No | No (route-ATF) | **Added** 480×600 | Display still 240px CSS; 480px is ~2× | No (not `/`) |
| `/og-image.png` | 1200×630 | PNG | 73.3 KB | Open Graph / Twitter / JSON-LD | Crawlers | Meta only | N/A | Meta 1200×630 | N/A | No (not painted in page) |
| Cloudinary `photo_url` | Up to 1600×1600 at upload | Varies (`f_auto` at upload) | Varies | Nomination photos: form preview, admin thumbs, lightbox | Admin / form, not homepage | No | None → **lazy** on list/detail thumbs | **Added** on most thumbs | **Delivery transforms** (see §7) | No |
| Facebook Pixel 1×1 | 1×1 | GIF | tiny | `index.html` noscript | Hidden | Yes | N/A | 1×1 | N/A | No (Phase 3; not touched) |
| `/favicon.ico` | 256×256 | ICO | 20.4 KB | Present in `public/`; HTML uses WebP favicon | N/A | Not referenced in HTML | N/A | — | — | No |

**No** CSS `background-image` URLs. Hero “orbs” are CSS radial blurs, not images. **No** `<picture>` / `<source>` in the live app.

### Public assets not used by the live UI (intentionally unchanged)

| File | Size | Notes |
|---|---|---|
| `niat-logo-tight.png` | 50.3 KB | Raster duplicate of the WebP already used |
| `nxtwave-logo.png` / `.webp` | 38.3 / 14.2 KB | Not referenced |
| `placeholder.svg` | 28.6 KB | Not referenced |
| `share-poster-student.jpg` | 97.3 KB | Duplicate of `share-poster.jpg` |
| `share-poster-teacher.jpg` | 188 KB | Not referenced (WhatsApp share is text-only) |

Do not convert unused files.

---

## 2. Likely LCP candidates (not proven)

Homepage DOM (`Index` → Navbar + `HeroSection` + lazy below-fold sections + Footer):

- **No large hero photograph.** Backgrounds are CSS gradients and blurred color orbs.
- Navbar lockup is **32px** tall (mobile) / **40px** (desktop) — small painted area.
- Hero card logo is **36×44**. The right column uses `niat-hero-right` (`opacity: 0` for 0.3s), so that logo is **not** in the first paint.
- The **`<h1>`** (“NIAT Guru Ratna Awards 2026”) is `text-4xl` / `sm:text-5xl` / `lg:text-6xl`, white on dark, in the first column. Animation `niat-hero-title` is **transform-only** (slide up); it does not start at `opacity: 0`. The wrapper has `overflow-hidden`, so the heading may be clipped for the first ~100ms (`animation-delay: 0.1s` + `fill-mode: both`).

**Likely mobile LCP:** the hero `<h1>`. On a stacked layout it is the largest text in the first viewport. The nomination card sits below it.

**Likely desktop LCP:** the same `<h1>` (`lg:text-6xl` in a two-column grid). The card is large but delayed by opacity animation; its inner logo is tiny.

**Possible early LCP, then update:** the nav SVG, if the heading is still clipped when Chrome takes the first LCP sample. Fonts use `display=swap`; a slow webfont could delay text LCP. That still does not make the 7.7 KB card logo a good preload target.

**Not claimed as measured LCP.** No Lighthouse, DevTools Performance panel, or Web Vitals trace was run in this environment. Chrome’s actual LCP element can differ by viewport, DPR, font ready-state, and whether the heading has painted yet.

---

## 3. What can and cannot be proven without a browser trace

**Can reason from DOM/CSS:** there is no large above-fold bitmap on `/`; the heading is the largest first-viewport content; nav/card logos are small; no image `rel="preload"` was added.

**Cannot prove without tracing:** which node Chrome reports as LCP; whether LCP is text vs SVG; whether `display=swap` causes a late text LCP; real TTFB/LCP times.

---

## 4. Images changed

| Asset / usage | Change |
|---|---|
| Navbar lockup | Removed `fetchPriority="high"` (it is not a justified LCP image; high priority would compete with fonts/text) |
| Footer lockup | `loading="lazy"` + `decoding="async"` (same URL as nav → cache hit, not a second download) |
| Hero / login / admin-login / admin-header logos | Intrinsic `width`/`height` matching the CSS box |
| Thank-you poster | Display `share-poster-480.jpg` (480×600) instead of 1024×1280 original |
| Nomination photos | Display URLs only: Cloudinary `f_auto,q_auto,c_fill\|limit,w_N` via `cloudinaryDisplayUrl`. Stored `photo_url` unchanged |
| Admin list/detail thumbs | `loading="lazy"` + dimensions |

---

## 5. Loading strategy before / after

**Homepage `/` (first viewport)**

| Request | Before | After |
|---|---|---|
| `/niat-lockup.svg?v=2` (nav) | Eager + `fetchPriority="high"` | Eager, **default** priority, dimensions kept |
| `/niat-logo-tight.webp` (hero card) | Eager, no dimensions | Eager, dimensions 36×44, **no** `fetchPriority`, **no** preload |
| Footer lockup | Eager, same URL as nav | `loading="lazy"`, same URL (HTTP cache) |
| Image `rel="preload"` | None | **Still none** (do not preload a non-LCP image) |

**Thank-you (student)**

| Before | After |
|---|---|
| `/share-poster.jpg` 97.3 KB, no dimensions | `/share-poster-480.jpg` 62.1 KB, 480×600, `decoding="async"`, not lazy (in that route’s first viewport) |

**Admin / photo preview**

| Before | After |
|---|---|
| Full Cloudinary original (up to 1600px) in every `<img>` | Width-matched transforms; list/grid lazy; lightbox `c_limit,w_1400` (no extra crop) |
| Form preview used raw URL (blob or Cloudinary) | Helper pass-through for `blob:`/`data:`; Cloudinary URLs get `w_560` |

---

## 6. Responsive delivery changes

- **Static logos:** no `srcset`. Displayed sizes are 20–44px; 7.7–16.7 KB sources are already small. SVG lockup stays SVG.
- **Thank-you poster:** one 480px-wide JPEG for a 240px CSS box (~2×). No 1024px file on that `<img>`.
- **Cloudinary:** display widths chosen from CSS boxes (2× where useful): 32px → `w_64`, 44px → `w_88`, 112px → `w_224`, ~280px preview → `w_560`, full-width mobile cards → `w_800`, lightbox → `w_1400` `c_limit`.

---

## 7. Format changes

| Asset | Decision |
|---|---|
| `niat-lockup.svg` | **Unchanged.** Do not rasterize a logo. |
| `niat-logo-tight.webp` / `niat-logo.webp` | **Unchanged.** Already WebP and tiny. |
| `share-poster-480.jpg` | New JPEG derivative; not AVIF (one extra format not justified for a non-home, 62 KB asset). |
| Cloudinary | `f_auto` on **delivery** so supporting browsers can get WebP/AVIF from Cloudinary without converting uploads. |
| `og-image.png` | **Unchanged** (social crawlers; not page LCP). |

No blanket AVIF conversion of `public/` files.

---

## 8. Preload / fetchpriority

- **No image preloads** added (production `dist/index.html` has no `rel="preload"` for images).
- **Removed** `fetchPriority="high"` from the navbar lockup.
- Did **not** set `fetchPriority` on the hero card logo.

---

## 9. Image byte savings (measurable)

| Path | Before | After | Saving |
|---|---|---|---|
| Thank-you poster (student) | 99,600 B | 63,576 B | **~36 KB (36%)** per view |
| Homepage lockup + hero logo | 16.7 + 7.7 KB | Same files | **0 B** (strategy only) |
| Cloudinary thumbs | Full ~1600px original per `<img>` | `w_64`–`w_800` + `q_auto` | **Not measured** (depends on each photo). Upload already stores max 1600 with `quality: auto`. Delivery now avoids sending that full file into 32–112px slots. |

Homepage image **bytes on the wire** are essentially unchanged; the win is **priority** (nav no longer marked high) and **layout** (intrinsic sizes).

---

## 10. Duplicate requests

- Nav + footer still share `/niat-lockup.svg?v=2`. Footer is lazy; the browser should reuse the cached nav response, not fetch a second copy of a different URL.
- Hero logo URL is unique on `/` (one `<img>`).
- Cloudinary helper skips if the exact transform is already in the URL; it does not rewrite stored `photo_url`.
- Production HTML does not preload the lockup or hero logo, so there is no preload + `<img>` double-fetch of those files.

---

## 11. Layout stability

- Nav lockup already had 237×56 plus a fixed 56px header.
- Hero / login / admin logos now have matching `width`/`height`.
- Thank-you poster: 480×600 attributes + `max-w-[240px]` keep aspect 4:5.
- Admin thumbs: explicit CSS height (`h-11`, `h-48`, `h-44`) plus attributes.
- No new aspect-ratio wrappers that change visual crop beyond existing `object-cover`.

---

## 12. Files changed

| File | Role |
|---|---|
| `src/lib/cloudinaryUrl.ts` | **New.** Display-only Cloudinary transforms |
| `public/share-poster-480.jpg` | **New.** 480×600 JPEG for thank-you |
| `src/components/landing/Navbar.tsx` | Drop `fetchPriority` |
| `src/components/landing/Footer.tsx` | Lazy lockup |
| `src/components/landing/HeroSection.tsx` | Logo dimensions |
| `src/pages/LoginPage.tsx` | Logo dimensions |
| `src/pages/AdminLoginPage.tsx` | Logo dimensions |
| `src/pages/AdminPage.tsx` | Transforms, lazy thumbs, logo dimensions |
| `src/components/nomination/TeacherPhotoUpload.tsx` | Display URL for preview |
| `src/pages/ThankYouPage.tsx` | 480px poster + dimensions |

**Not changed:** backend upload (`uploads.ts` still 1600 / `quality: auto` at ingest), stored `photo_url`, Framer Motion, tracking, CSS/fonts from Phase 5, `og-image.png`, SVG lockup, unused `public/` files.

---

## 13. Production build result

**Success.** `vite build` (~2.1s).

- `dist/index.html`: no image `preload`; favicon still `/niat-logo.webp`; modulepreloads are JS only.
- Eager homepage JS still references **two** lockup URLs (nav + footer) and **one** `niat-logo-tight.webp`.
- Thank-you chunk references `share-poster-480.jpg` only.
- New chunk `cloudinaryUrl-*.js` (~0.42 KB) pulled by admin + photo upload, not the homepage graph except via those lazy routes.
- `fetchPriority` absent from production JS.

Could not record a Network/Lighthouse comparison in a browser here. Homepage image **set** is the same two files as before; only fetch priority and footer `loading` changed.

---

## 14. Visual changes

None intended on `/`. Logos and lockup are the same files at the same CSS sizes.

Thank-you poster is the same image, resampled to 480×600 and shown at 240px wide — should match 2× screens; 3× may be slightly softer than the old 1024px file.

Admin / form photos: `c_fill` on thumbs matches existing `object-cover`. Lightbox uses `c_limit` so the full photo is not cropped. Format may shift via Cloudinary `f_auto` (e.g. WebP) at similar quality.

---

Phase 6 stops here. Do not start Phase 7.
