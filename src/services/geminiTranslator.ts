/**
 * Gemini AI Lyrics Translator & Romanizer Engine.
 * Powered by Google Gemini 1.5/2.0 Flash (Free, Ultra-Fast, Multilingual).
 * Translates and Romanizes Hindi, Urdu, Punjabi, Spanish, Korean, Japanese, and any language to singable Hinglish.
 */

import type { SyncedLyricLine } from './lyricsService';

export interface TranslatedLyricsResult {
  translatedPlain?: string;
  translatedSynced?: SyncedLyricLine[];
  sourceLanguage?: string;
}

const DEFAULT_GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export async function translateLyricsWithGemini(
  lyrics: string | SyncedLyricLine[],
  apiKeyOverride?: string
): Promise<TranslatedLyricsResult> {
  const key = apiKeyOverride || import.meta.env.VITE_GEMINI_API_KEY || DEFAULT_GEMINI_KEY;

  const isSynced = Array.isArray(lyrics);
  const rawText = isSynced ? lyrics.map((l) => l.text).join('\n') : lyrics;

  if (!rawText.trim()) {
    return {};
  }

  const prompt = `
You are a professional music lyric translator and Romanizer.
Task: Translate and Romanize the following song lyrics into natural, easy-to-sing Romanized Hinglish (or Roman script) and conversational English meaning.

Original Lyrics:
${rawText}

Instructions:
1. For every single line in the original lyrics, provide the Romanized pronunciation / natural Hinglish translation.
2. Keep the exact same number of lines as the input so timestamps align.
3. Do not include markdown formatting, stars, or conversational intro. Just output line-by-line translated lyrics.
`.trim();

  const models = ['gemini-3.5-flash-lite', 'gemini-flash-latest', 'gemini-3.5-flash'];
  let translatedText = '';

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        translatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        if (translatedText) break;
      }
    } catch {
      continue;
    }
  }

  try {
    if (!translatedText) {
      return {
        translatedPlain: rawText,
        translatedSynced: isSynced ? (lyrics as SyncedLyricLine[]) : undefined,
      };
    }

    if (isSynced) {
      const translatedLines = translatedText.split('\n').map((l: string) => l.trim()).filter(Boolean);
      const syncedResult: SyncedLyricLine[] = (lyrics as SyncedLyricLine[]).map((originalLine, idx) => ({
        time: originalLine.time,
        text: translatedLines[idx] || originalLine.text,
      }));

      return {
        translatedPlain: translatedText,
        translatedSynced: syncedResult,
      };
    }

    return {
      translatedPlain: translatedText,
    };
  } catch (error: any) {
    console.warn('Gemini Lyrics translation warning:', error);
    return {
      translatedPlain: rawText,
      translatedSynced: isSynced ? (lyrics as SyncedLyricLine[]) : undefined,
    };
  }
}
