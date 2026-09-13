import type { Track } from '../types/music';
import { decodeHtmlEntities, DEFAULT_ARTWORK } from '../utils/formatters';

const YOUTUBE_DATA_API_KEY = import.meta.env.VITE_YOUTUBE_DATA_API_KEY || '';
const YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';

const SPAM_KEYWORDS = [
  '8d audio',
  '16d audio',
  'slowed',
  'reverb',
  'edit audio',
  'best version',
  'best part',
  'status video',
  'whatsapp status',
  'reaction',
  'bass boosted',
  'bassboosted',
  'nightcore',
  'shorts',
  'status',
];

interface YouTubeThumbnail {
  url: string;
  width?: number;
  height?: number;
}

interface YouTubeSearchItem {
  id: {
    kind: string;
    videoId?: string;
  };
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      default?: YouTubeThumbnail;
      medium?: YouTubeThumbnail;
      high?: YouTubeThumbnail;
      maxres?: YouTubeThumbnail;
    };
    channelTitle: string;
    liveBroadcastContent: string;
  };
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[];
  error?: {
    message: string;
    code: number;
  };
}

/**
 * Normalizes YouTube video item to unified Track
 */
export function normalizeYouTubeTrack(item: YouTubeSearchItem): Track | null {
  const videoId = item.id?.videoId;
  if (!videoId) return null;

  const rawTitle = item.snippet.title || 'Untitled';
  const cleanTitle = decodeHtmlEntities(rawTitle);
  const lowerTitle = cleanTitle.toLowerCase();

  // Filter out low quality fan edits / 8D / status spam
  if (SPAM_KEYWORDS.some(k => lowerTitle.includes(k))) {
    return null;
  }

  const channelTitle = decodeHtmlEntities(item.snippet.channelTitle || 'Original Artist');

  // Try to parse "Artist - Song Title" or "Song Title | Artist"
  let parsedArtist = channelTitle;
  let parsedTitle = cleanTitle;

  if (cleanTitle.includes(' - ')) {
    const parts = cleanTitle.split(' - ');
    if (parts.length >= 2) {
      parsedArtist = parts[0].trim();
      parsedTitle = parts.slice(1).join(' - ').trim();
    }
  } else if (cleanTitle.includes(' | ')) {
    const parts = cleanTitle.split(' | ');
    parsedTitle = parts[0].trim();
    if (parts[1] && !parts[1].toLowerCase().includes('video') && !parts[1].toLowerCase().includes('lyrics')) {
      parsedArtist = parts[1].trim();
    }
  }

  // Remove common YouTube marketing text
  parsedTitle = parsedTitle
    .replace(/\(Official (Music )?Video\)/gi, '')
    .replace(/\[Official (Music )?Video\]/gi, '')
    .replace(/\(Official Audio\)/gi, '')
    .replace(/\[Official Audio\]/gi, '')
    .replace(/\(Official Lyric(s|al)? Video\)/gi, '')
    .replace(/\(Lyric(s)?\)/gi, '')
    .replace(/\(Visualizer\)/gi, '')
    .replace(/\(Audio\)/gi, '')
    .replace(/\[HQ\]/gi, '')
    .replace(/\[4K\]/gi, '')
    .replace(/\|\s*Music Video.*$/gi, '')
    .replace(/\|\s*Official Video.*$/gi, '')
    .replace(/\|\s*New Song.*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // If parsed title ended up being a generic word like "Official", fix it
  const genericWords = ['official', 'video', 'audio', 'official video', 'official audio', 'music video', 'full song', 'song'];
  if (genericWords.includes(parsedTitle.toLowerCase())) {
    parsedTitle = parsedArtist && !genericWords.includes(parsedArtist.toLowerCase()) ? parsedArtist : cleanTitle;
    parsedArtist = channelTitle;
  }
  if (genericWords.includes(parsedArtist.toLowerCase())) {
    parsedArtist = channelTitle;
  }

  const artwork = 
    item.snippet.thumbnails.maxres?.url ||
    item.snippet.thumbnails.high?.url ||
    item.snippet.thumbnails.medium?.url ||
    item.snippet.thumbnails.default?.url ||
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` ||
    DEFAULT_ARTWORK;

  return {
    id: `yt_${videoId}`,
    youtubeVideoId: videoId,
    title: parsedTitle || cleanTitle,
    artist: parsedArtist || channelTitle,
    album: channelTitle,
    duration: 215,
    durationFormatted: '3:35',
    artwork,
    source: 'youtube',
    quality: 'HD Stream',
    year: new Date(item.snippet.publishedAt).getFullYear().toString(),
    // Audio stream will be dynamically fetched from JioSaavn CDN in AudioContext
  };
}

export async function getYouTubeTrackById(videoId: string): Promise<Track | null> {
  if (!videoId) return null;
  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_DATA_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.items || data.items.length === 0) return null;
    
    // Create a mock search item for normalize function
    const item = data.items[0];
    const searchItem: YouTubeSearchItem = {
      id: { videoId: item.id },
      snippet: item.snippet
    };
    return normalizeYouTubeTrack(searchItem);
  } catch (err) {
    console.warn('Failed to fetch youtube video details', err);
    return null;
  }
}

/**
 * Resolve track query using Gemini 3.5 Flash for authentic YouTube matching
 */
export async function resolveAiTrackQuery(title: string, artist: string): Promise<string> {
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
  try {
    const prompt = `Given track: Title "${title}", Artist "${artist}". What is the best search query to find the official music video on YouTube? Respond with a single plain-text query line only.`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 40, temperature: 0.1 }
      })
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text && text.length > 2 && text.length < 100) return text.replace(/["\n\r]/g, '');
    }
  } catch {
    // Silently continue to standard search
  }
  const primaryArtist = artist.split(/[,&x/|-]/)[0].trim();
  return `${title} ${primaryArtist}`;
}

/**
 * Search YouTube Music using the Netlify search function with automatic Google YouTube Data API fallback
 */
export async function searchYouTubeTracks(query: string, maxResults: number = 15): Promise<Track[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];
  const queryLower = cleanQuery.toLowerCase();

  // Attempt 1: Fast Netlify serverless search scraper
  try {
    const encodedQuery = encodeURIComponent(cleanQuery);
    const url = `/.netlify/functions/search?q=${encodedQuery}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.results && Array.isArray(data.results) && data.results.length > 0) {
        const rawResults = data.results;
        
        // Smart filtering: only filter spam if user didn't explicitly want that genre
        const isGenreQuery = ['slowed', 'reverb', 'remix', 'lofi', 'phonk', 'bass boosted'].some(k => queryLower.includes(k));
        
        const filtered = rawResults.filter((v: any) => {
          if (isGenreQuery) return true;
          const lower = (v.title || '').toLowerCase().trim();
          const lowerAuthor = (v.author || '').toLowerCase().trim();
          const spam = ['fan made', 'fanmade', '8d', '16d', 'status video', 'whatsapp status'];
          if (spam.some(k => lower.includes(k) || lowerAuthor.includes(k))) return false;
          if (['e.relaxx', 'erelaxx'].includes(lowerAuthor)) return false;
          return true;
        });

        // Use filtered results if available, otherwise retain rawResults rather than returning 0!
        const itemsToUse = filtered.length > 0 ? filtered : rawResults;

        return itemsToUse.slice(0, maxResults).map((v: any) => ({
          id: `yt_${v.id}`,
          youtubeVideoId: v.id,
          title: v.title,
          artist: v.author,
          album: v.author,
          duration: parseInt(v.duration?.split(':').reduce((acc: number, time: string) => (60 * acc) + +time, 0)) || 215,
          durationFormatted: v.duration || '3:35',
          artwork: v.thumb || 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?q=80&w=256&auto=format&fit=crop',
          source: 'youtube',
          quality: 'HD Stream',
          year: new Date().getFullYear().toString(),
        }));
      }
    }
  } catch (error) {
    console.warn('YouTube search scraper fallback:', error);
  }

  // Attempt 2: Official Google YouTube Data v3 API fallback
  try {
    const encoded = encodeURIComponent(cleanQuery);
    const apiUrl = `${YOUTUBE_SEARCH_URL}?part=snippet&maxResults=${maxResults}&q=${encoded}&type=video&key=${YOUTUBE_DATA_API_KEY}`;
    const apiRes = await fetch(apiUrl);
    if (apiRes.ok) {
      const apiData: YouTubeSearchResponse = await apiRes.json();
      if (apiData.items && apiData.items.length > 0) {
        const tracks: Track[] = [];
        for (const item of apiData.items) {
          if (!item.id?.videoId) continue;
          tracks.push({
            id: `yt_${item.id.videoId}`,
            youtubeVideoId: item.id.videoId,
            title: decodeHtmlEntities(item.snippet.title),
            artist: decodeHtmlEntities(item.snippet.channelTitle),
            album: decodeHtmlEntities(item.snippet.channelTitle),
            duration: 215,
            durationFormatted: '3:35',
            artwork: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || DEFAULT_ARTWORK,
            source: 'youtube',
            quality: 'HD Stream',
            year: new Date(item.snippet.publishedAt).getFullYear().toString(),
          });
        }
        if (tracks.length > 0) return tracks;
      }
    }
  } catch (err) {
    console.warn('Official YouTube API search fallback failed:', err);
  }

  return [];
}

/**
 * Permanent, server-free YouTube audio stream URL fetcher.
 * Uses public Piped API instances (open-source YouTube frontends).
 * Works on Netlify, no Python server needed.
 *
 * Piped API docs: https://docs.piped.video/docs/api-documentation/
 * GET /streams/{videoId} → returns audioStreams[] with direct CDN URLs
 */

// Multiple public Piped instances as fallbacks (community-hosted, always online)
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.yt',
  'https://piped-api.garudalinux.org',
  'https://watchapi.whatever.social',
  'https://api.piped.privateger.me',
];

// Cache stream URLs in memory for the session (YouTube CDN URLs expire in ~6 hours)
const streamUrlCache = new Map<string, { url: string; cachedAt: number }>();
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

export async function getYouTubeStreamUrl(videoId: string): Promise<string | null> {
  if (!videoId) return null;

  // Check in-memory cache first
  const cached = streamUrlCache.get(videoId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.url;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    // Call our Netlify serverless function for streaming audio directly
    const res = await fetch(`/.netlify/functions/stream?id=${videoId}`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.url) {
        streamUrlCache.set(videoId, { url: data.url, cachedAt: Date.now() });
        return data.url;
      }
    }
  } catch (error) {
    console.warn(`[YT Stream] Netlify function stream fetch failed for videoId: ${videoId}`, error);
  }

  // Fallback to Piped API instances if our custom backend fails
  for (const instance of PIPED_INSTANCES) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${instance}/streams/${videoId}`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timeout);

      if (!res.ok) continue;

      const data = await res.json();
      const audioStreams: Array<{ url: string; bitrate: number; quality: string; mimeType: string }> =
        data.audioStreams || [];

      if (!audioStreams.length) continue;

      const sorted = [...audioStreams].sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));
      const best = sorted[0];

      if (best?.url) {
        streamUrlCache.set(videoId, { url: best.url, cachedAt: Date.now() });
        return best.url;
      }
    } catch {
      continue;
    }
  }

  console.warn(`[YT Stream] All stream sources failed for videoId: ${videoId}`);
  return null;
}
