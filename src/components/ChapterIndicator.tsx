import { AbsoluteFill, interpolate, useCurrentFrame } from 'guide-runtime';
import { codeFontFamily } from '../theme/fonts';
import { colors } from '../theme/tokens';

export interface ChapterIndicatorProps {
  partNumber: number;
  totalParts: number;
  partTitle: string;
}

/** A small "PART n / N · title" pill in the top-left corner. */
export const ChapterIndicator: React.FC<ChapterIndicatorProps> = ({ partNumber, totalParts, partTitle }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      <div
        style={{
          position: 'absolute',
          top: 56,
          left: 64,
          padding: '14px 26px',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          borderRadius: 999,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          fontFamily: codeFontFamily,
          fontSize: 32,
          fontWeight: 500,
          color: colors.fg,
          letterSpacing: 3,
          opacity,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <span>{`PART ${partNumber} / ${totalParts}`}</span>
        <span style={{ opacity: 0.5 }}>·</span>
        <span>{partTitle}</span>
      </div>
    </AbsoluteFill>
  );
};
