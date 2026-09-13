/**
 * Netlify Serverless Function: Universal YouTube Audio/Video Stream URL Resolver
 *
 * Fallback architecture:
 * 1. InnerTube API: ANDROID (v20.10.35) -> IOS (v20.10.4) for the specific videoId
 * 2. If videoId fails on Netlify's IP (e.g. LOGIN_REQUIRED or UNPLAYABLE):
 *    - For Video: Search YouTube for alternative video of the same track, resolve that stream
 *    - For Audio: JioSaavn licensed studio audio (320kbps/160kbps - works from ANY IP)
 * 3. Returns direct playable/downloadable stream URL
 */

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const INNERTUBE_CLIENTS = [
  {
    name: 'ANDROID',
    clientName: 'ANDROID',
    clientVersion: '20.10.35',
    userAgent: 'com.google.android.youtube/20.10.35 (Linux; U; Android 13; Pixel 7) gzip',
    key: 'AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w',
    clientNumericId: '3',
  },
  {
    name: 'IOS',
    clientName: 'IOS',
    clientVersion: '20.10.4',
    userAgent: 'com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3 like Mac OS X;)',
    key: 'AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc',
    clientNumericId: '5',
  },
];

const SAAVN_BASES = [
  'https://saavn-api-eight.vercel.app',
  'https://saavn.me',
];

/**
 * Fetch high-fidelity audio stream from JioSaavn API.
 * Licensed music CDN (aac.saavncdn.com) — never blocked by datacenter IPs.
 */
async function getJioSaavnAudio(title, artist) {
  const cleanTitle = (title || '').replace(/\(.*?\)|\[.*?\]/g, '').trim();
  const cleanArtist = (artist || '').split(/[,&x/|-]/)[0].trim();
  const queries = [
    cleanArtist ? `${cleanTitle} ${cleanArtist}` : cleanTitle,
    cleanTitle,
  ].filter(Boolean);

  for (const query of queries) {
    for (const base of SAAVN_BASES) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(`${base}/api/search/songs?query=${encodeURIComponent(query)}&limit=3`, {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) continue;

        const data = await res.json();
        const results = data?.data?.results || [];
        if (results.length === 0) continue;

        // Match check: verify title relevance
        for (const song of results) {
          const sName = (song.name || song.title || '').toLowerCase();
          const qWords = cleanTitle.toLowerCase().split(/\s+/).filter(w => w.length > 2);
          const matchCount = qWords.filter(w => sName.includes(w)).length;
          if (qWords.length > 0 && matchCount / qWords.length < 0.3) {
            continue; // Title mismatch, skip
          }

          const dlUrls = Array.isArray(song.downloadUrl) ? song.downloadUrl : [];
          const best = dlUrls.find(d => d.quality === '320kbps')
            || dlUrls.find(d => d.quality === '160kbps')
            || dlUrls.find(d => d.quality === '96kbps')
            || dlUrls[dlUrls.length - 1];

          const audioUrl = best?.url || song.audioUrl;
          if (audioUrl) {
            return {
              url: audioUrl,
              mimeType: audioUrl.includes('.mp3') ? 'audio/mpeg' : 'audio/mp4',
              quality: best?.quality || '320kbps',
              source: 'jiosaavn',
              title: song.name,
            };
          }
        }
      } catch {
        continue;
      }
    }
  }
  return null;
}

/**
 * Search YouTube InnerTube for alternative video IDs of the same track.
 */
async function searchAlternativeYouTubeVideos(query) {
  try {
    const cleanQuery = query.replace(/\(.*?\)|\[.*?\]/g, '').trim();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.youtube/20.10.35 (Linux; U; Android 13; Pixel 7) gzip',
        'X-YouTube-Client-Name': '3',
        'X-YouTube-Client-Version': '20.10.35',
      },
      body: JSON.stringify({
        query: cleanQuery,
        context: { client: { clientName: 'ANDROID', clientVersion: '20.10.35', hl: 'en', gl: 'US' } },
      }),
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json();
    const items = data?.contents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];
    return items
      .map(c => c.compactVideoRenderer?.videoId || c.videoRenderer?.videoId)
      .filter(Boolean)
      .slice(0, 4);
  } catch {
    return [];
  }
}

/**
 * Resolve player stream for a specific video ID using InnerTube clients.
 */
async function resolveInnerTubeStream(videoId, mode, targetQuality = '720') {
  for (const client of INNERTUBE_CLIENTS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);
      const apiUrl = `https://www.youtube.com/youtubei/v1/player?key=${client.key}&prettyPrint=false`;

      const res = await fetch(apiUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': client.userAgent,
          'X-YouTube-Client-Name': client.clientNumericId || '3',
          'X-YouTube-Client-Version': client.clientVersion,
          'Origin': 'https://www.youtube.com',
          'Referer': 'https://www.youtube.com/',
        },
        body: JSON.stringify({
          videoId,
          contentCheckOk: true,
          racyCheckOk: true,
          context: {
            client: {
              clientName: client.clientName,
              clientVersion: client.clientVersion,
              hl: 'en',
              gl: 'US',
            },
          },
        }),
      });
      clearTimeout(timeout);

      if (!res.ok) continue;
      const data = await res.json();

      const playability = data?.playabilityStatus?.status;
      if (playability && playability !== 'OK' && playability !== 'LIVE_STREAM_OFFLINE') {
        continue;
      }

      // VIDEO MODE: find best matching format (muxed audio+video preferred)
      if (mode === 'video') {
        const muxed = (data?.streamingData?.formats || []).filter(f => f.url);
        if (muxed.length > 0) {
          const sorted = muxed.sort((a, b) => {
            const aDiff = Math.abs((a.height || 360) - parseInt(targetQuality, 10));
            const bDiff = Math.abs((b.height || 360) - parseInt(targetQuality, 10));
            return aDiff - bDiff;
          });
          return {
            url: sorted[0].url,
            mimeType: sorted[0].mimeType || 'video/mp4',
            quality: sorted[0].qualityLabel || `${sorted[0].height}p`,
            source: `innertube-${client.name}-video`,
          };
        }

        // Adaptive video stream fallback
        const adaptiveVideo = (data?.streamingData?.adaptiveFormats || [])
          .filter(f => f.mimeType?.startsWith('video/') && f.url)
          .sort((a, b) => {
            const aDiff = Math.abs((a.height || 360) - parseInt(targetQuality, 10));
            const bDiff = Math.abs((b.height || 360) - parseInt(targetQuality, 10));
            return aDiff - bDiff;
          });

        if (adaptiveVideo.length > 0) {
          return {
            url: adaptiveVideo[0].url,
            mimeType: adaptiveVideo[0].mimeType || 'video/mp4',
            quality: adaptiveVideo[0].qualityLabel || `${adaptiveVideo[0].height}p`,
            source: `innertube-${client.name}-adaptive-video`,
          };
        }
      }

      // AUDIO MODE: best adaptive audio format
      const audioFormats = (data?.streamingData?.adaptiveFormats || [])
        .filter(f => f.mimeType?.startsWith('audio/') && f.url)
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

      if (audioFormats.length > 0) {
        return {
          url: audioFormats[0].url,
          mimeType: audioFormats[0].mimeType,
          bitrate: audioFormats[0].bitrate,
          quality: 'high',
          source: `innertube-${client.name}`,
        };
      }

      // Fallback: muxed format has audio track too
      const muxedAudio = (data?.streamingData?.formats || []).filter(f => f.url);
      if (muxedAudio.length > 0) {
        return {
          url: muxedAudio[0].url,
          mimeType: muxedAudio[0].mimeType || 'video/mp4',
          quality: 'standard',
          source: `innertube-${client.name}-muxed`,
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}

export default async (req) => {
  const url = new URL(req.url);
  const videoId = url.searchParams.get('id');
  const mode = url.searchParams.get('mode') || url.searchParams.get('type') || 'audio';
  const quality = url.searchParams.get('quality') || (mode === 'video' ? '720' : '320');
  const title = url.searchParams.get('title') || '';
  const artist = url.searchParams.get('artist') || '';

  if (!videoId && !title && !artist) {
    return new Response(JSON.stringify({ error: 'Missing video id or track details' }), { status: 400, headers: corsHeaders });
  }

  // 1. If a valid videoId is provided, try resolving it directly with InnerTube
  if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    const stream = await resolveInnerTubeStream(videoId, mode, quality);
    if (stream) {
      return new Response(JSON.stringify(stream), { status: 200, headers: corsHeaders });
    }
  }

  // 2. VIDEO FALLBACK: If direct videoId failed on Netlify IP, search alternative video IDs
  if (mode === 'video' && (title || artist)) {
    const searchQuery = [title, artist].filter(Boolean).join(' ');
    const altVideoIds = await searchAlternativeYouTubeVideos(searchQuery);
    for (const altId of altVideoIds) {
      if (altId === videoId) continue;
      const altStream = await resolveInnerTubeStream(altId, mode, quality);
      if (altStream) {
        return new Response(JSON.stringify(altStream), { status: 200, headers: corsHeaders });
      }
    }
  }

  // 3. AUDIO FALLBACK: JioSaavn licensed studio audio (works from ANY datacenter IP)
  if (mode !== 'video' && (title || artist)) {
    const saavnResult = await getJioSaavnAudio(title, artist);
    if (saavnResult) {
      return new Response(JSON.stringify(saavnResult), { status: 200, headers: corsHeaders });
    }

    // Secondary audio fallback: search alternative YouTube video IDs and extract audio
    const searchQuery = [title, artist].filter(Boolean).join(' ');
    const altVideoIds = await searchAlternativeYouTubeVideos(searchQuery);
    for (const altId of altVideoIds) {
      if (altId === videoId) continue;
      const altAudioStream = await resolveInnerTubeStream(altId, 'audio', quality);
      if (altAudioStream) {
        return new Response(JSON.stringify(altAudioStream), { status: 200, headers: corsHeaders });
      }
    }
  }

  return new Response(JSON.stringify({ error: 'All stream sources exhausted' }), {
    status: 503,
    headers: corsHeaders,
  });
};

