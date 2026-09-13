import type { Track } from '../types/music';
import { searchSaavnSongs } from '../services/saavnApi';
import { searchYouTubeTracks, resolveAiTrackQuery } from '../services/youtubeApi';

export const saveDownloadedTrack = (track: Track) => {
  try {
    const raw = localStorage.getItem('melodix_downloads') || '[]';
    const downloads = JSON.parse(raw);
    if (!downloads.some((t: Track) => t.id === track.id)) {
      downloads.unshift(track);
      localStorage.setItem('melodix_downloads', JSON.stringify(downloads));
    }
  } catch (e) {
    console.error('Failed to save download history', e);
  }
};

export function triggerProxyDownload(url: string, filename: string): boolean {
  try {
    const isNetlify = typeof window !== 'undefined' && window.location.hostname.includes('netlify');
    const proxyBase = isNetlify ? '/.netlify/functions/download' : '/api/download';
    const proxyUrl = `${proxyBase}?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}&name=${encodeURIComponent(filename)}`;

    const link = document.createElement('a');
    link.href = proxyUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) document.body.removeChild(link);
    }, 4000);
    return true;
  } catch (e) {
    console.error('[Downloader] Proxy download failed:', e);
    return false;
  }
}

/**
 * Direct client-side blob download:
 * For CORS-enabled CDNs (like JioSaavn), fetches media directly in browser.
 * For Google Video / YouTube CDN, routes seamlessly through server proxy with attachment headers.
 * NEVER opens raw googlevideo links in new tabs to prevent 403 Forbidden and Popup Blocker issues.
 */
export async function downloadDirectBlob(url: string, filename: string): Promise<boolean> {
  // Google Video CDN blocks browser CORS and direct navigation (HTTP 403).
  // Always route through the backend streaming proxy!
  if (url.includes('googlevideo.com')) {
    return triggerProxyDownload(url, filename);
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 4000);
    return true;
  } catch (err) {
    console.warn('[Downloader] Direct blob fetch failed, falling back to download proxy:', err);
    return triggerProxyDownload(url, filename);
  }
}

export interface DownloadResult {
  success: boolean;
  mode: 'audio' | 'video';
  fileName: string;
  directUrl?: string;
  videoId?: string;
  externalDownloadUrl?: string;
  error?: string;
}

/**
 * Universal Downloader:
 * - Audio (MP3/M4A): Downloads studio-quality audio directly to user's device via native browser Blob
 * - Video (MP4): Fetches official video stream and triggers high-definition stream download
 */
export async function downloadTrackWithMode(
  track: Track, 
  mode: 'audio' | 'video',
  quality: string = '320'
): Promise<DownloadResult> {
  if (!track) {
    return { success: false, mode, fileName: 'Track', error: 'No track provided' };
  }

  const cleanTitle = (track.title || 'Track').replace(/[/\\?%*:|"<>]/g, '-').trim();
  const cleanArtist = (track.artist || 'Artist').replace(/[/\\?%*:|"<>]/g, '-').trim();
  
  let directUrl = '';
  let fileExt = mode === 'video' ? 'mp4' : 'm4a';
  let videoId = track.youtubeVideoId || (track.id.startsWith('yt_') ? track.id.replace('yt_', '') : '');

  // ── 1. Audio Mode: Try existing track.audioUrl ─────────────────────────
  if (mode === 'audio' && track.audioUrl) {
    const candidateUrl = track.audioUrl;
    const ext = candidateUrl.includes('.mp3') ? 'mp3' : 'm4a';
    const testFileName = `${cleanTitle} - ${cleanArtist}.${ext}`;
    const ok = await downloadDirectBlob(candidateUrl, testFileName);
    if (ok) {
      saveDownloadedTrack(track);
      return { success: true, mode: 'audio', fileName: testFileName, directUrl: candidateUrl, videoId };
    }
    console.warn('[Downloader] Pre-existing track.audioUrl failed, attempting fallbacks...');
  }

  // ── 2. Audio Mode: Search JioSaavn directly (licensed studio 320kbps) ────
  if (mode === 'audio') {
    try {
      const queryTitle = cleanTitle.split('|')[0].split(' - ')[0].replace(/\(.*?\)|\[.*?\]/gi, '').trim();
      const queryArtist = cleanArtist.split(/[,&x/|]/)[0].trim();
      const queries = [
        queryArtist ? `${queryTitle} ${queryArtist}` : queryTitle,
        queryTitle,
      ];

      for (const q of queries) {
        const results = await searchSaavnSongs(q, 3);
        if (results && results.length > 0) {
          for (const candidate of results as any[]) {
            const candidateName = (candidate.name || candidate.title || '').toLowerCase();
            const requestedTitle = queryTitle.toLowerCase();
            const titleWords = requestedTitle.split(/\s+/).filter((w: string) => w.length > 2);
            const matchCount = titleWords.filter((w: string) => candidateName.includes(w)).length;
            const matchScore = titleWords.length > 0 ? matchCount / titleWords.length : 0.5;

            if (matchScore >= 0.35) {
              let saavnUrl = '';
              if (candidate.downloadUrl && Array.isArray(candidate.downloadUrl)) {
                const matched = candidate.downloadUrl.find((d: any) => d.quality?.includes(quality))
                  || candidate.downloadUrl[candidate.downloadUrl.length - 1];
                saavnUrl = matched?.url || '';
              } else if (candidate.audioUrl) {
                saavnUrl = candidate.audioUrl;
              }

              if (saavnUrl) {
                const ext = saavnUrl.includes('.mp3') ? 'mp3' : 'm4a';
                const saavnFileName = `${cleanTitle} - ${cleanArtist}.${ext}`;
                const ok = await downloadDirectBlob(saavnUrl, saavnFileName);
                if (ok) {
                  saveDownloadedTrack(track);
                  return { success: true, mode: 'audio', fileName: saavnFileName, directUrl: saavnUrl, videoId };
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('[Downloader] Client-side Saavn search fallback failed:', err);
    }
  }

  // ── 3. Resolve YouTube Video ID if not yet available ────────────────────
  if (!videoId) {
    try {
      const primaryArtist = cleanArtist.split(/[,&x/|-]/)[0].trim();
      let ytTracks = await searchYouTubeTracks(`${cleanTitle} ${primaryArtist}`, 3);
      if (!ytTracks || ytTracks.length === 0) {
        const aiQuery = await resolveAiTrackQuery(cleanTitle, cleanArtist);
        ytTracks = await searchYouTubeTracks(aiQuery, 3);
      }
      if (!ytTracks || ytTracks.length === 0) {
        ytTracks = await searchYouTubeTracks(cleanTitle, 3);
      }
      if (ytTracks && ytTracks.length > 0) {
        const top = ytTracks[0];
        videoId = top.youtubeVideoId || top.id?.replace(/^yt_/, '') || top.id || '';
      }
    } catch (err) {
      console.warn('[Downloader] YouTube track search failed:', err);
    }
  }

  // ── 4. Unified Serverless Stream Resolver (Netlify stream.js) ────────────
  // Handles: InnerTube Android -> InnerTube iOS -> Server JioSaavn -> Alt YouTube Videos
  try {
    const titleParam = encodeURIComponent(cleanTitle);
    const artistParam = encodeURIComponent(cleanArtist);
    const videoIdParam = videoId ? encodeURIComponent(videoId) : '';
    const streamRes = await fetch(
      `/.netlify/functions/stream?id=${videoIdParam}&mode=${mode}&quality=${quality}&title=${titleParam}&artist=${artistParam}`
    );

    if (streamRes.ok) {
      const streamData = await streamRes.json();
      if (streamData?.url) {
        directUrl = streamData.url;
        if (mode === 'video') {
          fileExt = 'mp4';
        } else {
          fileExt = streamData.source === 'jiosaavn' ? 'mp3'
            : streamData.mimeType?.includes('webm') ? 'webm' : 'm4a';
        }
      }
    }
  } catch (err) {
    console.warn('[Downloader] Unified stream resolution failed:', err);
  }

  const fileName = `${cleanTitle} - ${cleanArtist}.${fileExt}`;

  // ── 5. Trigger Final Audio Download ─────────────────────────────────────
  if (mode === 'audio' && directUrl) {
    const ok = await downloadDirectBlob(directUrl, fileName);
    if (ok) {
      saveDownloadedTrack(track);
      return { success: true, mode: 'audio', fileName, directUrl, videoId };
    }
  }

  // ── 6. Trigger Final Video Download ─────────────────────────────────────
  if (mode === 'video' && directUrl) {
    try {
      const ok = triggerProxyDownload(directUrl, fileName);
      if (ok) {
        saveDownloadedTrack(track);
        return { success: true, mode: 'video', fileName, directUrl, videoId };
      }
    } catch (err) {
      console.warn('[Downloader] Direct video link trigger failed:', err);
    }
  }

  // If all avenues are exhausted
  return { 
    success: false, 
    mode, 
    fileName, 
    error: 'Could not resolve media download stream. Please try again or choose another quality.' 
  };
}

export async function downloadTrack(track: Track): Promise<boolean> {
  const res = await downloadTrackWithMode(track, 'audio');
  return res.success;
}
