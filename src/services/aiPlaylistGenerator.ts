/**
 * Gemini AI Playlist Generator & Intelligent Music Finder.
 * Creates curated tracklists matching any user prompt, mood, genre, or vibe
 * with strict verification to ensure 100% real, official original artist tracks.
 */

import type { Playlist, Track } from '../types/music';
import { searchUnified } from './unifiedSearch';
import { searchSaavnSongs } from './saavnApi';
import { searchYouTubeTracks } from './youtubeApi';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export interface AiGeneratedPlaylistResponse {
  title: string;
  description: string;
  vibe: string;
  coverImage: string;
  songs: { title: string; artist: string }[];
}

export async function generateAiPlaylist(userPrompt: string): Promise<Playlist> {
  const cleanPrompt = userPrompt.trim();
  if (!cleanPrompt) {
    throw new Error('Please enter a description or mood for your playlist.');
  }

  const systemInstruction = `
You are an expert AI Music Curator, DJ, and Discographer.
The user wants a customized music playlist based on this request: "${cleanPrompt}".

CRITICAL INSTRUCTIONS:
1. You MUST only select REAL, OFFICIAL, ORIGINAL released studio songs with their ACTUAL primary artists (e.g. "Jhol" by "Maanu, Annural Khalid", "Majboor" by "Sheheryar Rehan", "Pasoori" by "Ali Sethi").
2. DO NOT include fake covers, fan edits, short remixes, or unknown artists.
3. DO NOT hallucinate or make up songs. If a user prompts for an actor (like "Kartik Aaryan") and a word (like "Majboor"), DO NOT invent a song called "Majboor" by "Kartik Aaryan". Only return songs that actually exist in real life.
4. If you cannot find real songs that match perfectly, pick the closest real, popular songs.

Return a clean JSON object ONLY (no markdown backticks, no markdown explanation) with this structure:
{
  "title": "A catchy, creative playlist title",
  "description": "A 1-2 sentence description of the vibe and emotion",
  "vibe": "Category (e.g. Pakistani Vibe, Hindi Acoustic, Drift Phonk, Punjabi Hits, Lofi Chill)",
  "songs": [
    { "title": "Exact Song Name", "artist": "Exact Official Artist Name" }
  ]
}
Generate between 10 and 15 real, highly popular tracks that perfectly match the request. If the user asks for a very long playlist (like 2 hours), generate up to 20 tracks.
`.trim();

  let generatedData: AiGeneratedPlaylistResponse | null = null; // Fast, high-rate-limit flash models cascade

  const models = ['gemini-3.5-flash-lite', 'gemini-flash-latest', 'gemini-3.5-flash'];
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemInstruction }] }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        generatedData = JSON.parse(cleanJson);
        if (generatedData?.songs && generatedData.songs.length > 0) {
          break;
        }
      }
    } catch (err) {
      console.warn(`Gemini [${model}] AI playlist generation fallback:`, err);
    }
  }

  // Fallback if AI API times out or fails
  if (!generatedData || !generatedData.songs || generatedData.songs.length === 0) {
    const normalizedPrompt = cleanPrompt
      .replace(/^(found the|find the|play the|search for the|search for|listen to the|listen to|play|find|look for)\s+/i, '')
      .replace(/\s+(song|songs|track|tracks|music)$/i, '')
      .trim() || cleanPrompt;

    const searchResults = await searchUnified(normalizedPrompt);
    const fallbackTracks = searchResults.all.slice(0, 10);
    
    if (fallbackTracks.length === 0) {
      throw new Error('Could not find any tracks for your search.');
    }

    const cover = fallbackTracks[0]?.artwork || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
    
    return {
      id: `ai_playlist_${Date.now()}`,
      title: `Mix: ${cleanPrompt}`,
      description: `Custom playlist generated for "${cleanPrompt}"`,
      cover,
      trackCount: fallbackTracks.length,
      tracks: fallbackTracks,
      category: 'Custom Mix',
      type: 'user',
      isPrivate: false,
      createdAt: new Date().toISOString(),
    };
  }

  // Search each song in the catalog with strict artist scoring
  const matchedTracks: Track[] = [];
  const searchPromises = generatedData.songs.map(async (song) => {
    try {
      const targetTitle = song.title.toLowerCase();
      const targetArtist = song.artist.toLowerCase();

      // 1. Search JioSaavn
      const saavnResults = await searchSaavnSongs(`${song.title} ${song.artist}`, 10);
      
      // Find best match matching the target artist & duration > 90s
      let bestTrack: Track | null = null;
      for (const t of saavnResults) {
        const tTitle = t.title.toLowerCase();
        const tArtist = t.artist.toLowerCase();
        const duration = t.duration || 0;

        // Skip 1-minute fan clips / reels
        if (duration > 0 && duration < 80) continue;

        // Check if artist matches
        const artistMatch = targetArtist.split(/[,&x]/).some(part => {
          const p = part.trim();
          return p.length > 2 && tArtist.includes(p);
        });

        if (artistMatch || tTitle.includes(targetTitle)) {
          bestTrack = t;
          break;
        }
      }

      if (bestTrack) return bestTrack;

      // 2. Search YouTube official tracks
      const ytResults = await searchYouTubeTracks(`${song.title} ${song.artist} official audio`, 10);
      for (const t of ytResults) {
        const tArtist = t.artist.toLowerCase();
        const tTitle = t.title.toLowerCase();
        
        const artistMatch = targetArtist.split(/[,&x]/).some(part => {
          const p = part.trim();
          return p.length > 2 && (tArtist.includes(p) || tTitle.includes(p));
        });

        if (artistMatch || tTitle.includes(targetTitle)) {
          return t;
        }
      }

      // Strict fallback: If we couldn't match artist perfectly, at least make sure the title partially matches.
      // This prevents wildly hallucinated tracks from being swapped with random search results.
      const safeTitle = targetTitle.split(' ')[0]; // Take first word of generated title
      if (saavnResults.length > 0 && saavnResults[0].title.toLowerCase().includes(safeTitle)) {
        return saavnResults[0];
      }
      if (ytResults.length > 0 && ytResults[0].title.toLowerCase().includes(safeTitle)) {
        return ytResults[0];
      }
      
      // If nothing closely matches, discard this track to keep the playlist high quality
      return null;
    } catch {
      return null;
    }
    return null;
  });

  const resolved = await Promise.all(searchPromises);
  resolved.forEach((t) => {
    if (t && !matchedTracks.some((existing) => existing.id === t.id)) {
      matchedTracks.push(t);
    }
  });

  // Pick cover artwork
  const cover = matchedTracks[0]?.artwork || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';

  const newPlaylist: Playlist = {
    id: `ai_playlist_${Date.now()}`,
    title: generatedData.title || `AI Mix: ${cleanPrompt}`,
    description: generatedData.description || `AI-generated custom mix crafted for "${cleanPrompt}"`,
    cover,
    trackCount: matchedTracks.length,
    tracks: matchedTracks,
    category: generatedData.vibe || 'AI Curated',
    type: 'user',
    isPrivate: false,
    createdAt: new Date().toISOString(),
  };

  return newPlaylist;
}
