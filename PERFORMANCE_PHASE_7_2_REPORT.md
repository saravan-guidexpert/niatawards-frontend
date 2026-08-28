# Performance optimization — Phase 7.2 report

**Date:** 28 August 2026  
**Scope:** Highest-confidence Lighthouse fixes from Phase 7.1 only. Snap Pixel deferred into the Phase 3 loader. Deprecated Apple meta removed. Mobile nav a11y, live form labels, `Link > button` nesting, and confirmed low-contrast text. Phases 1–6 were not revisited. Phase 7.3 was not started.

Tracking IDs, event names, and payloads were not changed. GA, Ads, Meta Pixel, Clarity, and Snap were not removed.

---

## 1. Snap Pixel

### Original implementation

Official snippet in `index.html` `<head>`:

- Created `window.snaptr` with a `queue` / `handleRequest` stub
- Inserted `<script async src="https://sc-static.net/scevent.min.js">` **during HTML parse**
- Immediately called `snaptr('init', 'eaf0e62f-1796-47bd-8c5e-863aa746a9e3')` and `snaptr('track', 'PAGE_VIEW')`

No application TypeScript called `snaptr`. This was the only Snap injection path.

### New implementation

Same architecture as Meta Pixel in `src/lib/thirdPartyTracking.ts`:

1. **Stub** (`installSnapStub`) — official queue: `handleRequest` if present, else `queue.push(arguments)`. Skip if `snaptr` already exists.
2. **Bootstrap** (`queueSnapBootstrap`, one-shot `snapQueued`) — `init` + `PAGE_VIEW` with the **same ID and event name**.
3. **Vendor script** (`loadSnap`) — `injectScript("niat-snap", "https://sc-static.net/scevent.min.js")` after first paint.

The snippet was **removed** from `index.html`. No Snap stub remains in HTML (nothing in `src/` called `snaptr` before `main.tsx`).

### Exact scheduling point

**Double `requestAnimationFrame` (after first paint)**, together with GA `gtag.js` and Meta `fbevents.js`.

**Why:** Snap is an ads pixel, like Meta — not session replay. Phase 3 already uses after-paint for GA/Pixel and idle-only for Clarity. Matching Pixel avoids an arbitrary timeout and keeps PAGE_VIEW on the same document load, a few frames later.

Clarity is unchanged (`requestIdleCallback` timeout 2500).

### How initialization/events are preserved

`init` and `PAGE_VIEW` are queued on the stub **before** the vendor script is injected, same as the original snippet’s queue-then-async-load order. When `scevent.min.js` loads, it flushes `snaptr.queue`.

### Duplicate prevention

| Guard | Role |
|---|---|
| `scheduled` | `scheduleThirdPartyTracking()` runs once |
| `snapQueued` | `init` / `PAGE_VIEW` queued once |
| `installSnapStub` early return | Does not replace an existing `snaptr` |
| `injectScript` + `id="niat-snap"` | Second inject is a no-op if the element exists |

There is no remaining path in `index.html`.

### Failure / ad-block behavior

`el.onerror = () => undefined` (shared injector). Stub stays; queued calls sit in `queue`. No throw. The app does not call `snaptr` after bootstrap.

Production HTML has **no** `sc-static.net` `<script src>`. The vendor URL exists only as a string inside `index-*.js`.

---

## 2. Deprecated metadata

**Removed:** `<meta name="apple-mobile-web-app-capable" content="yes" />`

**Kept:** `<meta name="mobile-web-app-capable" content="yes" />`  
**Kept:** `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />`

Chrome treats `apple-mobile-web-app-capable` as deprecated in favor of `mobile-web-app-capable`. Both were `content="yes"`, so the non-deprecated tag already expressed the same capability. Status-bar styling is a separate, still-used Apple meta and was not touched.

---

## 3. Mobile navigation accessibility

### Hamburger issue

`#btn-nav-mobile-menu` was icon-only (`Menu` / `X`) with no accessible name.

**Fix:**

- `aria-label={open ? "Close navigation menu" : "Open navigation menu"}`
- `aria-expanded={open}`
- `aria-controls="nav-mobile-menu"`
- Icons `aria-hidden="true"`
- `type="button"`

### Hidden focusable links issue

Closed menu used `aria-hidden={!open}` while remaining mounted for the grid-row animation. Descendants (`<a>`, formerly `<button>`) stayed in the tab order.

**Fix:** `inert={!open ? true : undefined}` on `#nav-mobile-menu`. `inert` removes descendants from keyboard focus and the accessibility tree. `aria-hidden` was **removed** so focusable nodes are never inside an `aria-hidden="true"` subtree. CSS (`niat-nav-menu` / `niat-nav-menu-open`) is unchanged.

When open, `inert` is omitted (`undefined`), so links work as before.

### Appearance / behavior

Open/close animation, layout, and routes are unchanged. Nominate controls are now `<Link>`s with the same classes (see §5).

---

## 4. Form labels

| Component | Input | Before | After |
|---|---|---|---|
| `HeroSection` `Field` | Full name | Visible `<label>` not associated | `htmlFor` + `id="hero-nominator-name"` |
| `HeroSection` `Field` | Mobile number | Same | `htmlFor` + `id="hero-nominator-phone"` |
| `MobileOtpField` | OTP (`input-otp`) | Sibling `<label>` | `htmlFor="otp-input"` + `id="otp-input"` on `InputOTP` |
| `LoginPage` | Phone | Placeholder only; nearby `h2` | `<label htmlFor="login-phone">` inside the existing `h2`; `id="login-phone"` |
| `LoginPage` | Name | Placeholder only | `<label htmlFor="login-name">` inside the existing `h2`; `id="login-name"` |
| `InlineNominationForm` | “I am a” `CustomSelect` | Visible label, no `htmlFor` | `htmlFor="nom-role"` + `id` on the listbox button |
| `InlineNominationForm` | Student/teacher text inputs & selects | Placeholder only | Matching `sr-only` `<label htmlFor>` + stable `id`s (`nom-student-name`, `nom-school-name`, `nom-teacher-name`, `nom-teacher-phone`, `nom-teaching-subject`, `nom-student-education`, `nom-self-*`, `nom-awards`, `nom-teacher-social`) |
| `InlineNominationForm` `FormTextarea` | Special / impact stories | Visible `<label>`, no `htmlFor` | `htmlFor` + `id` (`nom-special-thing`, `nom-impact-story`, `nom-self-impact`) |
| `TeacherPhotoUpload` | File input | Visible label, no `htmlFor` | `htmlFor="nom-teacher-photo"` + `id` on the `sr-only` file input |

Placeholders, validation, and submit logic were not changed. `sr-only` labels were used where adding a second visible label would have redesigned the compact form.

Unused `StudentNominationForm` / `TeacherSelfNominationForm` were not modified (not on a live route).

---

## 5. Interactive nesting

| File/component | Before | After |
|---|---|---|
| `Navbar` desktop Nominate | `<Link to="/nominate-student"><button id="btn-nav-nominate">` | `<Link id="btn-nav-nominate" to="/nominate-student" className={same button styles}>` |
| `Navbar` mobile Nominate a Teacher | `<Link><button id="btn-nav-mobile-nominate">` | Styled `<Link id="btn-nav-mobile-nominate">` |
| `Navbar` mobile Teacher Self-Nomination | `<Link><button id="btn-nav-mobile-nominate-teacher">` | Styled `<Link id="btn-nav-mobile-nominate-teacher">` |

Routes are unchanged (`/nominate-student`, `/nominate-teacher`). No other live `Link > button` pairs were found.

---

## 6. Contrast

Only meaningful small text that composites below ~4.5:1 on `#0a0a0a` was raised. Floor used: Tailwind `text-white/50` (~5.3:1 on `#0a0a0a`). `text-white/55` and higher on the hero subtitle / How-it-works body were **left unchanged**. Placeholders were not changed.

| Element | Before | After | Reason |
|---|---|---|---|
| Footer brand blurb | `text-white/35` | `text-white/50` | Body copy, 13px |
| Footer “Navigate” / “Awards” headings | `text-white/25` | `text-white/50` | 11px labels |
| Footer nav links | `text-white/45` | `text-white/60` | 14px links; keep slightly stronger than headings |
| Footer award names | `text-white/35` | `text-white/50` | Readable list text |
| Footer copyright | `text-white/20` | `text-white/50` | 11px legal |
| Footer Privacy / Terms / Grievance | `text-white/30` hover `/60` | `text-white/50` hover `/80` | Links |
| Hero “By continuing you agree…” | `text-white/30` | `text-white/50` | 11px legal |
| Hero Terms / Privacy links | `text-white/50` | `text-white/70` | Links must stay above surrounding copy |
| Hero “Are you a teacher?” | `text-white/40` | `text-white/50` | 14px body + link |
| Final CTA teacher prompt | `text-white/40` | `text-white/50` | Same |
| Final CTA “Free · Takes 3 minutes…” | `text-white/30` | `text-white/50` | 12px copy |
| Login back / resend / helper / footer line | `/40`, `/30`, `/20` | `text-white/50` | Controls and helper text |
| `FormTextarea` “(optional)” | `text-white/35` | `text-white/50` | Label fragment |
| Teacher photo “(optional, max 3MB)” | `text-white/35` | `text-white/50` | Label fragment |

Footer muted text is slightly brighter; hierarchy (headings vs links vs hover) is preserved.

---

## 7. Production bundle

`npm run build` (Vite 5.4.19), 28 August 2026.

### Asset comparison vs Phase 7.1

| Asset | Phase 7.1 | Phase 7.2 | Difference |
|---|---|---|---|
| `index.html` | 6.98 kB / 2.47 gzip | **6.33 kB / 2.20 gzip** | **−0.65 / −0.27** (Snap snippet removed) |
| `index-*.css` | 75.22 / 13.27 | 75.18 / 13.27 | −0.04 / 0 |
| `index-*.js` | 85.98 / 27.68 | **86.73 / 27.91** | **+0.75 / +0.23** (Snap stub + inject) |
| `vendor-react` | 163.72 / 53.32 | 163.72 / 53.32 | 0 |
| `vendor-ui` | 26.83 / 5.71 | 26.83 / 5.71 | 0 |
| `vendor-motion` | 114.27 / 37.75 | 114.27 / 37.75 | 0 (still lazy) |
| `AdminPage` | 668.13 / 186.97 | 668.13 / 186.97 | 0 (still lazy) |
| `InlineNominationForm` | 16.98 / 5.11 | 18.88 / 5.39 | +1.90 / +0.28 (`sr-only` labels) |
| `MobileOtpField` | 11.64 / 4.66 | 11.67 / 4.68 | +0.03 / +0.02 |
| `LoginPage` | 7.98 / 2.53 | 8.13 / 2.58 | +0.15 / +0.05 |
| `TeacherPhotoUpload` | 3.25 / 1.53 | 3.30 / 1.54 | +0.05 / +0.01 |
| `FinalCTASection` | 2.88 / 1.22 | 2.88 / 1.22 | 0 (class names only) |

**Initial `/` JS (modulepreloaded):** `vendor-react` + `vendor-ui` + `index` ≈ **277.3 kB** minified / **87.0 kB** gzip (was 276.5 / 86.7).

### Confirmations

| Check | Result |
|---|---|
| Snap `<script src="https://sc-static.net/scevent.min.js">` in `dist/index.html` | **Absent** |
| Snap URL / ID in first-party JS | Present in `index-BqZ3Nm6W.js` only (`niat-snap`, `eaf0e62f-…`, `sc-static.net/scevent.min.js`) |
| GA / Pixel / Clarity vendor URLs in HTML | **Absent** (gtag **stub** only; noscript Pixel img unchanged) |
| `apple-mobile-web-app-capable` | **Absent** |
| `mobile-web-app-capable` | Present |
| Modulepreloads | `vendor-react`, `vendor-ui`, entry JS, CSS — **no** `vendor-motion`, **no** Admin/OTP/form |
| `vendor-motion` off `/` | Yes — still a dynamic import from form/login/thank-you/404 |
| Admin / OTP / form / photo lazy | Yes — listed in `__vite__mapDeps` |

---

## 8. Expected Lighthouse impact

**Not re-measured in this environment.** No score deltas are claimed.

### High confidence

- Best Practices: Snap no longer parses during HTML load → fewer third-party console/Issues on first document parse; HTML matches Phase 3’s “no vendor `src` in the shell.”
- Best Practices: removing deprecated `apple-mobile-web-app-capable` should clear that deprecation if it was failing.
- Accessibility (mobile): named hamburger + `inert` closed menu should close most of the 88 vs 96 gap (`button-name`, `aria-hidden-focus`).
- Accessibility: hero `htmlFor`/`id` should pass axe **label** on the default homepage card.
- Accessibility: no nested interactive in the navbar.

### Medium confidence

- TBT: Snap parse/eval moves after first paint (same window as gtag/Pixel). Lab TBT may drop some, not all — Clarity’s 2.5s timeout is unchanged (Phase 7.3).
- Contrast: footer/legal/`/30`–`/40` copy should pass color-contrast; remaining `/55` body was left on purpose.
- Login / nomination-form labels: help those routes, not the default PSI URL unless the user is already in OTP/form.

### Requires browser verification

- PSI Best Practices and Accessibility on production `/`
- Snap Network: `scevent.min.js` appears **after** first paint, one request, `PAGE_VIEW` still sent
- Keyboard: Tab skips closed mobile menu; opens and reaches links when the menu is open
- Visual: footer/legal text slightly brighter; nominate buttons look the same as links
- VoiceOver/TalkBack: hamburger name and menu expand state

---

## 9. Visual and behavioral changes

| Area | Visible / functional change? |
|---|---|
| Snap | **Timing only.** PAGE_VIEW fires after first paint instead of during HTML parse. ID and event unchanged. |
| Apple meta | None for Chrome; iOS “web app capable” still set via `mobile-web-app-capable`. |
| Mobile menu | **No visual redesign.** Same animation. Keyboard/AT behavior when closed is now correct (`inert`). |
| Nominate controls | Same look; they are links instead of nested buttons. Same routes. |
| Hero name/phone | **No layout change** (labels were already visible). |
| Nomination form | **No layout change** (`sr-only` labels). |
| Login | **No layout change** (labels sit inside existing headings). |
| Footer / hero legal / Final CTA / Login helpers | **Slightly brighter muted text** so small copy meets contrast. Not a layout change. |
| Hero H1 / card animations, below-fold lazy scheduling, Auth, motion, fonts, images | **Unchanged** (explicitly out of scope). |

---

Phase 7.2 ends here. Do not start Phase 7.3 from this report.
