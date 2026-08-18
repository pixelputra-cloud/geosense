import { useState, useEffect, useRef } from 'react';
import useAppStore from '../../store/useAppStore';
import styles from './Onboarding.module.css';

const GESTURES = [
  { emoji: '✋', name: 'Open Palm',     action: 'Rotate the Earth'              },
  { emoji: '🖐', name: 'Spread + Push', action: 'Zoom in — move hand closer'   },
  { emoji: '🖐', name: 'Spread + Pull', action: 'Zoom out — move hand further' },
  { emoji: '🤏', name: 'Pinch & Hold',  action: 'Explore a country'            },
  { emoji: '✊', name: 'Fist',          action: 'Dismiss / pause'              },
];

const AUTO_DISMISS_MS = 4000;

export default function Onboarding() {
  const showOnboarding = useAppStore((s) => s.showOnboarding);
  const dismissOnboarding = useAppStore((s) => s.dismissOnboarding);
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(0);
  const startTime = useRef(Date.now());
  const rafRef = useRef();

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => dismissOnboarding(), 300);
  };

  useEffect(() => {
    if (!showOnboarding) return;
    startTime.current = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime.current;
      const pct = Math.min((elapsed / AUTO_DISMISS_MS) * 100, 100);
      setProgress(pct);
      if (elapsed >= AUTO_DISMISS_MS) {
        handleDismiss();
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [showOnboarding]);

  if (!showOnboarding) return null;

  const secondsLeft = Math.ceil((AUTO_DISMISS_MS - (progress / 100) * AUTO_DISMISS_MS) / 1000);

  return (
    <div
      className={`${styles.overlay} ${exiting ? styles.exiting : ''}`}
      onClick={handleDismiss}
    >
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>GeoSense</h1>
            <span className={styles.versionTag}>v1.0</span>
          </div>
          <p className={styles.subtitle}>Gesture-Controlled Earth Explorer</p>
        </div>

        {/* Gesture list */}
        <div className={styles.gestures}>
          {GESTURES.map((g) => (
            <div key={g.name} className={styles.gestureRow}>
              <span className={styles.gestureEmoji}>{g.emoji}</span>
              <div className={styles.gestureInfo}>
                <span className={styles.gestureName}>{g.name}</span>
                <span className={styles.gestureAction}>{g.action}</span>
              </div>
              <span className={styles.gestureArrow}>›</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.dismissBtn} onClick={handleDismiss}>
            <span className={styles.dismissBtnText}>Start Exploring</span>
          </button>
          <p className={styles.countdown}>Auto-dismisses in {secondsLeft}s</p>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
        </div>

      </div>
    </div>
  );
}
