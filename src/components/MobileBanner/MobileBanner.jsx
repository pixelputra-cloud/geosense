import { useState } from 'react';
import styles from './MobileBanner.module.css';

// Detect touch-only devices (no fine pointer like a mouse)
const isTouchOnly =
  typeof window !== 'undefined' &&
  window.matchMedia('(pointer: coarse)').matches &&
  !window.matchMedia('(pointer: fine)').matches;

export default function MobileBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (!isTouchOnly || dismissed) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <span className={styles.icon}>📷</span>
        <div className={styles.text}>
          <strong>Front camera gesture control</strong>
          <span>Tap "Show Gestures" to enable hand tracking with your front camera.</span>
        </div>
        <button className={styles.close} onClick={() => setDismissed(true)} aria-label="Dismiss">
          ✕
        </button>
      </div>
    </div>
  );
}
