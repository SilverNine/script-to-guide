import { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'guide-runtime';
import { groupIntoPhrases, parseCaptions, type CaptionItem, type CaptionPhrase, type RawCaptionsJson } from './captions';

export interface NarrationSync {
  words: CaptionItem[];
  phrases: CaptionPhrase[];
  currentWordIdx: number | null;
  currentPhraseIdx: number | null;
  currentMs: number;
}

const findByTime = (items: { fromMs: number; toMs: number }[], ms: number): number | null => {
  for (let i = 0; i < items.length; i++) {
    if (items[i].fromMs <= ms && ms < items[i].toMs) return i;
  }
  // between items: the one that just ended
  for (let i = items.length - 1; i >= 0; i--) {
    if (items[i].toMs <= ms) return i;
  }
  return null;
};

/** Which word and phrase of the narration the current frame falls in. */
export const useNarrationSync = (rawCaptions: RawCaptionsJson): NarrationSync => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;

  const { words, phrases } = useMemo(() => {
    const w = parseCaptions(rawCaptions);
    const p = groupIntoPhrases(w);
    return { words: w, phrases: p };
  }, [rawCaptions]);

  const currentWordIdx = useMemo(() => findByTime(words, currentMs), [words, currentMs]);
  const currentPhraseIdx = useMemo(() => findByTime(phrases, currentMs), [phrases, currentMs]);

  return { words, phrases, currentWordIdx, currentPhraseIdx, currentMs };
};
