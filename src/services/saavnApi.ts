import type { Track, LyricsData } from '../types/music';
import { decodeHtmlEntities, DEFAULT_ARTWORK, formatDuration } from '../utils/formatters';

// List of fallback API base URLs in order of preference
const SAAVN_BASE_URLS = [
  'https://saavn-api-eight.vercel.app',
  'https://saavn.me',
];

interface SaavnImage {
  quality: string;
  url: string;
}

interface SaavnDownloadUrl {
  quality: string;
  url: string;
}

interface SaavnSongItem {
  id: string;
  name: string;
  type?: string;
  year?: string;
  releaseDate?: string;
  duration?: number | string;
  label?: string;
  primaryArtists?: string | { id: string; name: string }[];
  featuredArtists?: string | { id: string; name: string }[];
  artists?: {
    primary?: { id: string; name: string }[];
    featured?: { id: string; name: string }[];
    all?: { id: string; name: string }[];
  };
  album?: {
    id?: string;
    name?: string;
    url?: string;
  };
  image?: SaavnImage[] | string;
  downloadUrl?: SaavnDownloadUrl[] | string;
  hasLyrics?: boolean | string;
  language?: string;
  url?: string;
}

/**
 * Normalizes a raw Saavn API song object into a standard Track
 */
export function normalizeSaavnTrack(item: SaavnSongItem): Track {
  // 1. Resolve Artists
  let artistName = 'Unknown Artist';
  if (item.artists?.primary && Array.isArray(item.artists.primary) && item.artists.primary.length > 0) {
    artistName = item.artists.primary.map(a => a.name).join(', ');
  } else if (Array.isArray(item.primaryArtists) && item.primaryArtists.length > 0) {
    artistName = item.primaryArtists.map(a => a.name).join(', ');
  } else if (typeof item.primaryArtists === 'string' && item.primaryArtists.trim()) {
    artistName = item.primaryArtists;
  }

  // 2. Resolve Artwork (Pick 500x500 or largest)
  let artwork = DEFAULT_ARTWORK;
  if (Array.isArray(item.image) && item.image.length > 0) {
    const highQuality = item.image.find(img => img.quality === '500x500') || item.image[item.image.length - 1];
    artwork = highQuality?.url || item.image[0]?.url || DEFAULT_ARTWORK;
  } else if (typeof item.image === 'string' && item.image) {
    artwork = item.image;
  }

  // 3. Resolve Download Audio URL (Prioritize 320kbps > 160kbps > 96kbps > 48kbps)
  let audioUrl = '';
  let qualityBadge = '320kbps MP3';
  if (Array.isArray(item.downloadUrl) && item.downloadUrl.length > 0) {
    const q320 = item.downloadUrl.find(d => d.quality === '320kbps');
    const q160 = item.downloadUrl.find(d => d.quality === '160kbps');
    const q96 = item.downloadUrl.find(d => d.quality === '96kbps');
    const qFallback = item.downloadUrl[item.downloadUrl.length - 1];

    if (q320?.url) {
      audioUrl = q320.url;
      qualityBadge = '320kbps MP3';
    } else if (q160?.url) {
      audioUrl = q160.url;
      qualityBadge = '160kbps AAC';
    } else if (q96?.url) {
      audioUrl = q96.url;
      qualityBadge = '96kbps AAC';
    } else if (qFallback?.url) {
      audioUrl = qFallback.url;
      qualityBadge = '128kbps';
    }
  } else if (typeof item.downloadUrl === 'string' && item.downloadUrl) {
    audioUrl = item.downloadUrl;
  }

  // 4. Resolve Duration
  const durationSec = typeof item.duration === 'number' 
    ? item.duration 
    : parseInt(item.duration || '0', 10) || 0;

  return {
    id: `saavn_${item.id}`,
    rawSaavnId: item.id,
    title: decodeHtmlEntities(item.name || 'Untitled Song'),
    artist: decodeHtmlEntities(artistName),
    album: item.album?.name ? decodeHtmlEntities(item.album.name) : undefined,
    duration: durationSec,
    durationFormatted: formatDuration(durationSec),
    artwork: artwork.replace('http://', 'https://'),
    audioUrl: audioUrl.replace('http://', 'https://'),
    source: 'jiosaavn',
    quality: qualityBadge,
    year: item.year,
    language: item.language,
    hasLyrics: item.hasLyrics === true || item.hasLyrics === 'true',
  };
}

/**
 * Fetch from Saavn with automatic failover using ultra-fast parallel requests
 */
async function fetchFromSaavnMirror(endpointPath: string): Promise<any> {
  const controllers = SAAVN_BASE_URLS.map(() => new AbortController());

  try {
    const promises = SAAVN_BASE_URLS.map(async (baseUrl, i) => {
      const url = `${baseUrl}${endpointPath}`;
      const response = await fetch(url, {
        signal: controllers[i].signal,
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const json = await response.json();
        if (json && (json.success !== false)) {
          return json;
        }
      }
      throw new Error(`Mirror ${baseUrl} failed`);
    });

    // Promise.any resolves instantly when the FASTEST mirror responds
    const result = await Promise.any(promises);
    
    // Cancel all other slower requests to save bandwidth
    controllers.forEach(c => c.abort());
    
    return result;
  } catch (err) {
    throw new Error('All JioSaavn API mirrors failed or timed out');
  }
}

/**
 * Search JioSaavn songs by query
 */
export async function searchSaavnSongs(query: string, limit: number = 20): Promise<Track[]> {
  if (!query.trim()) return [];

  try {
    const cleanQuery = encodeURIComponent(query.trim());
    const data = await fetchFromSaavnMirror(`/api/search/songs?query=${cleanQuery}&limit=${limit}`);
    
    const results: SaavnSongItem[] = data?.data?.results || data?.results || [];
    return results
      .filter(item => item && item.id)
      .map(normalizeSaavnTrack)
      .filter(t => t.audioUrl && t.audioUrl.length > 0);
  } catch (error) {
    console.warn('JioSaavn search failed:', error);
    return [];
  }
}

/**
 * Fetch song lyrics from JioSaavn
 */
export async function getSaavnLyrics(rawSongId: string): Promise<LyricsData | null> {
  if (!rawSongId) return null;

  try {
    const data = await fetchFromSaavnMirror(`/api/songs/${rawSongId}/lyrics`);
    if (data?.data?.lyrics || data?.lyrics) {
      const lyrics = data?.data?.lyrics || data?.lyrics;
      const snippet = data?.data?.snippet || data?.snippet;
      const copyright = data?.data?.copyright || data?.copyright;
      return {
        lyrics: decodeHtmlEntities(lyrics),
        snippet: snippet ? decodeHtmlEntities(snippet) : undefined,
        copyright: copyright ? decodeHtmlEntities(copyright) : undefined,
      };
    }
    return null;
  } catch (error) {
    console.warn('Failed to fetch lyrics:', error);
    return null;
  }
}
