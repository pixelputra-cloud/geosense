# GeoSense — Project Case Study

**Live:** https://3dglobe-sigma.vercel.app  
**Stack:** React 19 · Three.js · MediaPipe · Zustand · Vercel  
**Author:** Vidhyashankar Venkat

---

## The Concept

The goal was simple to state and hard to execute: build a globe you hold in your hand.

No mouse. No keyboard. You raise your open palm to your webcam and the Earth spins. You pinch your fingers and it zooms. You point at India — and a panel slides in with today's headlines from New Delhi.

The north-star experience from the PRD:

> *"A student or curious adult opens the app, raises their hand to the webcam, and within seconds they are spinning the Earth, diving into India, and reading today's top headlines — without touching their keyboard or mouse."*

This sits at the intersection of three things that are individually approachable but genuinely difficult to combine well: real-time computer vision, 3D WebGL rendering, and live data — all running in a browser tab, with no install.

---

## What It Does

- **3D Earth** rendered in WebGL — NASA Blue Marble textures (day map, specular, normal), animated cloud layer, and a Fresnel atmosphere limb glow
- **5 real satellite orbits** — ISS (amber), Hubble (blue), Tiangong (red-orange), GPS constellation (4-satellite MEO ring), Starlink train (6-satellite trail)
- **Hand-gesture control** via MediaPipe Hands — 21-landmark webcam tracking, no install required
- **Country cards** — glassmorphism panel slides in on country selection: flag, name, ISO code, and live news headlines
- **Live news feed** — real current headlines per country via Google News RSS, zero API cost, links back to original publishers
- **Mouse + touch fallback** — full interaction without a webcam; arrow keys, scroll, click all work

---

## Gesture Vocabulary

| Gesture | Detection | Action |
|---|---|---|
| ✋ Open palm | ≥3 fingers extended | Rotate globe (Y-axis, EMA-smoothed) |
| 🤏 Pinch | Thumb + index distance / hand size < 0.4 | Zoom in |
| 🖐 Spread | 4 fingers, spread ratio > 0.9 | Zoom out |
| ☝️ Point | Only index extended, held 400ms | Select country → news card |
| ✊ Fist | 0 fingers extended | Dismiss card |

---

## Tech Stack — and Why

### React 19 + Vite 5
React for component model and state management. Vite for near-instant HMR during development and a clean ESM build. No Next.js — this is a pure client-side experience with a single serverless function; the overhead of SSR would add complexity for zero benefit.

### @react-three/fiber v9 + Three.js r183
R3F lets Three.js live inside a React component tree. This means globe state (rotation, scale, selected country) stays in the same Zustand store as the rest of the UI — no separate imperative Three.js render loop to synchronise. The `useFrame` hook plugs directly into the animation frame.

### MediaPipe Hands — via CDN, not npm
This was the first major technical decision. MediaPipe ships as a CommonJS module. Vite bundles ESM. Importing `@mediapipe/hands` through npm caused a CJS/ESM mismatch that broke the Vite build entirely.

The fix: load MediaPipe via `<script>` tags in `index.html`, letting it attach to `window` as a global. This bypasses the module system entirely and is how MediaPipe is documented for browser use anyway. It adds ~1.5MB of CDN payload but eliminates the build problem cleanly.

### Zustand v5
Global state for globe transform, gesture state, and country card lifecycle. The critical pattern: inside `useFrame` (which runs at 60fps), state is read via `useAppStore.getState()` rather than the reactive hook. This prevents 60fps re-renders of every subscribed component — the globe just reads the current value and moves on.

### d3-geo + GeoJSON
Country detection from a 3D intersection point: ray from camera through the fingertip's screen coordinates → sphere intersection → lat/lon conversion → `d3-geo` point-in-polygon test against Natural Earth 110m GeoJSON. The GeoJSON file lives in `public/` and is fetched at runtime, avoiding a Rollup JSON parse error that occurred when bundling it as an import.

### CSS Modules + CSS custom properties
No Tailwind. The design system is hand-authored design tokens in `tokens.css` — colour palette, spacing, z-index ladder, typography scale. CSS Modules provide scoped class names per component. This combination gives full control over the dark-cosmos aesthetic without fighting a utility framework.

---

## Architecture — The EarthGroup Decision

The Earth system has three mesh layers:
- **Globe** — `MeshPhongMaterial` with day/specular/normal textures
- **CloudLayer** — separate sphere at scale 1.005, drifts +0.0002 rad/frame
- **Atmosphere** — Fresnel shader, additive blending, scale 1.08

Early in the build, these were transformed individually. When the globe rotated, the clouds and atmosphere lagged or misaligned. The fix was grouping all three in a single `<group>` — the `EarthGroup` — and applying all rotation and scale to the group. Individual meshes never move relative to each other; only the group does. Satellites are deliberately excluded from the group so they orbit independently.

---

## Key Technical Challenges

### 1. Atmosphere shader — front-face, not back-face Fresnel

The common tutorial approach for atmosphere glow is a back-face Fresnel shader: render the atmosphere sphere's inside faces, where normals point away from the camera at the limb. This produces a ring, but in practice at close zoom levels it renders as a solid-coloured disc that covers the globe.

The fix was switching to a **front-face Fresnel** shader: render the outer faces and compute glow based on the dot product of the surface normal and the view direction. The glow is strongest where normals are perpendicular to the view (the limb) and falls off toward the centre. No solid-ring artifact, correct at any zoom.

GLSL shaders are inlined as JavaScript template strings rather than imported `.glsl` files — `vite-plugin-glsl` was unreliable in dev mode for this project.

### 2. Gesture X-coordinate mirror

MediaPipe returns hand landmark coordinates where X=0 is the left edge of the video frame. The webcam preview is rendered with `CSS scaleX(-1)` (mirrored) so users see a natural mirror-image of themselves. Without correcting for this, moving your hand right would spin the globe left.

Fix: all MediaPipe X coordinates are transformed as `1 - lm.x` before use. One line, but it took careful debugging to identify — the gesture cursor was tracking correctly in the preview but globe rotation was inverted.

### 3. Gesture timer reset bug

The original gesture state machine used debounce timers to transition between states (IDLE → ROTATING, IDLE → ZOOMING). These timers were being cancelled and restarted every frame because the detection callback ran on every MediaPipe result. ROTATING state never triggered because the timer reset before it could fire.

Fix: removed the timers for rotate and zoom entirely — these gestures are immediate, continuous, and should respond in the same frame they're detected. Only the POINT gesture retains a timer (400ms hold before country lookup fires), which is intentional to prevent accidental triggers.

### 4. MediaPipe re-initialisation on video mount

The hand tracking pipeline needs to be initialised with a reference to the `<video>` element. This reference was originally stored in a `useRef`, which doesn't trigger a React effect re-run when the video element mounts. MediaPipe would initialise before the video was in the DOM and then silently fail.

Fix: the video element reference is stored in `useState` instead of `useRef`. Setting state when the video mounts triggers a re-render, which re-runs the MediaPipe initialisation `useEffect` with the actual DOM element present.

### 5. The news feed evolution

**Original plan (PRD):** Claude API with web search tool — AI-synthesised news summaries per country.

**Problem discovered:** Every country card open = one API call on the developer's Anthropic account. No rate limiting. A visitor exploring 20 countries runs 20 API calls. The cost is small per call but scales with every visitor and provides no value if visitors can't access the raw sources anyway.

**Considered alternatives:**
- NewsAPI.org — 100 req/day free tier (too restrictive for a public site)
- GNews — 100 req/day (same problem)
- MediaStack — 500/month (not enough)
- **Google News RSS** — unlimited, free, public, no API key, country-specific queries, links to original publishers

**Final approach:** `api/news.js` (Vercel serverless function) fetches `https://news.google.com/rss/search?q={country}+news` server-side (no CORS issues), parses the RSS XML with a lightweight regex parser, and returns up to 4 articles as `{ title, link, source, pubDate }` objects. The client renders them as clickable links back to the original news source. Zero cost, zero tracking, real current headlines.

**Local dev without Vercel CLI:** Rather than requiring `vercel dev` (which needs authentication), a Vite plugin (`configureServer` hook) serves the same RSS handler inline. The identical RSS logic runs in both environments; only the host differs.

### 6. The CSS Modules production keyframe bug

This one was caught by DOM inspection after the live deployment showed empty news cards.

The article elements existed in the DOM (confirmed via `document.querySelectorAll`). Their `display` was `flex`, `visibility` was `visible`. But `opacity` was `0` on all of them.

The cause: Vite's CSS Modules in production builds scope `@keyframes` references inside module files. `animation: staggerIn` in `CountryCard.module.css` was being compiled to `animation: _staggerIn_1yqzy_1_`. But the actual `@keyframes staggerIn` lived in `global.css` with its original unscopeed name. The animation referenced a keyframe that didn't exist under that name; it silently failed, leaving all article elements permanently invisible via the CSS `opacity: 0` default.

This doesn't manifest in development mode, where CSS Modules process differently.

Fix: define `@keyframes staggerIn` directly inside `CountryCard.module.css`. The build tool then scopes both the declaration and the reference identically — they match, the animation runs, articles are visible.

> **The lesson:** In Vite CSS Modules, if you use a global keyframe in a module's `animation:` property, define that keyframe locally in the same module file. Global keyframe names and module-scoped animation references don't mix in production builds.

---

## Deployment Architecture

```
Browser
  │
  ▼
Vercel CDN — React/Vite static build
  3dglobe-sigma.vercel.app
  │
  │  POST /api/news  (same origin, no CORS)
  ▼
Vercel Serverless Function — api/news.js
  │
  │  fetch (server-side)
  ▼
Google News RSS — news.google.com/rss/search
  Free, public, no API key
```

- **HTTPS everywhere** — required for webcam access (`getUserMedia` blocked on HTTP)
- **Same-origin API** — `/api/news` is on the same domain as the frontend; no CORS headers needed
- **Session cache** — each country's articles are stored in `sessionStorage` by ISO code; re-visiting a country within a tab doesn't re-fetch
- **In-memory Zustand cache** — a second cache layer in the app store; cache hits skip the `fetch` call entirely and resolve synchronously
- **Auto-deploy** — every `git push origin master` triggers a Vercel rebuild; typically live in under 60 seconds

---

## Design Language

**Aesthetic direction:** dark cosmos meets mission control. NASA imagery, editorial typography, cyan-on-deep-navy data UI.

| Token | Value | Used for |
|---|---|---|
| `--bg-deep` | `#050810` | App background |
| `--accent-cyan` | `#00D4FF` | Borders, highlights, gesture cursor |
| `--accent-amber` | `#FFB830` | ISS glow, satellite trails, LIVE badge |
| `--font-display` | DM Serif Display | Country names, app title |
| `--font-mono` | Space Mono | All data labels, news text, ISO codes |
| Card background | `rgba(8,14,28,0.85)` + `backdrop-filter: blur(12px)` | Glassmorphism panels |

The country card uses corner bracket pseudo-elements (`::before`, `::after`) to give a HUD/targeting-reticle feel without adding DOM nodes.

---

## What This Demonstrates

- **WebGL + React integration** — bridging imperative Three.js with declarative React without performance leakage
- **Real-time computer vision in the browser** — MediaPipe at 60fps with gesture classification and coordinate transformation
- **Zero-cost public data strategy** — replacing a paid API with a free RSS feed, server-proxied to avoid CORS
- **Production build debugging** — identifying a CSS Modules scoping issue that only manifests in production via DOM inspection (`computedStyle.animationName`)
- **Vite plugin authoring** — writing a `configureServer` middleware to serve API routes locally without external tooling
- **Design system thinking** — CSS custom properties, token-based typography and spacing, consistent animation vocabulary across components

---

## Numbers

| Metric | Value |
|---|---|
| Satellites simulated | 5 (ISS, Hubble, Tiangong, GPS ×4, Starlink ×6) |
| Gesture types | 5 |
| Landmark points tracked per hand | 21 |
| Countries detectable | ~180 (Natural Earth 110m GeoJSON) |
| News articles per country | Up to 4 (live, current) |
| API cost per country click | $0.00 |
| Time from git push to live | ~60 seconds |

---

## Quotable Moments

> "We replaced a paid AI API with a free RSS feed — not because we couldn't afford it, but because every visitor shouldn't be paying for our architecture choices."

> "The articles were in the DOM. Display was flex. Visibility was visible. Opacity was 0 on all four. The data was there the whole time — just invisible."

> "MediaPipe imports as CommonJS. Vite bundles ESM. The solution was to stop trying to import it at all."

> "Moving your hand right was spinning the globe left. One line: `1 - lm.x`. Mirror the X coordinate to match the mirrored video feed."

> "The globe, clouds, and atmosphere are one group. Rotate the group. Everything stays aligned. Took five minutes to fix a problem that had existed for two weeks."

---

## Social Media Angles

**The technical hook:**
Built a 3D globe you control with hand gestures — entirely in the browser, no install. Five gestures: spin, zoom in, zoom out, point to select a country, fist to close. Live news for every country, zero API cost.

**The problem-solving hook:**
Spent an hour debugging empty news cards. The data was in the DOM. The elements existed. They just had `opacity: 0`. CSS Modules scopes keyframe names in production builds. Global keyframes don't match module-scoped animation references. One misaligned name, four invisible articles.

**The architecture decision hook:**
We designed for an AI-powered news feed (Claude API). Then asked: who pays when 500 people click on 20 countries each? Switched to Google News RSS — server-proxied, free, real headlines, links to original publishers. Better for users too.

**The "I didn't know you could do that" hook:**
You can write Vite plugins that add API routes directly to the dev server. `configureServer` + `server.middlewares.use('/api/news', handler)` — same RSS logic running locally and in production serverless, no Vercel CLI, no auth, no separate process.
