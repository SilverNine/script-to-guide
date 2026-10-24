import { useMemo } from 'react';
import { mergeShortTailPhrases, type CaptionPhrase, type RawCaptionsJson } from '../lib/captions';
import { useNarrationSync } from '../lib/narration';
import { bodyFontFamily } from '../theme/fonts';
import { colors } from '../theme/tokens';
import { CAPTION_ZONE_HEIGHT } from './BodyVisualSlot';

interface CaptionsProps {
  rawCaptions: RawCaptionsJson;
  /** 'dark' for a black stage (default), 'light' for a white stage */
  theme?: 'dark' | 'light';
  /** Merge one- or two-word trailing phrases into the previous phrase. Off by default. */
  mergeShortTails?: boolean;
  /**
   * How many ms to keep a caption after its phrase ends. Unset keeps it until the next phrase,
   * which suits continuous narration; set it for guides with long silent demo stretches.
   */
  holdMs?: number;
}

/** Burned-in captions on the stage. The current phrase of the narration, one line, bottom band. */
export const Captions: React.FC<CaptionsProps> = ({ rawCaptions, theme = 'dark', mergeShortTails = false, holdMs }) => {
  const { phrases: basePhrases, currentPhraseIdx: basePhraseIdx, currentMs } = useNarrationSync(rawCaptions);

  const mergedPhrases = useMemo(
    () => (mergeShortTails ? mergeShortTailPhrases(basePhrases) : basePhrases),
    [basePhrases, mergeShortTails],
  );

  const activePhrase: CaptionPhrase | null = useMemo(() => {
    if (!mergeShortTails) return basePhraseIdx === null ? null : basePhrases[basePhraseIdx];
    for (let i = 0; i < mergedPhrases.length; i++) {
      if (mergedPhrases[i].fromMs <= currentMs && currentMs < mergedPhrases[i].toMs) return mergedPhrases[i];
    }
    for (let i = mergedPhrases.length - 1; i >= 0; i--) {
      if (mergedPhrases[i].toMs <= currentMs) return mergedPhrases[i];
    }
    return null;
  }, [mergeShortTails, basePhrases, basePhraseIdx, mergedPhrases, currentMs]);

  const visiblePhrase = activePhrase && holdMs !== undefined && currentMs >= activePhrase.toMs + holdMs ? null : activePhrase;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: CAPTION_ZONE_HEIGHT,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 80px',
        pointerEvents: 'none',
        borderTop: theme === 'light' ? '1px solid rgba(20, 24, 40, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
        backgroundColor: theme === 'light' ? 'rgba(20, 24, 40, 0.03)' : 'rgba(0, 0, 0, 0.4)',
      }}
    >
      {visiblePhrase && (
        <div
          style={{
            fontFamily: bodyFontFamily,
            fontSize: 46,
            fontWeight: 700,
            color: theme === 'light' ? '#25303c' : colors.fg,
            letterSpacing: -1,
            lineHeight: 1.25,
            textAlign: 'center',
            maxWidth: 1700,
          }}
        >
          {visiblePhrase.text}
        </div>
      )}
    </div>
  );
};
