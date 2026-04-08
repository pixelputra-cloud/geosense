import { useEffect, useRef } from 'react';
import useAppStore from '../../store/useAppStore';
import styles from './GestureCursor.module.css';

const CIRCUMFERENCE = 2 * Math.PI * 20; // r=20 → ~125.7

export default function GestureCursor() {
  const fingertipPosition = useAppStore((s) => s.fingertipPosition);
  const activeGesture = useAppStore((s) => s.activeGesture);
  const arcRef = useRef();
  const prevGesture = useRef('none');

  // Reset & trigger countdown arc animation on point gesture start
  useEffect(() => {
    if (activeGesture === 'point' && prevGesture.current !== 'point') {
      const arc = arcRef.current;
      if (arc) {
        arc.classList.remove(styles.counting);
        // Force reflow to restart animation
        void arc.offsetWidth;
        requestAnimationFrame(() => {
          arc.classList.add(styles.counting);
        });
      }
    }
    prevGesture.current = activeGesture;
  }, [activeGesture]);

  if (!fingertipPosition) return null;

  const { x, y } = fingertipPosition;
  const screenX = x * window.innerWidth;
  const screenY = y * window.innerHeight;

  return (
    <div
      className={`${styles.cursor} ${activeGesture !== 'none' ? styles[activeGesture] : ''}`}
      style={{ left: screenX, top: screenY }}
    >
      <div className={styles.dot} />
      <div className={styles.ring} />
      <div className={styles.ripple} />

      {/* Pinch outer ring */}
      <div className={styles.pinchOuter} />

      {/* Point countdown arc */}
      <div className={styles.arcWrapper}>
        <svg width="48" height="48" viewBox="0 0 48 48">
          <circle className={styles.arcBg} cx="24" cy="24" r="20" />
          <circle
            ref={arcRef}
            className={styles.arcFill}
            cx="24"
            cy="24"
            r="20"
          />
        </svg>
      </div>
    </div>
  );
}
