import { useEffect, useRef, useState } from 'react';
import useAppStore from '../../store/useAppStore';
import styles from './CountryCard.module.css';

function relativeTime(pubDate) {
  if (!pubDate) return '';
  const diff = Date.now() - new Date(pubDate).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}d ago`;
  if (h >= 1) return `${h}h ago`;
  if (m >= 1) return `${m}m ago`;
  return 'just now';
}

export default function CountryCard() {
  const selectedCountry = useAppStore((s) => s.selectedCountry);
  const countryCardState = useAppStore((s) => s.countryCardState);
  const newsArticles = useAppStore((s) => s.newsArticles);
  const dismissCard = useAppStore((s) => s.dismissCard);
  const [exiting, setExiting] = useState(false);
  const cardRef = useRef();

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => {
      setExiting(false);
      dismissCard();
    }, 220);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && selectedCountry) handleDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedCountry]);

  if (!selectedCountry && !exiting) return null;

  const { iso2, name } = selectedCountry || {};
  const flagUrl = iso2 && iso2 !== '--' ? `https://flagcdn.com/${iso2}.svg` : null;

  return (
    <div ref={cardRef} className={`${styles.card} ${exiting ? styles.exiting : ''}`}>

      {/* Scan line sweep on reveal */}
      <div className={styles.scanSweep} aria-hidden="true" />

      {/* Flag hero banner */}
      <div
        className={styles.flagHero}
        style={flagUrl ? { backgroundImage: `url(${flagUrl})` } : {}}
      >
        <div className={styles.flagOverlay} />
        <div className={styles.heroContent}>
          <h2 className={styles.countryName}>{name}</h2>
          {iso2 && iso2 !== '--' && (
            <span className={styles.isoTag}>{iso2.toUpperCase()}</span>
          )}
        </div>

        {/* Close button */}
        <button className={styles.closeBtn} onClick={handleDismiss} aria-label="Dismiss">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <line x1="1.5" y1="1.5" x2="8.5" y2="8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="8.5" y1="1.5" x2="1.5" y2="8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className={styles.body}>

        {/* Section header */}
        <div className={styles.sectionHeader}>
          <span className={styles.liveDot} />
          <span className={styles.sectionLabel}>Latest Headlines</span>
          <span className={styles.liveTag}>LIVE</span>
        </div>

        <div className={styles.separator} />

        {/* News content */}
        <div className={styles.newsContent}>
          {countryCardState === 'loading' && (
            <div className={styles.skeleton}>
              {[92, 80, 88, 74, 85].map((w, i) => (
                <div key={i} className={styles.skeletonLine} style={{ width: `${w}%`, animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          )}

          {countryCardState === 'loaded' && newsArticles.map((article, i) => (
            <a
              key={i}
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.articleItem}
              style={{ animationDelay: `${0.1 + i * 0.06}s` }}
            >
              <span className={styles.bulletIndex}>{String(i + 1).padStart(2, '0')}</span>
              <div className={styles.articleContent}>
                <p className={styles.articleTitle}>{article.title}</p>
                <div className={styles.articleMeta}>
                  {article.source && (
                    <span className={styles.articleSource}>{article.source}</span>
                  )}
                  {article.source && article.pubDate && (
                    <span className={styles.metaSep}>·</span>
                  )}
                  {article.pubDate && (
                    <span className={styles.articleTime}>{relativeTime(article.pubDate)}</span>
                  )}
                </div>
              </div>
              <span className={styles.articleArrow} aria-hidden="true">↗</span>
            </a>
          ))}

          {countryCardState === 'error' && (
            <p className={styles.errorText}>⚠ Signal lost. Retry shortly.</p>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <span>SRC: GOOGLE NEWS RSS</span>
          <span className={styles.footerSep}>·</span>
          <span>NO TRACKING</span>
        </div>
      </div>
    </div>
  );
}
