# PRD: GeoSense — Gesture-Controlled 3D Earth Explorer

**Version:** 1.2  
**Author:** Vidhyashankar Venkat  
**Status:** Ready for Development  
**Target:** Claude Code handoff  
**Hosting:** Vercel (static site + serverless API proxy, free Hobby tier)

---

## 1. Product Vision

GeoSense is an educational, browser-based 3D Earth explorer that lets users navigate the globe entirely through single-hand webcam gestures. Users can rotate the Earth, zoom into any region, and point at a country to surface a live data card — showing the country flag, name, and a real-time AI-generated news summary. The experience is designed to feel immersive, cinematic, and effortless: like holding the planet in your hand.

**North star experience:** A student or curious adult opens the app, raises their hand to the webcam, and within seconds they are spinning the Earth, diving into India, and reading today's top headlines — without touching their keyboard or mouse.

---

## 2. Goals & Success Metrics

| Goal | Metric |
|---|---|
| Gesture feels natural | Hand tracking latency < 100ms perceived |
| Earth looks stunning | Photo-realistic NASA textures, atmospheric glow |
| Data is meaningful | Country card loads in < 2s after point gesture |
| Accessible fallback | Full mouse + scroll control always available |
| Educational value | Users can identify & read about 5+ countries in a session |

---

## 3. User Personas

**Primary — Curious Learner (age 14–35)**  
Motivated by exploration. Wants to discover countries, see flags, learn fast facts, and read what's happening in the world today. Drawn in by the novelty of gesture control.

**Secondary — Demo Audience / Portfolio Viewer**  
A developer, recruiter, or designer viewing this as a showpiece. Evaluates technical ambition, polish, and interaction design quality.

---

## 4. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | React 18 + Vite 5 | Fast HMR, modern ESM build |
| 3D Rendering | Three.js via `@react-three/fiber` | Declarative Three.js in React |
| 3D Helpers | `@react-three/drei` | Stars, orbit controls, shaders |
| Hand Tracking | `@mediapipe/hands` + `@mediapipe/camera_utils` | 21-landmark webcam tracking |
| Gesture Logic | Custom React hook `useHandGesture` | Maps MediaPipe landmarks to gestures |
| Country Detection | `d3-geo` + GeoJSON (Natural Earth) | Reverse geo-lookup from lat/lon |
| Country Data | `restcountries.com` public API | Flag, name, capital, population |
| News Summary | Anthropic Claude API (`claude-sonnet-4-20250514`) | Real-time AI news summary per country |
| Styling | CSS Modules + CSS custom properties | No Tailwind; hand-authored design system |
| Fonts | `Space Mono` (mono data) + `DM Serif Display` (headings) | Distinctive pairing for editorial feel |

---

## 5. Core Features

### 5.1 3D Earth Globe

- **Texture layers:**
  - Diffuse map: NASA Blue Marble (8K, day) — `earth_daymap.jpg`
  - Specular map: Ocean reflection — `earth_specular.jpg`
  - Normal map: Surface topography — `earth_normal.jpg`
  - Night map: City lights — `earth_nightmap.jpg` (blended on dark side)
  - Cloud layer: Separate transparent sphere — `earth_clouds.jpg`, slowly rotating
- **Atmosphere:** Additive-blended fresnel shader creating blue limb glow
- **Rotation:** Globe starts with a slow auto-rotation (0.05 rad/s) that pauses when gesture or mouse input is detected
- **Zoom model:** Earth mesh scales up/down (scale gesture), camera position stays fixed. Zoom range: 0.5× – 4× default scale.
- **Renderer:** `WebGLRenderer` with `antialias: true`, `toneMapping: ACESFilmicToneMapping`, `outputColorSpace: SRGBColorSpace`

### 5.2 Scene Composition

| Element | Detail |
|---|---|
| **Starfield** | `<Stars>` from `@react-three/drei`, radius 300, count 8000, random walk |
| **Moon** | Low-poly sphere at ~5× Earth radius, orbiting at 0.02 rad/s, lunar texture |
| **ISS Satellite** | Small glTF or simple geometry, orbiting at 1.5× Earth radius, faster orbit (0.15 rad/s), subtle blue thruster glow |
| **Ambient light** | `AmbientLight` intensity 0.15 |
| **Sun directional light** | `DirectionalLight` at fixed position, intensity 2.0, casts soft shadow on globe |

### 5.3 Hand Gesture System

**Input source:** Webcam via MediaPipe Hands (single hand, primary hand only)  
**Webcam preview:** Small PiP overlay (bottom-left, 160×120px) showing live feed with landmark overlay. Toggle-able via UI button.

#### Gesture Vocabulary

| Gesture | Detection Method | Action |
|---|---|---|
| **Open palm drag** | All 5 fingers extended, wrist moves | Rotate Earth (pan X/Y mapped to globe rotation axes) |
| **Pinch zoom** | Thumb + index finger distance delta | Scale Earth up (open pinch) / down (close pinch) |
| **Index point** | Only index finger extended, others curled | Raycast from index fingertip → globe surface → country lookup |
| **Fist / closed hand** | All fingers curled | Pause / neutral state — no action |

#### Gesture Detection Hook: `useHandGesture`

```
Returns:
  gestureType: 'open_palm' | 'pinch' | 'point' | 'fist' | 'none'
  palmDelta: { dx, dy }        // normalized -1 to 1
  pinchDistance: number        // normalized 0 to 1
  indexTip: { x, y }           // screen-space coords of index fingertip
  confidence: number           // MediaPipe hand confidence score
```

#### Gesture State Machine

```
IDLE ──► ROTATING   (open palm detected, hold > 150ms)
IDLE ──► ZOOMING    (pinch detected, hold > 100ms)
IDLE ──► POINTING   (point detected, hold > 400ms → trigger lookup)
ANY  ──► IDLE       (fist or no hand for > 500ms)
```

- Debounce on gesture transitions: 150ms to prevent jitter
- Smoothing on `palmDelta`: exponential moving average (α = 0.35)
- `point` gesture must be held for 400ms before country lookup fires (prevents accidental triggers)

### 5.4 Country Detection & Info Card

**Detection pipeline:**
1. Index fingertip screen coords → normalized device coordinates
2. `THREE.Raycaster` fires ray from camera through fingertip NDC
3. Ray intersects Earth sphere → get 3D intersection point
4. Convert intersection point to lat/lon (spherical coordinates)
5. `d3-geo` point-in-polygon test against GeoJSON country boundaries
6. Country ISO code resolved → API calls fire

**Country Info Card UI:**

```
┌──────────────────────────────────┐
│  🇮🇳  India                      │
│  ─────────────────────────────── │
│  📰 Today's Headlines            │
│  ─────────────────────────────── │
│  • [AI-generated news summary]   │
│  • [2–3 bullet points]           │
│                                  │
│  [Source: Claude AI · Live]      │
└──────────────────────────────────┘
```

Card appears in the **top-right** of the screen, slides in with a CSS translate animation (200ms ease-out). Dismisses when fist gesture is held for 500ms, or user clicks the × button.

**Flag:** Rendered via `flagcdn.com/{iso2}.svg` (free, no API key needed).

### 5.5 Real-Time News Summary (Claude API)

**Trigger:** Country detected via point gesture (debounced, fires once per unique country per session).

**API call:**
- Model: `claude-sonnet-4-20250514`
- System prompt: *"You are a concise geopolitical news assistant. Given a country name, return 2–3 bullet points summarizing the most important recent news or ongoing situations in that country. Be factual, neutral, and educational. Format as plain bullet points, no markdown headers."*
- User message: `"What is happening in {countryName} right now?"`
- Max tokens: 300
- Web search tool: **enabled** (so Claude can pull genuinely recent headlines)

**Loading state:** Card shows animated skeleton while awaiting API response.  
**Error state:** Fallback to static message: *"Live news unavailable. Try again shortly."*  
**Caching:** Store results in `sessionStorage` keyed by ISO code — avoid re-fetching if user returns to same country.

### 5.6 Mouse + Scroll Fallback

Always active in parallel with gesture input:

| Input | Action |
|---|---|
| Left-click drag | Rotate globe (same sensitivity as open palm) |
| Scroll wheel | Scale globe (same range as pinch) |
| Right-click drag | Pan camera (minor offset, clamped) |
| Click on country | Trigger country lookup (same as point gesture) |

---

## 6. UI / UX Design

### 6.1 Visual Design Language

**Aesthetic direction:** Dark cosmos with editorial data clarity. Think: NASA mission control meets *National Geographic* digital.

- **Background:** Deep space black `#050810`
- **Primary accent:** Electric cyan `#00D4FF` — used for gesture cursor, highlights, card borders
- **Secondary accent:** Warm amber `#FFB830` — used for ISS glow, satellite trail
- **Text:** `#E8EDF5` on dark surfaces
- **Card background:** `rgba(8, 14, 28, 0.85)` with `backdrop-filter: blur(12px)`
- **Card border:** 1px `rgba(0, 212, 255, 0.3)`

### 6.2 Layout

```
┌─────────────────────────────────────────────────┐
│  [GeoSense logo]              [webcam toggle] [?]│
│                                                   │
│              [3D Earth — full viewport]           │
│                                                   │
│                              ┌──────────────────┐│
│                              │  Country Card    ││
│                              └──────────────────┘│
│  ┌──────────┐                                    │
│  │ webcam   │  ← gesture indicator label         │
│  │ preview  │    e.g. "✋ Rotating"               │
│  └──────────┘                                    │
└─────────────────────────────────────────────────┘
```

### 6.3 Gesture Cursor

A custom cursor overlay renders on the canvas tracking the user's **index fingertip** position in screen space:
- Default: small cyan circle (8px), opacity 0.7
- On `point` gesture: ring expands with a ripple, countdown arc fills over 400ms (visual cue that lookup is about to fire)
- On `pinch`: two concentric circles with gap showing pinch distance
- Rendered as a `<div>` overlay (not canvas), using `transform: translate()` for GPU-composited movement

### 6.4 Onboarding Overlay

First-time visit (or on `?` button click) shows a full-screen overlay:

```
  ✋  Open palm  →  Rotate the Earth
  👌  Pinch       →  Zoom in / out
  ☝️  Point & hold → Explore a country
```

Auto-dismisses after 4 seconds or on any gesture/click. Stored in `localStorage` — won't show again after first dismissal.

---

## 7. Application State

```ts
interface AppState {
  // Globe
  globeScale: number;           // 0.5 – 4.0
  globeRotation: [number, number, number];

  // Gesture
  activeGesture: GestureType;
  gestureConfidence: number;
  fingertipPosition: { x: number; y: number } | null;
  isWebcamActive: boolean;

  // Country
  selectedCountry: Country | null;
  countryCardState: 'idle' | 'loading' | 'loaded' | 'error';
  newsSummary: string | null;
  countryCache: Record<string, string>; // ISO → news summary

  // UI
  showOnboarding: boolean;
  showWebcamPreview: boolean;
}
```

---

## 8. File & Folder Structure

```
geosense/
├── public/
│   └── textures/
│       ├── earth_daymap.jpg       # NASA Blue Marble 8K
│       ├── earth_nightmap.jpg     # City lights
│       ├── earth_specular.jpg     # Ocean specular
│       ├── earth_normal.jpg       # Surface normals
│       ├── earth_clouds.jpg       # Cloud alpha map
│       ├── moon.jpg               # Lunar surface
│       └── stars_milkyway.jpg     # Optional skybox
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── components/
│   │   ├── Globe/
│   │   │   ├── Globe.jsx          # Earth mesh, textures, atmosphere shader
│   │   │   ├── CloudLayer.jsx
│   │   │   ├── Atmosphere.jsx     # Fresnel glow shader
│   │   │   ├── Moon.jsx
│   │   │   └── ISSSatellite.jsx
│   │   ├── Scene/
│   │   │   └── Scene.jsx          # R3F Canvas, lighting, stars, camera
│   │   ├── GestureCursor/
│   │   │   └── GestureCursor.jsx  # Fingertip overlay + point countdown arc
│   │   ├── WebcamPreview/
│   │   │   └── WebcamPreview.jsx  # PiP with landmark overlay
│   │   ├── CountryCard/
│   │   │   ├── CountryCard.jsx    # Slide-in info card
│   │   │   └── CountryCard.module.css
│   │   ├── GestureHUD/
│   │   │   └── GestureHUD.jsx     # "✋ Rotating" label
│   │   └── Onboarding/
│   │       └── Onboarding.jsx     # First-time overlay
│   ├── hooks/
│   │   ├── useHandGesture.js      # MediaPipe → gesture state
│   │   ├── useGlobeInteraction.js # Maps gesture deltas to globe transforms
│   │   └── useCountryLookup.js    # Raycaster → GeoJSON → API
│   ├── lib/
│   │   ├── mediapipe.js           # MediaPipe setup & landmark parsing
│   │   ├── geoUtils.js            # lat/lon ↔ 3D point conversion
│   │   ├── countryData.js         # GeoJSON loader + d3-geo point-in-polygon
│   │   └── claudeApi.js           # Anthropic API call wrapper
│   ├── shaders/
│   │   └── atmosphere.glsl        # Fresnel vertex + fragment shader
│   ├── styles/
│   │   ├── global.css
│   │   └── tokens.css             # CSS custom properties / design tokens
│   └── data/
│       └── countries.geojson      # Natural Earth 110m country boundaries
├── api/
│   └── news.js                # Vercel serverless function (Claude API proxy)
├── .env.local                 # ANTHROPIC_API_KEY (git-ignored, local dev only)
├── vercel.json
├── vite.config.js
└── package.json
```

---

## 9. Deployment Architecture

### Overview

GeoSense is hosted on **Vercel (free Hobby tier)**. Vercel serves the React+Vite static build AND runs the Claude API proxy as a serverless function — all from a single repo, zero extra services needed.

```
Portfolio visitor clicks your link
  │
  ▼
Vercel CDN (static)
  geosense.vercel.app — index.html + JS bundle + textures
  │
  │  fetch('/api/news')   ← same domain, no CORS issues
  ▼
Vercel Serverless Function  ◄── ANTHROPIC_API_KEY stored in Vercel env vars
  api/news.js
  │
  ▼
Anthropic Claude API (with web search)
  │
  ▼
JSON news summary back to browser
```

**Why Vercel over GitHub Pages + Cloudflare Worker:**
- Single repo, single deployment — no separate Worker to manage
- `/api/news` is same-origin — no CORS headers needed
- Free Hobby tier covers everything this project needs
- Push to `main` → auto-deploy in ~30 seconds
- HTTPS on every deployment (required for webcam access)

### 9.1 Vercel Serverless Function (API Proxy)

Create `api/news.js` at the project root — Vercel auto-detects any file in `/api/` and deploys it as a serverless function:

```js
// api/news.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { countryName } = req.body;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,  // stored in Vercel dashboard
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'web-search-2025-03-05',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      system: 'You are a concise geopolitical news assistant. Return 2–3 bullet points summarizing the most important recent news in the given country. Be factual, neutral, and educational. Plain bullet points only, no markdown headers.',
      messages: [{ role: 'user', content: `What is happening in ${countryName} right now?` }],
    }),
  });

  const data = await response.json();
  return res.status(200).json(data);
}
```

`claudeApi.js` in the frontend always calls `/api/news` — a relative URL, same origin, no API key ever touches the browser.

### 9.2 Vercel Configuration

```json
// vercel.json (project root)
{
  "rewrites": [{ "source": "/api/(.*)", "destination": "/api/$1" }]
}
```

No `base` path needed in `vite.config.js` — Vercel serves from root by default.

### 9.3 Local Development

```env
# .env.local  (git-ignored, never committed)
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Vite dev server proxies `/api/*` calls to the local serverless function via:

```js
// vite.config.js
export default {
  server: {
    proxy: {
      '/api': 'http://localhost:3000'   // vercel dev local server
    }
  }
}
```

Run locally with: `vercel dev` (instead of `npm run dev`) — this emulates the serverless function locally.

### 9.4 Deployment Steps (one-time setup)

1. Push repo to GitHub
2. Go to vercel.com → New Project → Import your GitHub repo
3. Vercel auto-detects Vite — no config needed
4. Go to Project Settings → Environment Variables → add `ANTHROPIC_API_KEY`
5. Set a **monthly spend limit** in your Anthropic dashboard as a cost guard
6. Click Deploy — your live URL is `geosense.vercel.app` (or custom domain)
7. Every `git push` to `main` auto-deploys from then on

### 9.5 Repository Structure

```
geosense/
  api/
    news.js              ← Vercel serverless function (API proxy)
  src/
  public/
  vercel.json
  vite.config.js
  package.json
  .env.local             ← git-ignored, local dev only
```

### 9.6 Security Notes

| Risk | Mitigation |
|---|---|
| API key exposure | Key stored only in Vercel environment variables — never in source or browser bundle |
| Abuse / runaway costs | Set monthly usage cap in Anthropic dashboard; no auth needed for portfolio traffic |
| Session caching | `sessionStorage` per ISO code prevents redundant serverless calls |
| CORS | Not needed — `/api/news` is same-origin as the frontend |

---

## 10. Performance Targets

| Metric | Target |
|---|---|
| Initial load (textures + JS) | < 5s on broadband |
| Gesture → visual response | < 100ms |
| Country card appearance | < 300ms after point hold |
| News summary load | < 2.5s (Claude API + web search) |
| Frame rate | 60fps on mid-range laptop GPU |
| MediaPipe model load | < 3s (streamed from CDN) |

**Optimization notes:**
- Compress textures to WebP where Three.js supports it
- Use `TextureLoader` with `THREE.Cache` enabled
- Lazy-load GeoJSON country data after initial render
- `useFrame` updates throttled to gesture-active only (skip when idle rotating)

---

## 11. Accessibility & Fallbacks

- **No gesture required:** Full mouse + scroll control available at all times
- **Webcam permission denied:** App works fully in mouse mode; gesture features gracefully disabled with a friendly toast message
- **No WebGL:** Show a static image fallback with a "WebGL required" message
- **Reduced motion:** Respect `prefers-reduced-motion` — disable auto-rotation and card animations
- **Keyboard:** `Escape` dismisses country card; arrow keys nudge globe rotation

---

## 12. Phased Delivery

### Phase 1 — Core Globe (Week 1)
- [ ] Vite + React + R3F scaffold
- [ ] Earth with all texture layers + atmosphere shader
- [ ] Stars, Moon, ISS orbiting
- [ ] Mouse + scroll interaction working
- [ ] Auto-rotation on idle

### Phase 2 — Gesture Input (Week 2)
- [ ] MediaPipe Hands integrated
- [ ] `useHandGesture` hook: open palm, pinch, point, fist
- [ ] Gesture → globe rotation + scale mapped
- [ ] Gesture cursor overlay + HUD label
- [ ] Webcam PiP preview panel

### Phase 3 — Country Detection & Data (Week 3)
- [ ] GeoJSON loaded, `d3-geo` point-in-polygon working
- [ ] Raycaster lat/lon lookup from fingertip position
- [ ] Country card UI with flag + name
- [ ] Claude API integration with web search for news summary
- [ ] Session caching of news results

### Phase 4 — Polish & Onboarding (Week 4)
- [ ] Onboarding overlay
- [ ] Point gesture countdown arc animation
- [ ] Card slide-in / dismiss animations
- [ ] Performance audit + texture compression
- [ ] Responsive layout for 1280px+ screens
- [ ] Final visual QA

### Phase 5 — Deployment (Week 5)
- [ ] Push repo to GitHub
- [ ] Connect repo to Vercel (vercel.com → Import Project)
- [ ] Add `ANTHROPIC_API_KEY` in Vercel Dashboard → Settings → Environment Variables
- [ ] Set Anthropic API usage cap in dashboard (cost guard)
- [ ] Confirm live URL e.g. `geosense.vercel.app`
- [ ] Smoke test: gesture, country card, news summary all working at public URL
- [ ] Add link to portfolio

---

## 13. Open Questions for Dev Kickoff

1. ~~**API key proxying**~~ ✅ **Resolved** — Vercel serverless function at `/api/news.js`. API key stored in Vercel environment variables, same-origin call, no CORS needed.
2. ~~**Hosting platform**~~ ✅ **Resolved** — Vercel free Hobby tier. Push to GitHub → auto-deploy. Live at `geosense.vercel.app`.
3. **GeoJSON resolution:** 110m (smaller, faster) vs 50m (more accurate borders) — recommend 110m for v1.
4. **ISS model:** Use a simple Three.js geometry + material (fastest) or load a glTF model (more realistic)?
5. **News freshness:** Claude's web search tool will return recent results, but should we show a "last updated" timestamp on the card?
6. **Mobile support:** Gesture mode is desktop-webcam only. Should the mobile experience be mouse/touch-only with a banner explaining gesture mode requires desktop?

---

*End of PRD — ready for Claude Code handoff.*
