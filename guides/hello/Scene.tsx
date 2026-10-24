import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useGuideFrame, useVideoConfig } from 'guide-runtime';
import { Cursor, Magnifier, Pin, Screen, Spotlight, mid, pad, type Box, bodyFontFamily, asset } from 'script-to-guide';
import shot from './public/screens/editor.boxes.json';
import { cue, DURATION, sceneStart } from './timing';

/**
 * Smoke-test guide. Nothing is placed at a hand-typed frame: every motion is cue(scene, word).
 * Blocks use useCurrentFrame() for their own entrance; anything compared with a cue uses useGuideFrame().
 */

const Rise: React.FC<{ at?: number; children: React.ReactNode }> = ({ at = 0, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - at, fps, config: { damping: 22, stiffness: 160 } });
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * 24}px)` }}>{children}</div>;
};

const Title: React.FC = () => (
  <AbsoluteFill style={{ background: '#0b0f17', color: '#fff', alignItems: 'center', justifyContent: 'center', fontFamily: bodyFontFamily }}>
    <Rise at={2}>
      <div style={{ fontSize: 132, fontWeight: 900, letterSpacing: -4 }}>Guides that talk</div>
    </Rise>
    <Rise at={12}>
      <div style={{ fontSize: 44, fontWeight: 500, opacity: 0.65, marginTop: 24 }}>script-to-guide smoke test</div>
    </Rise>
  </AbsoluteFill>
);

const BoxDemo: React.FC = () => {
  const f = useGuideFrame();
  const green = cue('cue', 'green');
  const slide = cue('cue', 'slide');
  const lit = interpolate(f, [green, green + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const x = interpolate(f, [slide, slide + 24], [0, 420], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: '#0b0f17', color: '#fff', fontFamily: bodyFontFamily }}>
      <Rise at={4}>
        <div style={{ position: 'absolute', left: 160, top: 380, fontSize: 60, fontWeight: 800, width: 720, lineHeight: 1.25 }}>
          The box follows the narration.
        </div>
      </Rise>
      <div
        style={{
          position: 'absolute',
          left: 1000 + x,
          top: 400,
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

const B = shot as unknown as Record<string, Box> & { _size: [number, number] };
const exportBox: Box = [B.svg[0], B.svg[1], B.png[0] + B.png[2] - B.svg[0], B.svg[3]];
/** The right half of the screen below the header: the preview pane */
const previewBox: Box = [720, 44, 720, 766];

const Editor: React.FC = () => {
  const end = DURATION;
  const code = cue('editor', 'code pane');
  const preview = cue('editor', 'preview');
  const png = cue('editor', 'PNG');
  const share = cue('editor', 'Share');
  return (
    <AbsoluteFill style={{ background: '#0b0f17' }}>
      <Screen src={asset('screens/editor.webp')} size={B._size} url="mermandraw.com/app/editor">
        <Spotlight box={B.editor} from={code} to={preview} padding={0} radius={4} />
        <Pin at={[B.editor[0] + B.editor[2] - 40, B.editor[1] + 40]} n={1} from={code} to={preview} />
        <Spotlight box={previewBox} from={preview} to={png - 6} padding={0} radius={4} />
        <Pin at={[previewBox[0] + previewBox[2] - 40, previewBox[1] + 50]} n={2} from={preview} to={png - 6} />
        <Magnifier box={pad(exportBox, 6)} from={png - 4} to={share} zoom={3} label="Export as SVG or PNG" />
        <Magnifier box={pad(B.share, 6)} from={share} to={end} zoom={3} label="Share a link" />
        <Cursor
          keys={[
            { at: png - 10, p: [mid(B.png)[0] + 4, mid(B.png)[1] + 4] },
            { at: png + 8, p: [mid(B.png)[0] + 4, mid(B.png)[1] + 4], click: true },
            { at: share, p: [mid(B.share)[0] + 4, mid(B.share)[1] + 4] },
            { at: share + 18, p: [mid(B.share)[0] + 4, mid(B.share)[1] + 4], click: true },
          ]}
        />
      </Screen>
    </AbsoluteFill>
  );
};

export const Scene: React.FC = () => {
  const cueAt = sceneStart('cue');
  const editorAt = sceneStart('editor');
  return (
    <AbsoluteFill style={{ background: '#0b0f17' }}>
      <Sequence from={0} durationInFrames={cueAt}>
        <Title />
      </Sequence>
      <Sequence from={cueAt} durationInFrames={editorAt - cueAt}>
        <BoxDemo />
      </Sequence>
      <Sequence from={editorAt} durationInFrames={DURATION - editorAt}>
        <Editor />
      </Sequence>
    </AbsoluteFill>
  );
};
