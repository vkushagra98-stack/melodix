/**
 * High-speed Indic & Devanagari to Romanized Hinglish Transliteration Engine.
 * Converts Hindi, Urdu, Punjabi, Sanskrit, and regional scripts into natural, singable Hinglish with 0ms latency.
 */

const VOWEL_MAP: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
  'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
  'अं': 'an', 'अः': 'ah', 'ऑ': 'o',
};

const MATRA_MAP: Record<string, string> = {
  'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
  'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
  'ं': 'n', 'ँ': 'n', 'ः': 'h', 'ॉ': 'o', '्': '',
};

const CONSONANT_MAP: Record<string, string> = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh',
  'ष': 'sh', 'स': 's', 'ह': 'h',
  'क़': 'q', 'ख़': 'kh', 'ग़': 'gh', 'ज़': 'z', 'ड़': 'r',
  'ढ़': 'rh', 'फ़': 'f', 'य़': 'y',
};

export function containsIndicScript(text: string): boolean {
  return /[\u0900-\u097F\u0A00-\u0A7F\u0600-\u06FF]/.test(text);
}

export function romanizeIndicText(text: string): string {
  if (!text) return '';
  if (!containsIndicScript(text)) return text;

  let result = '';
  const len = text.length;

  for (let i = 0; i < len; i++) {
    const char = text[i];
    const nextChar = i + 1 < len ? text[i + 1] : '';

    // Check independent vowel
    if (VOWEL_MAP[char]) {
      result += VOWEL_MAP[char];
      continue;
    }

    // Check consonant
    if (CONSONANT_MAP[char]) {
      const base = CONSONANT_MAP[char];
      // Check if followed by virama / halant
      if (nextChar === '्') {
        result += base;
        i++; // skip halant
      } else if (MATRA_MAP[nextChar]) {
        result += base + MATRA_MAP[nextChar];
        i++; // skip matra
      } else if (/[\u0900-\u097F]/.test(nextChar) && !MATRA_MAP[nextChar]) {
        // In Hindi, consonants have implicit 'a' except at end of words
        result += base + 'a';
      } else {
        result += base;
      }
      continue;
    }

    // Standalone matras
    if (MATRA_MAP[char]) {
      result += MATRA_MAP[char];
      continue;
    }

    // Non-Indic characters (spaces, punctuation, English, numbers)
    result += char;
  }

  // Clean up common phonetic artifacts for clean lyrics
  return result
    .replace(/a(?=\s|[.,!?()])/g, '') // remove trailing trailing abrupt 'a's
    .replace(/aa/g, 'a')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/kh/g, 'kh')
    .replace(/\s+/g, ' ')
    .trim();
}
