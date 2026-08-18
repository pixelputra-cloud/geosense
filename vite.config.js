import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import glsl from 'vite-plugin-glsl';

// ── RSS helpers (mirrors api/news.js for local dev) ───────────────────────────
function splitTitle(raw) {
  const lastDash = raw.lastIndexOf(' - ');
  if (lastDash > 10) {
    return { title: raw.slice(0, lastDash).trim(), inferredSource: raw.slice(lastDash + 3).trim() };
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
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/<[^>]+>/g, '').trim();
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
    if (title && link) items.push({ title, link, source: source || inferredSource, pubDate });
  }
  return items;
}

// Vite plugin: serves POST /api/news inline so vercel dev isn't needed locally
function newsApiPlugin() {
  return {
    name: 'news-api',
    configureServer(server) {
      server.middlewares.use('/api/news', async (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405); res.end('Method not allowed'); return;
        }

        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', async () => {
          try {
            const { countryName } = JSON.parse(body);
            if (!countryName) { res.writeHead(400); res.end('countryName required'); return; }

            const query = encodeURIComponent(`${countryName} news`);
            const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en&gl=US&ceid=US:en`;

            const feed = await fetch(rssUrl, {
              headers: { 'User-Agent': 'GeoSense/1.0' },
              signal: AbortSignal.timeout(7000),
            });

            if (!feed.ok) throw new Error(`RSS ${feed.status}`);
            const xml = await feed.text();
            const articles = parseRSS(xml).slice(0, 4);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ articles }));
          } catch (err) {
            console.error('[news-api]', err.message);
            res.writeHead(502); res.end(JSON.stringify({ error: 'Feed unavailable' }));
          }
        });
      });
    },
  };
}
// ─────────────────────────────────────────────────────────────────────────────

export default defineConfig({
  plugins: [react(), glsl(), newsApiPlugin()],
  optimizeDeps: {
    exclude: ['@mediapipe/hands', '@mediapipe/camera_utils'],
  },
  assetsInclude: ['**/*.glsl'],
});
