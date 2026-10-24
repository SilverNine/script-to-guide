import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'guide-runtime';
import { Captions } from '../../src/components/Captions';
import { bodyFontFamily } from '../../src/theme/fonts';
import { captions, cue, DURATION, scene, speechEnd } from './timing';

/**
 * Smoke-test scene. A title card, then a box that reacts to two words of the narration.
 * Nothing here is placed at a hand-typed frame: every motion is cue(scene, word).
 */
const Rise: React.FC<{ at?: number; children: React.ReactNode }> = ({ at = 0, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - at, fps, config: { damping: 22, stiffness: 160 } });
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * 24}px)` }}>{children}</div>;
};

const Title: React.FC = () => (
  <AbsoluteFill style={{ background: '#0b0f17', color: '#fff', alignItems: 'center', justifyContent: 'center', fontFamily: bodyFontFamily, paddingBottom: 140 }}>
    <Rise at={2}>
      <div style={{ fontSize: 120, fontWeight: 900, letterSpacing: -4 }}>Guides that talk</div>
    </Rise>
    <Rise at={12}>
      <div style={{ fontSize: 44, fontWeight: 500, opacity: 0.7, marginTop: 24 }}>script-to-guide smoke test</div>
    </Rise>
  </AbsoluteFill>
);

/** `offset` is the Sequence start: cues are absolute frames, useCurrentFrame() inside a Sequence is relative */
const Box: React.FC<{ offset: number }> = ({ offset }) => {
  const frame = useCurrentFrame() + offset;
  const green = cue('cue', 'green');
  const slide = cue('cue', 'slide');
  const lit = interpolate(frame, [green, green + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const x = interpolate(frame, [slide, slide + 24], [0, 420], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: '#0b0f17', color: '#fff', fontFamily: bodyFontFamily, paddingBottom: 140, justifyContent: 'center' }}>
      <div style={{ position: 'absolute', left: 160, top: 300, fontSize: 56, fontWeight: 700, width: 700, lineHeight: 1.3 }}>
        The box follows the narration.
      </div>
      <div
        style={{
          position: 'absolute',
          left: 1000 + x,
          top: 330,
          width: 280,
          height: 280,
          borderRadius: 32,
          background: `rgb(${Math.round(60 + (34 - 60) * lit)}, ${Math.round(70 + (197 - 70) * lit)}, ${Math.round(90 + (94 - 90) * lit)})`,
          boxShadow: lit ? '0 0 0 8px rgba(34,197,94,.25)' : 'none',
        }}
      />
    </AbsoluteFill>
  );
};

export const Scene: React.FC = () => {
  const boxAt = speechEnd('intro') + 18;
  return (
    <AbsoluteFill style={{ background: '#0b0f17' }}>
      <Sequence from={0} durationInFrames={boxAt}>
        <Title />
      </Sequence>
      <Sequence from={boxAt} durationInFrames={DURATION - scene('cue').fromFrame}>
        <Box offset={boxAt} />
      </Sequence>
      <Captions rawCaptions={captions} />
    </AbsoluteFill>
  );
};
