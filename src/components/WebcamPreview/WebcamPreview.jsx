import { useEffect, useRef, forwardRef } from 'react';
import useAppStore from '../../store/useAppStore';
import { HAND_CONNECTIONS } from '../../lib/mediapipe';
import styles from './WebcamPreview.module.css';

// Store latest landmarks for canvas drawing
let latestLandmarks = null;

export function setLatestLandmarks(lm) {
  latestLandmarks = lm;
}

const WebcamPreview = forwardRef(function WebcamPreview({ onVideoRef }, ref) {
  const showWebcamPreview = useAppStore((s) => s.showWebcamPreview);
  const isWebcamActive = useAppStore((s) => s.isWebcamActive);
  const isMediaPipeLoading = useAppStore((s) => s.isMediaPipeLoading);
  const isPermissionDenied = useAppStore((s) => s.isPermissionDenied);
  const toggleWebcamPreview = useAppStore((s) => s.toggleWebcamPreview);

  const videoRef = useRef();
  const canvasRef = useRef();
  const rafRef = useRef();

  // Expose video ref to parent for MediaPipe
  useEffect(() => {
    if (onVideoRef && videoRef.current) {
      onVideoRef(videoRef.current);
    }
  }, [onVideoRef]);

  // Draw landmarks on canvas
  useEffect(() => {
    if (!isWebcamActive) return;

    const draw = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) { rafRef.current = requestAnimationFrame(draw); return; }

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (latestLandmarks && latestLandmarks.length > 0) {
        const lm = latestLandmarks;
        const w = canvas.width;
        const h = canvas.height;

        // Draw connections
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
        ctx.lineWidth = 1;
        for (const [a, b] of HAND_CONNECTIONS) {
          ctx.beginPath();
          ctx.moveTo(lm[a].x * w, lm[a].y * h);
          ctx.lineTo(lm[b].x * w, lm[b].y * h);
          ctx.stroke();
        }

        // Draw landmarks
        for (const pt of lm) {
          ctx.beginPath();
          ctx.arc(pt.x * w, pt.y * h, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = '#00D4FF';
          ctx.fill();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isWebcamActive]);

  if (!showWebcamPreview) {
    return (
      <div className={styles.collapsed}>
        <button className={styles.collapsedBtn} onClick={toggleWebcamPreview}>
          📷 Show Gestures
        </button>
        {/* Hidden video must still be in DOM for MediaPipe */}
        <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.preview}>
        <video
          ref={videoRef}
          className={styles.video}
          playsInline
          muted
          style={{ opacity: isWebcamActive ? 1 : 0 }}
        />
        <canvas ref={canvasRef} className={styles.canvas} width={160} height={120} />

        {!isWebcamActive && !isMediaPipeLoading && !isPermissionDenied && (
          <div className={styles.overlay}>
            <span className={styles.statusText}>
              Gesture control ready
            </span>
          </div>
        )}

        {isMediaPipeLoading && (
          <div className={styles.overlay}>
            <span className={styles.statusText}>
              Initializing gesture control<span className={styles.loadingDot}>...</span>
            </span>
          </div>
        )}

        {isPermissionDenied && (
          <div className={styles.overlay}>
            <span className={styles.statusText}>
              Webcam access required for gesture control. Mouse controls active.
            </span>
          </div>
        )}

        {isWebcamActive && <div className={styles.activeDot} />}

        <button className={styles.toggleBtn} onClick={toggleWebcamPreview} aria-label="Hide webcam">
          <span>✕</span>
        </button>
      </div>
    </div>
  );
});

export default WebcamPreview;
