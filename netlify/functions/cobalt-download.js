/**
 * Netlify Serverless Function: Download via Cobalt API
 *
 * Cobalt is a completely FREE, open-source, no-API-key-needed media downloader.
 * It is the exact same technology used by yt1s, y2mate, and similar sites.
 * GitHub: https://github.com/imputnet/cobalt
 *
 * Supports: Audio only (MP3), Video only (MP4), or Video+Audio (MP4)
 *
 * Query params:
 *   ?id=VIDEO_ID        (YouTube video ID)
 *   &mode=audio|video   (download mode)
 */

const COBALT_INSTANCES = [
  'https://cobalt-api.ggtyler.dev',
  'https://api.cobalt.tools',
  'https://cobalt.api.lisbot.dev',
];

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export default async (req) => {
  const url = new URL(req.url);
  const videoId = url.searchParams.get('id');
  const mode = url.searchParams.get('mode') || 'audio'; // 'audio' or 'video'

  if (!videoId) {
    return new Response(JSON.stringify({ error: 'Missing video ID' }), { status: 400, headers: corsHeaders });
  }

  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

  for (const instance of COBALT_INSTANCES) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const body = {
        url: youtubeUrl,
        videoQuality: mode === 'audio' ? undefined : '720',
        audioFormat: 'mp3',
        downloadMode: mode === 'audio' ? 'audio' : 'auto',
        filenameStyle: 'basic',
      };

      const res = await fetch(`${instance}/`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
      });
      clearTimeout(timeout);

      if (!res.ok) continue;

      const data = await res.json();

      // Cobalt returns { status: 'stream'|'redirect'|'tunnel', url: '...' }
      if ((data.status === 'stream' || data.status === 'redirect' || data.status === 'tunnel') && data.url) {
        return new Response(JSON.stringify({ downloadUrl: data.url, source: 'cobalt', instance }), {
          status: 200,
          headers: corsHeaders,
        });
      }

      if (data.status === 'picker' && data.picker?.length > 0) {
        // Cobalt returned multiple streams (rare), pick first
        return new Response(JSON.stringify({ downloadUrl: data.picker[0].url, source: 'cobalt', instance }), {
          status: 200,
          headers: corsHeaders,
        });
      }

    } catch {
      continue;
    }
  }

  return new Response(JSON.stringify({ error: 'Download service unavailable. Please try again shortly.' }), {
    status: 503,
    headers: corsHeaders,
  });
};
