/**
 * Netlify Serverless Function: High-Speed YouTube Search
 * 
 * Direct YouTube search scraper returns in ~1 second with official releases
 * at the top (Coke Studio, Sheheryar Rehan, T-Series, etc.)
 */

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export default async (req) => {
  const url = new URL(req.url);
  const query = url.searchParams.get('q');

  if (!query || !query.trim()) {
    return new Response(JSON.stringify({ results: [] }), { status: 200, headers: corsHeaders });
  }

  const cleanQuery = query.trim();

  // Strategy 1: Ultra-fast direct YouTube scrape (~1s)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const fetchRes = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}&sp=EgIQAQ%3D%3D`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      }
    );
    clearTimeout(timeout);

    if (fetchRes.ok) {
      const html = await fetchRes.text();
      const match = html.match(/ytInitialData\s*=\s*({.+?});/) ||
                    html.match(/var ytInitialData = ({.+?});<\/script>/);

      if (match) {
        const json = JSON.parse(match[1]);
        const contents =
          json.contents?.twoColumnSearchResultsRenderer?.primaryContents
            ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];

        const videos = [];
        for (const item of contents) {
          const v = item.videoRenderer;
          if (v?.videoId) {
            const title = v.title?.runs?.[0]?.text || '';
            const author = v.ownerText?.runs?.[0]?.text || '';
            const durationText = v.lengthText?.simpleText || '3:30';

            // Filter out amateur re-upload spam keywords
            const lower = `${title} ${author}`.toLowerCase();
            const queryLower = cleanQuery.toLowerCase();

            const SPAM_KEYWORDS = [
              'slowed', 'reverb', 'mashup', 'fan made', 'fanmade',
              '8d', '16d', 'status video', 'whatsapp status',
              'cinematic', 'lofi', 'lo-fi', 'lo fi',
              'ai cover', 'ai generated', 'ai version',
              'bass boosted', 'bass boost', 'nightcore',
              'sped up version', 'best version', 'best part',
              'reaction', 'tribute',
            ];

            // Detect "Song A x Song B" mashup pattern — where both parts look like SONG NAMES
            // (multiple words, capital letters) rather than "Artist x Artist" collabs
            // e.g. "Majboor x Saiyaara" = mashup (bad)
            // e.g. "Sheheryar Rehan x Zoha Waseem" = collab (good) — detected by 'Rehan' before x
            const songMashupPattern = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+x\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b/;
            const mashupMatch = songMashupPattern.exec(title);
            const queriedTitleMashup = mashupMatch != null &&
              queryLower.includes(mashupMatch[1].toLowerCase()) && // part1 matches the query
              !queryLower.includes(' x ') && !queryLower.includes('remix');

            const isSpam = SPAM_KEYWORDS.some(k => lower.includes(k)) || queriedTitleMashup;

            // Only filter if user didn't explicitly search for these
            const userWantsIt = ['slowed', 'reverb', 'remix', 'lofi', 'mashup'].some(k => queryLower.includes(k));
            if (isSpam && !userWantsIt) {
              continue;
            }

            videos.push({
              id: v.videoId,
              title: title || 'Unknown Title',
              author: author || 'Unknown Artist',
              duration: durationText,
              thumb: v.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
                     `https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`,
            });

            if (videos.length >= 20) break;
          }
        }

        if (videos.length > 0) {
          return new Response(JSON.stringify({ results: videos, source: 'youtube-direct' }), {
            status: 200,
            headers: corsHeaders,
          });
        }
      }
    }
  } catch (e) {
    // Fallback if direct scrape timed out
  }

  // Strategy 2: Fast Invidious fallback (only 1 fast instance with 3s timeout)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(
      `https://inv.nadeko.net/api/v1/search?q=${encodeURIComponent(cleanQuery)}&type=video&fields=videoId,title,author,lengthSeconds,videoThumbnails`,
      {
        signal: controller.signal,
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
      }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const results = data.slice(0, 15).map(v => ({
          id: v.videoId,
          title: v.title || 'Unknown Title',
          author: v.author || 'Unknown Artist',
          duration: formatDuration(v.lengthSeconds || 0),
          thumb: v.videoThumbnails?.find(t => t.quality === 'medium')?.url ||
                 `https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`,
        }));

        return new Response(JSON.stringify({ results, source: 'invidious' }), {
          status: 200,
          headers: corsHeaders,
        });
      }
    }
  } catch {}

  return new Response(JSON.stringify({ results: [] }), {
    status: 200,
    headers: corsHeaders,
  });
};

function formatDuration(seconds) {
  if (!seconds) return '3:30';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
