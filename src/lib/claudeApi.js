const MOCK_ARTICLES = (countryName) => [
  {
    title: `${countryName} engages in diplomatic talks with regional partners`,
    link: 'https://www.bbc.com/news/world',
    source: 'BBC News',
    pubDate: new Date(Date.now() - 2 * 3600000).toUTCString(),
  },
  {
    title: `Economic outlook in ${countryName} shows resilience amid global pressures`,
    link: 'https://www.reuters.com/world',
    source: 'Reuters',
    pubDate: new Date(Date.now() - 5 * 3600000).toUTCString(),
  },
  {
    title: `${countryName} domestic policy debates focus on infrastructure and climate reform`,
    link: 'https://apnews.com/world-news',
    source: 'AP News',
    pubDate: new Date(Date.now() - 9 * 3600000).toUTCString(),
  },
];

/**
 * Fetch news articles for a given country via the /api/news RSS proxy.
 * Falls back to mock articles when the API is unavailable (plain vite dev mode).
 * Results are cached in sessionStorage by ISO code.
 */
export async function fetchNewsSummary(countryName, isoCode) {
  const cacheKey = `geosense_news_${isoCode}`;

  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (_) {}

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch('/api/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ countryName }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const data = await res.json();
    const articles = data.articles;
    if (!Array.isArray(articles) || !articles.length) throw new Error('Empty response');

    try { sessionStorage.setItem(cacheKey, JSON.stringify(articles)); } catch (_) {}
    return articles;
  } catch (_) {
    const articles = MOCK_ARTICLES(countryName);
    try { sessionStorage.setItem(cacheKey, JSON.stringify(articles)); } catch (_) {}
    return articles;
  } finally {
    clearTimeout(timeout);
  }
}
