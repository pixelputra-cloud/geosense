/**
 * Vercel serverless function — fetches country news from Google News RSS.
 * No API key required. Parses XML server-side to avoid CORS.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { countryName } = req.body || {};
  if (!countryName) {
    return res.status(400).json({ error: 'countryName is required' });
  }

  const query = encodeURIComponent(`${countryName} news`);
  const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en&gl=US&ceid=US:en`;

  try {
    const response = await fetch(rssUrl, {
      headers: { 'User-Agent': 'GeoSense/1.0 (news aggregator)' },
      signal: AbortSignal.timeout(7000),
    });

    if (!response.ok) throw new Error(`RSS fetch failed: ${response.status}`);

    const xml = await response.text();
    const articles = parseRSS(xml).slice(0, 4);

    if (!articles.length) throw new Error('No articles parsed');

    return res.status(200).json({ articles });
  } catch (err) {
    console.error('[news] RSS error:', err.message);
    return res.status(502).json({ error: 'Feed unavailable' });
  }
}

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const rawTitle = extractTag(block, 'title') || '';
    const link = extractTag(block, 'link') || '';
    const source = extractTag(block, 'source') || '';
    const pubDate = extractTag(block, 'pubDate') || '';

    const { title, inferredSource } = splitTitle(rawTitle);
    if (title && link) {
      items.push({ title, link, source: source || inferredSource, pubDate });
    }
  }

  return items;
}

function splitTitle(raw) {
  // Google News format: "Article title - Source Name"
  const lastDash = raw.lastIndexOf(' - ');
  if (lastDash > 10) {
    return {
      title: raw.slice(0, lastDash).trim(),
      inferredSource: raw.slice(lastDash + 3).trim(),
    };
  }
  return { title: raw, inferredSource: '' };
}

function extractTag(xml, tag) {
  const cdata = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`).exec(xml);
  if (cdata) return cdata[1].trim();
  const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`).exec(xml);
  return plain ? decodeEntities(plain[1].trim()) : null;
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, '')
    .trim();
}
