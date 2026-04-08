import { useEffect, useRef, useState } from 'react';
import useAppStore from '../../store/useAppStore';
import styles from './CountryCard.module.css';

function parseBullets(text) {
  if (!text) return [];
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => l.replace(/^[•\-\*]\s*/, ''));
}

export default function CountryCard() {
  const selectedCountry = useAppStore((s) => s.selectedCountry);
  const countryCardState = useAppStore((s) => s.countryCardState);
  const newsSummary = useAppStore((s) => s.newsSummary);
  const dismissCard = useAppStore((s) => s.dismissCard);
  const [exiting, setExiting] = useState(false);
  const cardRef = useRef();

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => {
      setExiting(false);
      dismissCard();
    }, 200);
  };

  // Keyboard: Escape to dismiss
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && selectedCountry) handleDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedCountry]);

  if (!selectedCountry && !exiting) return null;

  const { iso2, name } = selectedCountry || {};
  const bullets = parseBullets(newsSummary);

  return (
    <div ref={cardRef} className={`${styles.card} ${exiting ? styles.exiting : ''}`}>
      <div className={styles.header}>
        {iso2 && iso2 !== '--' ? (
          <img
            className={styles.flag}
            src={`https://flagcdn.com/${iso2}.svg`}
            alt={`${name} flag`}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className={styles.flagPlaceholder} />
        )}
        <span className={styles.countryName}>{name}</span>
        <button className={styles.dismiss} onClick={handleDismiss} aria-label="Dismiss">
          ×
        </button>
      </div>

      <div className={styles.divider} />
      <div className={styles.newsLabel}>📰 Today's Headlines</div>
      <div className={styles.divider} />

      <div className={styles.newsContent}>
        {countryCardState === 'loading' && (
          <div className={styles.skeleton}>
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} />
          </div>
        )}

        {countryCardState === 'loaded' && bullets.map((b, i) => (
          <p key={i} className={styles.bullet}>{b}</p>
        ))}

        {countryCardState === 'error' && (
          <p className={styles.errorText}>
            Live news unavailable. Try again shortly.
          </p>
        )}
      </div>

      <div className={styles.footer}>Source: Claude AI · Live</div>
    </div>
  );
}
