/**
 * Vercel serverless function — Claude API proxy for country news summaries.
 *
 * Currently returns mock data. To enable real AI summaries:
 * 1. Add ANTHROPIC_API_KEY to Vercel environment variables
 * 2. Uncomment the real API call below and remove the mock response
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { countryName } = req.body || {};
  if (!countryName) {
    return res.status(400).json({ error: 'countryName is required' });
  }

  // ─── REAL ANTHROPIC API (uncomment when ANTHROPIC_API_KEY is set) ───────────
  // const apiKey = process.env.ANTHROPIC_API_KEY;
  // if (apiKey) {
  //   try {
  //     const response = await fetch('https://api.anthropic.com/v1/messages', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'x-api-key': apiKey,
  //         'anthropic-version': '2023-06-01',
  //         'anthropic-beta': 'web-search-2025-03-05',
  //       },
  //       body: JSON.stringify({
  //         model: 'claude-sonnet-4-20250514',
  //         max_tokens: 300,
  //         tools: [{ type: 'web_search_20250305', name: 'web_search' }],
  //         system: 'You are a concise geopolitical news assistant. Return 2–3 bullet points summarizing the most important recent news in the given country. Be factual, neutral, and educational. Plain bullet points only, no markdown headers.',
  //         messages: [{ role: 'user', content: `What is happening in ${countryName} right now?` }],
  //       }),
  //     });
  //     const data = await response.json();
  //     const text = data.content
  //       .filter((b) => b.type === 'text')
  //       .map((b) => b.text)
  //       .join('\n');
  //     return res.status(200).json({ summary: text });
  //   } catch (err) {
  //     console.error('Claude API error:', err);
  //   }
  // }
  // ─────────────────────────────────────────────────────────────────────────────

  // Stub response (development / no API key)
  const stubs = {
    default: [
      `• ${countryName} remains engaged in active diplomatic discussions with regional partners, navigating a shifting geopolitical landscape shaped by global economic pressures.`,
      `• Domestic policy debates continue around infrastructure investment and energy transition, with lawmakers pushing for accelerated timelines on key reform agendas.`,
      `• Civil society groups have raised concerns over recent legislative measures, prompting national conversations about governance and democratic accountability.`,
    ],
  };

  const bullets = stubs.default;
  const summary = bullets.join('\n');

  return res.status(200).json({ summary });
}
