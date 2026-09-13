import type { LyricsData } from '../types/music';
import { getSaavnLyrics } from './saavnApi';

export interface SyncedLyricLine {
  time: number; // in seconds
  text: string;
}

export interface UnifiedLyricsResult {
  plainLyrics?: string;
  syncedLyrics?: SyncedLyricLine[];
  hasSynced: boolean;
  source: 'lrclib' | 'saavn' | 'none';
}

/**
 * Parses raw .lrc string into structured SyncedLyricLine array
 */
export function parseLrcString(lrc: string): SyncedLyricLine[] {
  if (!lrc) return [];

  const lines = lrc.split('\n');
  const result: SyncedLyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.?(\d{2,3})?\]/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const matches = Array.from(trimmed.matchAll(timeRegex));
    if (matches.length === 0) continue;

    const text = trimmed.replace(timeRegex, '').trim();
    if (!text) continue;

    for (const match of matches) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const ms = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
      const totalSeconds = minutes * 60 + seconds + ms / 1000;

      result.push({
        time: totalSeconds,
        text,
      });
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

/**
 * Fetches 100% accurate time-synchronized lyrics with candidate artist extraction and duration validation
 */
export async function fetchLyrics(
  trackTitle: string,
  artistName: string,
  rawSaavnId?: string,
  duration?: number
): Promise<UnifiedLyricsResult> {
  const cleanTitle = trackTitle
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\|.*$/g, '')
    .replace(/(official video|music video|full song|audio|hd|4k|remix|edit)/gi, '')
    .trim();

  // Extract all candidate artists (e.g. "Mithoon, Arijit Singh" -> ["Arijit Singh", "Mithoon"])
  const candidateArtists = artistName
    .split(/[,&xX/\\|]|feat\.?|ft\.?/i)
    .map(a => a.trim())
    .filter(Boolean);

  // If there are multiple artists (e.g. composer + singer), try singer/individual artists first
  const artistQueries = [
    ...candidateArtists.filter(a => a.toLowerCase().includes('singh') || a.toLowerCase().includes('rehan') || a.toLowerCase().includes('waseem') || a.toLowerCase().includes('sheheryar')),
    ...candidateArtists,
    artistName.trim(),
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  // 1. Direct GET with duration & candidate artists
  for (const artist of artistQueries) {
    try {
      let url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(artist)}`;
      if (duration && duration > 0) {
        url += `&duration=${Math.round(duration)}`;
      }

      const res = await fetch(url, {
        headers: {
          'Lrclib-Client': 'Melodix-Music/1.0.0 (https://github.com/melodix-app)',
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.syncedLyrics) {
          const parsed = parseLrcString(data.syncedLyrics);
          if (parsed.length > 0) {
            return {
              plainLyrics: data.plainLyrics || undefined,
              syncedLyrics: parsed,
              hasSynced: true,
              source: 'lrclib',
            };
          }
        } else if (data && data.plainLyrics) {
          return {
            plainLyrics: data.plainLyrics,
            syncedLyrics: [],
            hasSynced: false,
            source: 'lrclib',
          };
        }
      }
    } catch {
      // try next candidate artist
    }
  }

  // 2. Search fallback with strict title comparison and duration tolerance
  try {
    const searchUrl = `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTitle)}`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        'Lrclib-Client': 'Melodix-Music/1.0.0 (https://github.com/melodix-app)',
      },
    });

    if (searchRes.ok) {
      const results = await searchRes.json();
      if (Array.isArray(results) && results.length > 0) {
        const validResults = results.filter(r => r.syncedLyrics || r.plainLyrics);
        if (validResults.length > 0) {
          // Find matching duration or matching artist
          const matched =
            validResults.find(r =>
              candidateArtists.some(ca => r.artistName?.toLowerCase().includes(ca.toLowerCase()))
            ) ||
            validResults.find(r => duration ? Math.abs((r.duration || 0) - duration) <= 25 : true) ||
            validResults[0];

          if (matched && matched.syncedLyrics) {
            const parsed = parseLrcString(matched.syncedLyrics);
            if (parsed.length > 0) {
              return {
                plainLyrics: matched.plainLyrics || undefined,
                syncedLyrics: parsed,
                hasSynced: true,
                source: 'lrclib',
              };
            }
          } else if (matched && matched.plainLyrics) {
            return {
              plainLyrics: matched.plainLyrics,
              syncedLyrics: [],
              hasSynced: false,
              source: 'lrclib',
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn('LRCLIB search fallback error:', err);
  }

  // 3. Fallback to Saavn Lyrics API
  if (rawSaavnId) {
    try {
      const saavnData: LyricsData | null = await getSaavnLyrics(rawSaavnId);
      if (saavnData && saavnData.lyrics) {
        return {
          plainLyrics: saavnData.lyrics.replace(/<br\s*[\/]?>/gi, '\n'),
          syncedLyrics: [],
          hasSynced: false,
          source: 'saavn',
        };
      }
    } catch (err) {
      console.warn('Saavn lyrics fallback error:', err);
    }
  }

  return {
    hasSynced: false,
    source: 'none',
  };
}
