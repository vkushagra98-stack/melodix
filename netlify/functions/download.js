/**
 * Netlify Serverless Function: Direct File Downloader
 * 
 * Streams audio (MP3) or video (MP4) with RFC 5987/6266 compliant 'Content-Disposition: attachment'
 * so browsers cleanly download files directly into the Downloads folder, supporting all international
 * character sets (Cyrillic, Hindi/Devanagari, Arabic, Japanese, emojis) without ERR_INVALID_CHAR crashes.
 */

export default async (req) => {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get('url');
  const filename = url.searchParams.get('name') || url.searchParams.get('filename') || 'track.mp3';

  if (!targetUrl) {
    return new Response('Missing target URL', { status: 400 });
  }

  try {
    const userAgent = targetUrl.includes('googlevideo.com')
      ? 'com.google.android.youtube/20.10.35 (Linux; U; Android 13; Pixel 7) gzip'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

    const reqHeaders = {
      'User-Agent': userAgent,
    };
    if (targetUrl.includes('googlevideo.com')) {
      reqHeaders['Origin'] = 'https://www.youtube.com';
      reqHeaders['Referer'] = 'https://www.youtube.com/';
    } else if (targetUrl.includes('saavncdn.com')) {
      reqHeaders['Referer'] = 'https://www.jiosaavn.com/';
    }

    const res = await fetch(targetUrl, {
      headers: reqHeaders,
    });

    if (!res.ok) {
      console.warn(`[Download Proxy] Upstream fetch failed with status ${res.status}`);
      return new Response(`Failed to fetch media from source: ${res.statusText}`, { status: res.status });
    }

    // RFC 5987 / RFC 6266 specification:
    // HTTP header values can only contain ASCII bytes (0-127).
    // Non-ASCII characters (e.g. Russian Cyrillic "Татьяна Куртукова", Hindi, emojis)
    // MUST use filename*=UTF-8''url_encoded_string to prevent Node.js ERR_INVALID_CHAR crash.
    const asciiFallback = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '').trim() || 'track.mp3';
    const utf8Encoded = encodeURIComponent(filename).replace(/['()]/g, escape).replace(/\*/g, '%2A');

    const headers = new Headers();
    const contentType = res.headers.get('content-type') ||
      (filename.endsWith('.mp4') ? 'video/mp4' : 'audio/mpeg');

    headers.set('Content-Type', contentType);
    headers.set(
      'Content-Disposition',
      `attachment; filename="${asciiFallback}"; filename*=UTF-8''${utf8Encoded}`
    );
    headers.set('Access-Control-Allow-Origin', '*');

    const contentLength = res.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new Response(res.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('[Download Proxy] Error:', error?.message || error);
    return new Response('Proxy download failed: ' + (error?.message || 'unknown error'), { status: 500 });
  }
};
