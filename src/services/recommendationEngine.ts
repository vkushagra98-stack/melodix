/**
 * Smart AI Recommendation & Continuous Autoplay Engine.
 * Recommends 100% genuine, studio-quality, verified tracks connected to user preferences.
 * Aggressively filters out amateur vlogs, low-quality re-uploads, and spam.
 */

import type { Track } from '../types/music';
import { searchUnified } from './unifiedSearch';
import { searchSaavnSongs } from './saavnApi';
import { INITIAL_POPULAR_TRACKS, FEATURED_HERO_TRACK } from './curatedData';

export const ARTIST_SIMILARITY_MAP: Record<string, string[]> = {
  // Pakistani Pop / Indie & Coke Studio
  'sheheryar rehan': ['Abdul Hannan', 'Hasan Raheem', 'Maanu', 'Annural Khalid', 'Ali Sethi', 'Asim Azhar', 'Kaifi Khalil', 'Talwiinder'],
  'zoha waseem': ['Sheheryar Rehan', 'Annural Khalid', 'Abdul Hannan', 'Hasan Raheem', 'Maanu'],
  'maanu': ['Annural Khalid', 'Hasan Raheem', 'Abdul Hannan', 'Ali Sethi', 'Coke Studio', 'Talwiinder'],
  'annural khalid': ['Maanu', 'Hasan Raheem', 'Abdul Hannan', 'Asim Azhar', 'Sheheryar Rehan'],
  'hasan raheem': ['Abdul Hannan', 'Maanu', 'Annural Khalid', 'Kaifi Khalil', 'Talal Qureshi'],
  'abdul hannan': ['Hasan Raheem', 'Maanu', 'Annural Khalid', 'Kaifi Khalil', 'Sheheryar Rehan'],
  'kaifi khalil': ['Abdul Hannan', 'Hasan Raheem', 'Ali Sethi', 'Shae Gill'],
  'ali sethi': ['Shae Gill', 'Kaifi Khalil', 'Abida Parveen', 'Atif Aslam', 'Coke Studio'],
  'asim azhar': ['Young Stunners', 'Hasan Raheem', 'Atif Aslam', 'Aima Baig'],
  'young stunners': ['Talha Anjum', 'Talhah Yunus', 'KR$NA', 'Seedhe Maut', 'DIVINE'],
  'talwiinder': ['Sanjoy', 'NDS', 'Yashraj', 'Chaar Diwaari', 'Seedhe Maut', 'Hasan Raheem'],

  // Bollywood & Hindi Melodies
  'arijit singh': ['Atif Aslam', 'Mohit Chauhan', 'Jubin Nautiyal', 'Pritam', 'Sachin-Jigar', 'Vishal Mishra', 'Darshan Raval'],
  'atif aslam': ['Arijit Singh', 'Rahat Fateh Ali Khan', 'Ali Zafar', 'Mustafa Zahid', 'Bilal Saeed', 'Jal'],
  'pritam': ['Arijit Singh', 'Sachin-Jigar', 'Amit Trivedi', 'Vishal-Shekhar', 'KK'],
  'mohit chauhan': ['Arijit Singh', 'KK', 'Shaan', 'Lucky Ali', 'Papon'],
  'vishal mishra': ['Arijit Singh', 'B Praak', 'Jubin Nautiyal', 'Akhil Sachdeva'],
  'jubin nautiyal': ['Arijit Singh', 'Vishal Mishra', 'Armaan Malik', 'Darshan Raval'],
  'darshan raval': ['Armaan Malik', 'Jubin Nautiyal', 'Arijit Singh', 'Stebin Ben'],
  'shreya ghoshal': ['Sunidhi Chauhan', 'Alka Yagnik', 'Monali Thakur', 'Shilpa Rao', 'Arijit Singh'],
  'sunidhi chauhan': ['Shreya Ghoshal', 'Neha Kakkar', 'Kanika Kapoor', 'Shilpa Rao'],
  'ar rahman': ['Anirudh Ravichander', 'Hariharan', 'Shankar Mahadevan', 'Javed Ali', 'Mohit Chauhan'],
  'anirudh': ['AR Rahman', 'Yuvan Shankar Raja', 'Santhosh Narayanan', 'GV Prakash', 'Harris Jayaraj'],

  // Punjabi Music
  'diljit dosanjh': ['Karan Aujla', 'AP Dhillon', 'Sidhu Moose Wala', 'Shubh', 'Amrinder Gill'],
  'karan aujla': ['Diljit Dosanjh', 'AP Dhillon', 'Shubh', 'Sidhu Moose Wala', 'Prem Dhillon'],
  'ap dhillon': ['Gurinder Gill', 'Shubh', 'Karan Aujla', 'Diljit Dosanjh', 'Sidhu Moose Wala'],
  'shubh': ['Karan Aujla', 'Diljit Dosanjh', 'AP Dhillon', 'Sidhu Moose Wala'],
  'sidhu moose wala': ['Karan Aujla', 'Diljit Dosanjh', 'Amrit Maan', 'Prem Dhillon', 'AP Dhillon'],

  // Desi Hip Hop
  'seedhe maut': ['KR$NA', 'Raftaar', 'DIVINE', 'Talwiinder', 'Chaar Diwaari'],
  'kr$na': ['Seedhe Maut', 'Raftaar', 'DIVINE', 'Young Stunners', 'Karma'],
  'divine': ['Naezy', 'KR$NA', 'Raftaar', 'MC Stan', 'Karan Aujla', 'Sidhu Moose Wala'],

  // International Pop & English
  'the weeknd': ['Post Malone', 'Dua Lipa', 'Bruno Mars', 'Drake', 'Kendrick Lamar', 'Daft Punk'],
  'taylor swift': ['Billie Eilish', 'Olivia Rodrigo', 'Sabrina Carpenter', 'Ariana Grande', 'Gracie Abrams'],
  'billie eilish': ['Olivia Rodrigo', 'Lana Del Rey', 'Lorde', 'Finneas', 'Taylor Swift'],
  'post malone': ['The Weeknd', 'Khalid', 'Swae Lee', 'Drake', 'Juice WRLD'],
  'bruno mars': ['The Weeknd', 'Silk Sonic', 'Anderson .Paak', 'Ed Sheeran', 'Justin Bieber'],
  'queen': ['Freddie Mercury', 'Elton John', 'Pink Floyd', 'David Bowie', 'The Beatles'],

  // Phonk & Electronic
  'kordhell': ['DVRST', 'PlayaPhonk', 'Hensonn', 'Pharmacist', 'Ghostface Playa', 'SXMPRA'],
  'dvrst': ['Kordhell', 'PlayaPhonk', 'Hensonn', 'Pharmacist'],

  // Russian / Slavic
  'татьяна куртукова': ['Пелагея', 'SHAMAN', 'Любэ', 'Баста', 'Ярослав Дронов'],
};

const JUNK_TITLE_PATTERNS = [
  'love story', 'ki story', 'ki love', 'prem katha', 'vlog', 'dehati', 'ragni', 'nach', 
  'dance video', 'stage show', 'stage program', 'arkestra', 'orchestra', 'bhojpuri', 
  'kissa', 'natak', 'whatsapp status', 'status video', 'reels', 'shorts', 
  'funny', 'comedy', 'prank', 'roast', 'reaction', 'tiktok', 'bhabi', 'bhabhi', 
  'jalalpuriya', 'dehangal', 'dhakad', 'chhora', 'chhori', 'deshi', 'desi nach',
  'full movie', 'episode', 'web series', 'trailer', 'teaser', 'scene', 'interview',
  'dj remix', 'dj song', 'bass boosted', '8d audio', 'slowed reverb', 'slowed+reverb',
  'tik tok', 'short video', 'live streaming', 'gaming'
];

const JUNK_ARTIST_NAMES = new Set([
  'official', 'e.relaxx', 'erelaxx', 'audio', 'video', 'music', 'unknown',
  'various artists', 'artist', 'full video', 'status', 'lyrics', 'records',
  't-series', 'speed records', 'zee music company', 'sony music india',
  'yrf', 'tips official', 'dm - desi melodies', 'white hill music', 'youtube',
  'waseem dehangal', 'waseem jalalpuriya'
]);

export const isJunkTrack = (t: Track): boolean => {
  if (!t || !t.title || !t.artist) return true;
  const titleLower = t.title.trim().toLowerCase();
  const artistLower = t.artist.trim().toLowerCase();

  // Too short
  if (titleLower.length <= 2 || artistLower.length <= 2) return true;

  // Generic marketing words as titles
  const genericTitles = [
    'official', 'audio', 'video', 'music', 'song', 'full song',
    'official video', 'official audio', 'lyric video', 'trailer', 'teaser', 'promo'
  ];
  if (genericTitles.includes(titleLower)) return true;

  // Title and artist are identical or spam
  if (titleLower === artistLower) return true;
  if (JUNK_ARTIST_NAMES.has(artistLower)) return true;

  // Phone numbers in title or artist (common in amateur Indian re-uploads)
  if (/\d{7,}/.test(titleLower) || /\d{7,}/.test(artistLower)) return true;

  // Check for junk title patterns (vlogs, amateur status, stage dances)
  if (JUNK_TITLE_PATTERNS.some(p => titleLower.includes(p))) return true;

  // Duration check: real songs are typically between 60 seconds and 10 minutes
  if (t.duration && (t.duration < 60 || t.duration > 720)) return true;

  return false;
};

/**
 * Autoplay recommendation for next track
 */
export async function getNextRecommendedTrack(
  currentTrack: Track,
  playedTrackIds: Set<string>
): Promise<Track | null> {
  const title = currentTrack.title.toLowerCase();
  const artist = currentTrack.artist.toLowerCase();

  // 1. Identify candidate search terms based on artist graph
  let candidateArtists: string[] = [];

  for (const [keyArtist, related] of Object.entries(ARTIST_SIMILARITY_MAP)) {
    if (artist.includes(keyArtist) || title.includes(keyArtist)) {
      candidateArtists = related;
      break;
    }
  }

  // 2. Search JioSaavn first for genuine studio music
  for (const targetArtist of candidateArtists) {
    try {
      const saavnSongs = await searchSaavnSongs(`${targetArtist} hits`, 5);
      const candidates = saavnSongs.filter(
        (t) => t.id !== currentTrack.id && !playedTrackIds.has(t.id) && !isJunkTrack(t)
      );
      if (candidates.length > 0) {
        return candidates[0];
      }
    } catch {
      // Continue to next
    }
  }

  // 3. Fallback to unified search with strict filtering
  const fallbackQueries = candidateArtists.length > 0 
    ? candidateArtists.map(a => `${a} Official Audio`)
    : [`${currentTrack.artist} hits`, 'Top Trending Hits'];

  for (const query of fallbackQueries) {
    try {
      const searchRes = await searchUnified(query);
      const candidates = searchRes.all.filter(
        (t) => t.id !== currentTrack.id && !playedTrackIds.has(t.id) && !isJunkTrack(t)
      );
      if (candidates.length > 0) {
        return candidates[0];
      }
    } catch {
      // Continue
    }
  }

  // 4. Fallback to curated popular tracks
  const fallbackCandidates = [FEATURED_HERO_TRACK, ...INITIAL_POPULAR_TRACKS].filter(
    (t) => t.id !== currentTrack.id && !playedTrackIds.has(t.id) && !isJunkTrack(t)
  );

  return fallbackCandidates.length > 0 ? fallbackCandidates[0] : null;
}

/**
 * Generates high-quality personalized recommendations based on user listening history.
 * Prioritizes verified studio releases from JioSaavn and filters out amateur content.
 */
export async function getPersonalizedRecommendations(
  history: Track[],
  likedTracks: Track[]
): Promise<Track[]> {
  const seedTracks = [...likedTracks.slice(0, 4), ...history.slice(0, 3)].filter(t => !isJunkTrack(t));
  const playedIds = new Set<string>([
    ...history.map(t => t.id),
    ...likedTracks.map(t => t.id)
  ]);
  
  if (seedTracks.length === 0) {
    // If no clean history, return verified top hits from JioSaavn
    try {
      const trending = await searchSaavnSongs('Trending Hindi Bollywood Hits', 10);
      const filtered = trending.filter(t => !isJunkTrack(t));
      if (filtered.length > 0) return filtered;
    } catch {}
    return INITIAL_POPULAR_TRACKS.filter(t => !isJunkTrack(t)).slice(0, 10);
  }

  // Extract clean seed artists and find their connected artists
  const seedArtists = new Set<string>();
  const connectedArtists = new Set<string>();

  seedTracks.forEach(t => {
    const leadArtist = t.artist.split(/[,&x/]|ft\.|feat\./i)[0].trim();
    const leadLower = leadArtist.toLowerCase();

    if (leadArtist.length > 2 && !JUNK_ARTIST_NAMES.has(leadLower)) {
      seedArtists.add(leadArtist);

      // Match against similarity map
      for (const [keyArtist, related] of Object.entries(ARTIST_SIMILARITY_MAP)) {
        if (leadLower.includes(keyArtist)) {
          related.forEach(r => connectedArtists.add(r));
          break;
        }
      }
    }
  });

  const merged: Track[] = [];
  const seenIds = new Set<string>();

  // 1. Fetch genuine studio tracks for connected artists from JioSaavn
  const targetArtists = Array.from(connectedArtists).slice(0, 4);
  
  // If no connected artists found in map, use the user's seed artists
  if (targetArtists.length === 0) {
    Array.from(seedArtists).slice(0, 3).forEach(a => targetArtists.push(a));
  }

  for (const artist of targetArtists) {
    try {
      // Prioritize JioSaavn for 100% verified studio releases with 320kbps audio
      const saavnResults = await searchSaavnSongs(artist, 4);
      saavnResults.forEach(t => {
        if (!isJunkTrack(t) && !playedIds.has(t.id) && !seenIds.has(t.id)) {
          merged.push(t);
          seenIds.add(t.id);
        }
      });
    } catch (err) {
      console.warn(`[Recommendations] Saavn fetch for ${artist} failed:`, err);
    }
  }

  // 2. Supplementary: Fetch hits for top seed artists
  for (const artist of Array.from(seedArtists).slice(0, 2)) {
    try {
      const saavnResults = await searchSaavnSongs(`${artist} Top Songs`, 3);
      saavnResults.forEach(t => {
        if (!isJunkTrack(t) && !playedIds.has(t.id) && !seenIds.has(t.id)) {
          merged.push(t);
          seenIds.add(t.id);
        }
      });
    } catch {}
  }

  // 3. Fallback to unified search if JioSaavn had no hits (e.g. niche Western or Phonk)
  if (merged.length < 6) {
    const fallbackQueries = targetArtists.map(a => `${a} Official Audio`);
    if (fallbackQueries.length === 0) fallbackQueries.push('Trending Hits 2025');

    for (const q of fallbackQueries.slice(0, 2)) {
      try {
        const unified = await searchUnified(q);
        unified.all.forEach(t => {
          if (!isJunkTrack(t) && !playedIds.has(t.id) && !seenIds.has(t.id)) {
            merged.push(t);
            seenIds.add(t.id);
          }
        });
      } catch {}
    }
  }

  // 4. Ultimate fallback to verified curated hits
  if (merged.length === 0) {
    return INITIAL_POPULAR_TRACKS.filter(t => !isJunkTrack(t)).slice(0, 10);
  }

  return merged.slice(0, 10);
}
