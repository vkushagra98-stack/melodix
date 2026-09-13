import type { Track } from '../types/music';
import { searchSaavnSongs } from './saavnApi';
import { searchYouTubeTracks } from './youtubeApi';

export interface UnifiedSearchResults {
  all: Track[];
  saavn: Track[];
  youtube: Track[];
}

/**
 * Searches across JioSaavn (lossless 320kbps) and YouTube Music (official releases)
 * with robust de-duplication by Title + Artist
 */
export async function searchUnified(query: string): Promise<UnifiedSearchResults> {
  // Clean query wrappers like "found the ... song", "find ... song", "play ..."
  const normalizeMusicQuery = (q: string): string => {
    return q
      .trim()
      .replace(/^(found the|find the|play the|search for the|search for|listen to the|listen to|play|find|look for)\s+/i, '')
      .replace(/\s+(song|songs|track|tracks|music|video|audio)$/i, '')
      .trim() || q.trim();
  };

  const cleanQuery = normalizeMusicQuery(query);
  if (!cleanQuery) {
    return { all: [], saavn: [], youtube: [] };
  }

  // Handle direct YouTube URL pasting
  const ytMatch = cleanQuery.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const track = await import('./youtubeApi').then(m => m.getYouTubeTrackById(ytMatch[1]));
    if (track) {
      return { all: [track], saavn: [], youtube: [track] };
    }
  }

  // Use the clean user query directly for true universal search
  const [saavnResults, youtubeResults] = await Promise.allSettled([
    searchSaavnSongs(cleanQuery, 20),
    searchYouTubeTracks(cleanQuery, 20)
  ]);

  const saavnRaw: Track[] = saavnResults.status === 'fulfilled' ? saavnResults.value : [];
  const ytRaw: Track[] = youtubeResults.status === 'fulfilled' ? youtubeResults.value : [];

  const filterCovers = (tracks: Track[], q: string) => {
    const isSearchingCover = q.toLowerCase().includes('cover') || q.toLowerCase().includes('remix') || q.toLowerCase().includes('version') || q.toLowerCase().includes('acoustic') || q.toLowerCase().includes('lofi');
    const queryExact = q.toLowerCase().trim();
    
    let filtered = tracks;
    
    // If user didn't explicitly search for a cover, REMOVE spam/reaction/status clips
    if (!isSearchingCover) {
       filtered = tracks.filter(t => {
         const title = t.title.toLowerCase();
         const artist = t.artist.toLowerCase();
         const album = (t.album || '').toLowerCase();

         // Standard commercial studio songs are 55s - 600s
         if (t.duration > 600 || (t.duration > 0 && t.duration < 50)) {
           return false;
         }

         const spamKeywords = [
           'reaction', 'whatsapp status', 'status video', 'short video', 
           'full movie', 'trailer', 'teaser', 'interview', 'review', 'scene'
         ];

         return !spamKeywords.some(k => title.includes(k) || artist.includes(k));
       });
    }
    
    // Preserve natural popularity ordering from YouTube / Saavn search,
    // only promoting exact base title matches to the very front
    return filtered.sort((a, b) => {
      const cleanBase = (s: string) => s.split(/[|:\-–—\(\[\{]/)[0].trim().toLowerCase();
      const aBase = cleanBase(a.title);
      const bBase = cleanBase(b.title);

      const aExact = aBase === queryExact;
      const bExact = bBase === queryExact;

      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      return 0; // Retain natural YouTube view/popularity order
    });
  };

  const saavnTracks = filterCovers(saavnRaw, cleanQuery);
  const ytTracks = filterCovers(ytRaw, cleanQuery);

  // Smart AI Relevance Scoring
  const qLower = cleanQuery.toLowerCase().trim();
  const qTokens = qLower.split(/\s+/).filter((t) => t.length > 1);

  const calculateRelevance = (track: Track): number => {
    const title = (track.title || '').toLowerCase();
    const artist = (track.artist || '').toLowerCase();
    const album = (track.album || '').toLowerCase();
    const combined = `${title} ${artist} ${album}`;

    let score = 0;

    // Core base title before delimiters (| - : ( [)
    const cleanBaseTitle = (raw: string) =>
      (raw || '')
        .split(/[|:\-–—\(\[\{]/)[0]
        .replace(/[^\w\s]/gi, '')
        .trim()
        .toLowerCase();

    const baseTitle = cleanBaseTitle(track.title);

    // 1. Exact query match on title OR core base song title
    if (baseTitle === qLower || title === qLower) {
      score += 2600;
    } else if (title.startsWith(qLower) || baseTitle.startsWith(qLower)) {
      score += 1800;
    } else if (title.includes(qLower)) {
      score += 1200;
    } else if (combined.includes(qLower)) {
      score += 900;
    }

    // 2. Global Virality & Popularity Ranking:
    // YouTube's top results are ordered by real-world view counts, engagement, and virality
    if (track.source === 'youtube') {
      const ytIdx = ytTracks.findIndex((t) => t.id === track.id);
      if (ytIdx !== -1) {
        score += Math.max(0, 1600 - ytIdx * 150);
      }
    } else {
      const saavnIdx = saavnTracks.findIndex((t) => t.id === track.id);
      if (saavnIdx !== -1) {
        score += Math.max(0, 800 - saavnIdx * 80);
      }
    }

    // 3. Official Music Video / Trending Virality Keywords
    if (/music video|official video|coke studio|official audio|visualizer/i.test(title)) {
      score += 600;
    }
    if (/2024|2025|2026/i.test(title)) {
      score += 300;
    }

    // 4. Multi-word queries (e.g. "Majboor Sheheryar Rehan")
    if (qTokens.length >= 2) {
      let matchedInTitle = 0;
      let matchedInArtist = 0;

      for (const token of qTokens) {
        if (title.includes(token)) matchedInTitle++;
        if (artist.includes(token)) matchedInArtist++;
      }

      // Exact match of title + artist across user's query
      if (matchedInTitle > 0 && matchedInArtist > 0) {
        score += 2000;
      }

      const totalMatched = qTokens.filter((token) => combined.includes(token)).length;
      if (totalMatched === qTokens.length) {
        score += 1000;
      } else {
        // Heavy penalty if user typed specific words (like artist name) and track is missing them
        const missingCount = qTokens.length - totalMatched;
        score -= missingCount * 500;
      }
    }

    // 5. Official release boost
    const officialKeywords = [
      'official', 'coke studio', 't-series', 'tseries', 'sony music',
      'zee music', 'vevo', 'speed records', 'jass records',
      'yash raj', 'tips', 'saregama', 'universal music', 'warner'
    ];
    if (officialKeywords.some((k) => combined.includes(k))) {
      score += 150;
    }

    // 6. Duration penalty for abnormal lengths (<60s or >420s)
    if (track.duration >= 110 && track.duration <= 360) {
      score += 80;
    } else if (track.duration > 420 || (track.duration > 0 && track.duration < 60)) {
      score -= 300;
    }

    return score;
  };

  // Combine and deduplicate candidates from both sources
  const getDedupKey = (track: Track) => {
    const cleanTitle = (track.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanArtist = (track.artist || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
    return `${cleanTitle}_${cleanArtist}`;
  };

  const candidateMap = new Map<string, Track>();

  // Add all candidates, linking high quality studio audio with YouTube video IDs
  [...ytTracks, ...saavnTracks].forEach((track) => {
    const key = getDedupKey(track);
    const existing = candidateMap.get(key);
    if (existing) {
      if (!existing.audioUrl && track.audioUrl) existing.audioUrl = track.audioUrl;
      if (!existing.youtubeVideoId && track.youtubeVideoId) existing.youtubeVideoId = track.youtubeVideoId;
      if (existing.source === 'youtube' && track.source === 'saavn') {
        existing.quality = '320kbps MP3';
      }
    } else {
      candidateMap.set(key, track);
    }
  });

  const merged = Array.from(candidateMap.values()).sort((a, b) => {
    const scoreA = calculateRelevance(a);
    const scoreB = calculateRelevance(b);
    return scoreB - scoreA;
  });

  return {
    all: merged,
    saavn: saavnTracks,
    youtube: ytTracks,
  };
}
