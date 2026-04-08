const MOCK_SUMMARIES = [
  (name) => `• ${name} continues active diplomatic engagement with regional and global partners, navigating an evolving geopolitical landscape shaped by trade dynamics and security considerations.`,
  () => `• Economic indicators show resilience in key sectors, with growth in technology and services sectors partially offsetting inflationary pressures affecting households.`,
  (name) => `• Domestic policy discussions in ${name} are focused on infrastructure modernization, climate adaptation, and social equity — themes that dominate the current legislative agenda.`,
];

/**
 * Fetch a news summary for a given country from the /api/news proxy.
 * Falls back to mock data if the API is unavailable (e.g., in plain vite dev mode).
 * Results are cached in sessionStorage by ISO code.
 */
export async function fetchNewsSummary(countryName, isoCode) {
  const cacheKey = `geosense_news_${isoCode}`;

  // Check session cache
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return cached;
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
    const text = data.summary || data.text || '';
    if (!text) throw new Error('Empty response');

    try { sessionStorage.setItem(cacheKey, text); } catch (_) {}
    return text;
  } catch (_) {
    // API unavailable (dev mode without vercel dev, or network error) — use mock data
    const summary = MOCK_SUMMARIES.map(fn => fn(countryName)).join('\n');
    try { sessionStorage.setItem(cacheKey, summary); } catch (_) {}
    return summary;
  } finally {
    clearTimeout(timeout);
  }
}
