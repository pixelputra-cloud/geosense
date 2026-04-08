import { useRef, useCallback, useEffect, useState } from 'react';
import Scene from './components/Scene/Scene';
import CountryCard from './components/CountryCard/CountryCard';
import GestureCursor from './components/GestureCursor/GestureCursor';
import GestureHUD from './components/GestureHUD/GestureHUD';
import WebcamPreview from './components/WebcamPreview/WebcamPreview';
import Onboarding from './components/Onboarding/Onboarding';
import MobileBanner from './components/MobileBanner/MobileBanner';
import useHandGesture from './hooks/useHandGesture';
import useAppStore from './store/useAppStore';

function Header() {
  const toggleWebcamPreview = useAppStore((s) => s.toggleWebcamPreview);
  const showWebcamPreview = useAppStore((s) => s.showWebcamPreview);
  const isWebcamActive = useAppStore((s) => s.isWebcamActive);
  const dismissOnboarding = useAppStore((s) => s.dismissOnboarding);
  const showOnboarding = useAppStore((s) => s.showOnboarding);

  // Reset onboarding for help button
  const showHelp = () => {
    useAppStore.setState({ showOnboarding: true });
  };

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      padding: '14px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 'var(--z-header)',
      background: 'linear-gradient(to bottom, rgba(5, 8, 16, 0.8) 0%, transparent 100%)',
      pointerEvents: 'none',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.25rem',
        color: 'var(--text-primary)',
        letterSpacing: '0.02em',
        pointerEvents: 'auto',
      }}>
        GeoSense
        <span style={{
          fontSize: '0.5rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--accent-cyan)',
          marginLeft: '8px',
          letterSpacing: '0.12em',
          verticalAlign: 'middle',
        }}>
          3D EARTH EXPLORER
        </span>
      </div>

      <div style={{ display: 'flex', gap: '8px', pointerEvents: 'auto' }}>
        <button
          onClick={showHelp}
          style={{
            padding: '5px 12px',
            background: 'rgba(8, 14, 28, 0.7)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '16px',
            color: 'var(--text-muted)',
            fontSize: '0.65rem',
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            transition: 'color 0.15s ease, border-color 0.15s ease',
          }}
          onMouseEnter={e => { e.target.style.color = 'var(--accent-cyan)'; e.target.style.borderColor = 'var(--accent-cyan)'; }}
          onMouseLeave={e => { e.target.style.color = 'var(--text-muted)'; e.target.style.borderColor = 'rgba(0, 212, 255, 0.3)'; }}
        >
          ?  Help
        </button>
      </div>
    </header>
  );
}

function GestureController({ videoEl }) {
  useHandGesture(videoEl);
  return null;
}

export default function App() {
  // useState (not useRef) so MediaPipe effect re-runs when video mounts
  const [videoEl, setVideoEl] = useState(null);

  const handleVideoRef = useCallback((el) => {
    if (el) setVideoEl(el);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const state = useAppStore.getState();
      const sensitivity = 0.05;
      switch (e.key) {
        case 'ArrowLeft':
          state.setGlobeRotation(state.globeRotX, state.globeRotY - sensitivity);
          break;
        case 'ArrowRight':
          state.setGlobeRotation(state.globeRotX, state.globeRotY + sensitivity);
          break;
        case 'ArrowUp':
          state.setGlobeRotation(state.globeRotX - sensitivity, state.globeRotY);
          break;
        case 'ArrowDown':
          state.setGlobeRotation(state.globeRotX + sensitivity, state.globeRotY);
          break;
        case '+':
        case '=':
          state.setGlobeScale(state.globeScale + 0.1);
          break;
        case '-':
          state.setGlobeScale(state.globeScale - 0.1);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#050810' }}>
      {/* 3D Scene */}
      <Scene />

      {/* Header */}
      <Header />

      {/* Gesture controller — receives video element via state so effect re-runs on mount */}
      <GestureController videoEl={videoEl} />

      {/* UI Overlays */}
      <CountryCard />
      <GestureCursor />
      <GestureHUD />

      {/* Webcam preview (passes video element ref up) */}
      <WebcamPreview onVideoRef={handleVideoRef} />

      {/* First-time onboarding */}
      <Onboarding />

      {/* Mobile / touch-only device notice */}
      <MobileBanner />
    </div>
  );
}
