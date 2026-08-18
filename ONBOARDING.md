# GeoSense — 3D Gesture-Controlled Earth Explorer

GeoSense is a browser-based interactive globe that you navigate entirely with hand gestures via your webcam. Point at a country to pull up a fact card, pinch to zoom in, wave to spin the Earth.

## What It Does

- **3D Earth** rendered in WebGL with day/specular/normal textures, animated cloud layer, and a Fresnel atmosphere glow
- **Real satellite orbits** — ISS, Hubble, Tiangong, GPS constellation, and a Starlink train
- **Hand-gesture control** via MediaPipe Hands — no mouse or keyboard required
- **Country cards** — glassmorphism slide-in panel with flag, capital, population, and mock AI-generated news bullets (real Claude API optional)
- **Onboarding modal** — 5-gesture guide that auto-dismisses after 4 s, reopens via Help button

## Gesture Map

| Gesture | Action |
|---|---|
| ✋ Open palm | Rotate globe (Y-axis only) |
| 🤏 Pinch (thumb + index) | Zoom in |
| 🖐 Spread (4 fingers wide) | Zoom out |
| ☝️ Point (hold 400 ms) | Select country |
| ✊ Fist | Dismiss country card |

## Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 5 |
| 3D | @react-three/fiber v9, Three.js r183 |
| Gesture | MediaPipe Hands (CDN — not npm) |
| State | Zustand v5 |
| Geo data | d3-geo + GeoJSON in `public/` |
| AI news | Anthropic Claude API (optional, via `api/news.js`) |

## Running Locally

```bash
npm install
npm run dev        # → http://localhost:5173
```

For real AI-generated country news:

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
vercel dev         # → http://localhost:3000
```

## Key Files

| File | What it does |
|---|---|
| `src/hooks/useHandGesture.js` | All MediaPipe gesture detection logic |
| `src/components/Scene/Scene.jsx` | EarthGroup, satellites, canvas setup |
| `src/store/useAppStore.js` | Global Zustand state |
| `src/components/Globe/Satellites.jsx` | ISS, Hubble, Tiangong, GPS, Starlink |
| `src/components/CountryCard/CountryCard.jsx` | Country info panel |
| `src/components/Onboarding/Onboarding.jsx` | Gesture help modal |
| `api/news.js` | Claude API proxy stub |

## Architecture Notes

- **EarthGroup** — Globe, CloudLayer, and Atmosphere are grouped so rotation/scale apply uniformly; satellites are independent
- **MediaPipe via CDN** — npm import causes CJS/ESM mismatch in Vite; `<script>` tags in `index.html` are the fix
- **Atmosphere shader** — front-face Fresnel (not BackSide) to avoid solid-ring artifact; GLSL inlined as JS template strings
- **Gesture X mirroring** — landmark X coords are flipped (`1 - lm.x`) to match the CSS `scaleX(-1)` on the video feed
- **Zustand inside useFrame** — `useAppStore.getState()` (non-reactive) prevents 60 fps re-renders
