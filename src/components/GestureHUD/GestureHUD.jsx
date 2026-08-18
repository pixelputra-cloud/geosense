import useAppStore from '../../store/useAppStore';
import styles from './GestureHUD.module.css';

const GESTURE_LABELS = {
  open_palm: { emoji: '✋', label: 'Rotating'        },
  spread:    { emoji: '🖐', label: 'Zooming'         },
  pinch:     { emoji: '🤏', label: 'Select Country'  },
  point:     { emoji: '☝️', label: 'Pointing'        },
  fist:      { emoji: '✊', label: 'Paused'          },
};

export default function GestureHUD() {
  const activeGesture = useAppStore((s) => s.activeGesture);
  const isWebcamActive = useAppStore((s) => s.isWebcamActive);

  if (!isWebcamActive || activeGesture === 'none' || !GESTURE_LABELS[activeGesture]) {
    return null;
  }

  const { emoji, label } = GESTURE_LABELS[activeGesture];

  return (
    <div className={styles.hud}>
      <div className={styles.badge}>
        <span className={styles.indicator} />
        <span className={styles.emoji}>{emoji}</span>
        <span className={styles.divider} />
        <span className={styles.label}>{label}</span>
      </div>
    </div>
  );
}
