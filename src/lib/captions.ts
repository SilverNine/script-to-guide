export interface CaptionItem {
  text: string;
  fromMs: number;
  toMs: number;
}

export interface CaptionPhrase {
  text: string;
  words: CaptionItem[];
  fromMs: number;
  toMs: number;
}

/** One word of narration with its time span. Written by scripts/tts_synth.py. */
export interface RawCaption {
  timestamps: { from: string; to: string };
  offsets: { from: number; to: number };
  text: string;
}

export interface RawCaptionsJson {
  transcription: RawCaption[];
}

export const parseCaptions = (raw: RawCaptionsJson): CaptionItem[] =>
  raw.transcription
    .map((item) => ({
      text: (item.text || '').trim(),
      fromMs: item.offsets.from,
      toMs: item.offsets.to,
    }))
    .filter((item) => item.text.length > 0);

/**
 * Short-tail merge.
 *
 * Splitting at `maxWordsPerPhrase` can leave one or two trailing words as a phrase of their own
 * that flashes for half a second. After splitting, a phrase that starts soon after the previous one
 * and is short is appended to the previous phrase instead.
 */
export interface ShortTailMergeOptions {
  /** Merge candidate when the gap from the previous phrase's end is below this */
  gapMs?: number;
  /** Merge candidate when the phrase has at most this many characters */
  maxChars?: number;
  /** Do not merge when the result would exceed this many characters (keeps one line) */
  mergedMaxChars?: number;
}

const DEFAULT_MERGE: Required<ShortTailMergeOptions> = {
  gapMs: 400,
  maxChars: 8,
  mergedMaxChars: 45,
};

export const mergeShortTailPhrases = (phrases: CaptionPhrase[], options: ShortTailMergeOptions = {}): CaptionPhrase[] => {
  const { gapMs, maxChars, mergedMaxChars } = { ...DEFAULT_MERGE, ...options };
  const merged: CaptionPhrase[] = [];

  for (const phrase of phrases) {
    const prev = merged[merged.length - 1];
    if (prev) {
      const gap = phrase.fromMs - prev.toMs;
      const mergedText = `${prev.text} ${phrase.text}`;
      const canMerge = gap < gapMs && phrase.text.length <= maxChars && mergedText.length <= mergedMaxChars;
      if (canMerge) {
        merged[merged.length - 1] = {
          text: mergedText,
          words: [...prev.words, ...phrase.words],
          fromMs: prev.fromMs,
          toMs: phrase.toMs,
        };
        continue;
      }
    }
    merged.push({ ...phrase, words: [...phrase.words] });
  }

  return merged;
};

/** Group words into phrases: break on sentence-ending punctuation, a long pause, or a word limit. */
export const groupIntoPhrases = (
  words: CaptionItem[],
  maxWordsPerPhrase = 8,
  pauseThresholdMs = 800,
  shortTailMerge?: ShortTailMergeOptions | boolean,
): CaptionPhrase[] => {
  const phrases: CaptionPhrase[] = [];
  let buffer: CaptionItem[] = [];

  const flush = () => {
    if (buffer.length === 0) return;
    phrases.push({
      text: buffer.map((w) => w.text).join(' '),
      words: [...buffer],
      fromMs: buffer[0].fromMs,
      toMs: buffer[buffer.length - 1].toMs,
    });
    buffer = [];
  };

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    buffer.push(word);
    const nextWord = words[i + 1];

    const endsWithPunct = /[.!?]$/.test(word.text);
    const longPauseAhead = nextWord && nextWord.fromMs - word.toMs > pauseThresholdMs;
    const tooLong = buffer.length >= maxWordsPerPhrase;

    if (endsWithPunct || longPauseAhead || tooLong) flush();
  }
  flush();

  if (!shortTailMerge) return phrases;
  return mergeShortTailPhrases(phrases, shortTailMerge === true ? {} : shortTailMerge);
};
