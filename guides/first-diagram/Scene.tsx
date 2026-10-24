import { AbsoluteFill, Sequence } from 'guide-runtime';
import { asset, Callout, Cursor, Magnifier, Screen, Spotlight, mid, pad, type Box, StepList, TitleCard } from 'script-to-guide';
import writeBoxes from './public/screens/write.boxes.json';
import menuBoxes from './public/screens/theme-menu.boxes.json';
import linkBoxes from './public/screens/link.boxes.json';
import { cue, DURATION, sceneEnd, sceneStart } from './timing';

/**
 * "Your first diagram in MermanDraw". Every motion is cue(scene, word); no frame is typed by hand.
 * One <Screen> spans every app scene, so the capture never flickers between scenes: captures swap
 * on the click that causes them.
 */

type Boxes = Record<string, Box> & { _size: [number, number] };
const W = writeBoxes as unknown as Boxes;
const M = menuBoxes as unknown as Boxes;
const L = linkBoxes as unknown as Boxes;
const tip = (b: Box): [number, number] => [mid(b)[0] + 4, mid(b)[1] + 4];

/** Regions measured on write.webp that capture.mjs cannot select: the preview pane, a code label, the decision node */
const preview: Box = [720, 44, 720, 766];
const line2 = W.line2;
const labelInLine2: Box = [104, 105, 156, 21];
const decision: Box = [1046, 500, 144, 148];
/** The six code lines, for the magnifier: the code pane is too small to read in a 1080p recording. The lens sits above the caption band */
const codeLines: Box = [36, 78, 372, 140];
const exportBox: Box = [W.svg[0], W.svg[1], W.png[0] + W.png[2] - W.svg[0], W.svg[3]];

const App: React.FC = () => {
  // write
  const left = cue('write', 'left');
  const line = cue('write', 'Each line');
  const brackets = cue('write', 'brackets');
  const right = cue('write', 'right');
  const decide = cue('write', 'decision');
  // theme
  const themeWord = cue('theme', 'Theme');
  const seven = cue('theme', 'seven');
  const neon = cue('theme', 'Neon');
  const changes = cue('theme', 'changes');
  const code = cue('theme', 'code');
  // export
  const exp = cue('export', 'export');
  const png = cue('export', 'PNG');
  // link
  const link = cue('link', 'Link');
  const copies = cue('link', 'copies');
  const share = cue('link', 'Share');
  const appEnd = sceneEnd('link');

  return (
    <AbsoluteFill style={{ background: '#0b0f17' }}>
      <Screen
        size={W._size}
        url="mermandraw.com/app/editor"
        shots={[
          { at: 0, src: asset('screens/write.webp') },
          { at: themeWord + 6, src: asset('screens/theme-menu.webp'), cut: true },
          { at: neon + 6, src: asset('screens/neon.webp') },
          { at: link + 6, src: asset('screens/link.webp'), cut: true },
        ]}
      >
        {/* write */}
        <Spotlight box={W.editor} from={left} to={line} padding={0} radius={4} />
        <Spotlight box={pad(line2, 4)} from={line} to={right} radius={6} />
        <Callout box={labelInLine2} text="label" side="below" from={brackets} to={right} />
        <Magnifier box={codeLines} from={line} to={right} zoom={2.3} at={[548, 290]} label="One line, one arrow" />
        <Spotlight box={preview} from={right} to={decide} padding={0} radius={4} />
        <Spotlight box={decision} from={decide} to={sceneEnd('write')} radius={18} />

        {/* theme */}
        <Cursor
          keys={[
            { at: themeWord - 12, p: tip(W.theme) },
            { at: themeWord + 2, p: tip(W.theme), click: true },
            { at: neon - 4, p: tip(M.neon) },
            { at: neon + 2, p: tip(M.neon), click: true },
            { at: changes + 10 },
          ]}
        />
        <Spotlight box={M.menu} from={seven} to={neon + 6} padding={4} radius={10} />
        <Spotlight box={preview} from={changes} to={code} padding={0} radius={4} />
        <Spotlight box={W.editor} from={code} to={sceneEnd('theme')} padding={0} radius={4} />

        {/* export */}
        <Magnifier box={pad(exportBox, 6)} from={exp} to={sceneEnd('export')} zoom={3} at={[40, 500]} label="SVG for documents, PNG for anywhere" />
        <Cursor keys={[{ at: png - 12, p: tip(W.png) }, { at: png + 4, p: tip(W.png), click: true }, { at: sceneEnd('export') - 4 }]} />

        {/* link */}
        <Cursor keys={[{ at: link - 12, p: tip(W.link) }, { at: link + 2, p: tip(W.link), click: true }, { at: copies + 20 }]} />
        <Magnifier box={pad(L.toast, 10)} from={copies} to={share} zoom={2.4} at={[360, 520]} />
        <Magnifier box={pad(W.share, 6)} from={share} to={appEnd} zoom={3} label="A public page with a preview image" />
      </Screen>
    </AbsoluteFill>
  );
};

export const Scene: React.FC = () => {
  const planAt = sceneStart('plan');
  const appAt = sceneStart('write');
  const endAt = sceneStart('end');
  return (
    <AbsoluteFill style={{ background: '#0b0f17' }}>
      <Sequence from={0} durationInFrames={planAt}>
        <TitleCard kicker="MermanDraw guide" title="Your first diagram" subtitle="Text in, diagram out. About two minutes." />
      </Sequence>
      <Sequence from={planAt} durationInFrames={appAt - planAt}>
        <StepList
          title="Four things to do"
          items={['Write the code', 'Pick a theme', 'Export the picture', 'Send a link']}
          at={[cue('plan', 'Write'), cue('plan', 'pick'), cue('plan', 'export'), cue('plan', 'send')]}
        />
      </Sequence>
      <Sequence from={appAt} durationInFrames={endAt - appAt}>
        <App />
      </Sequence>
      <Sequence from={endAt} durationInFrames={DURATION - endAt}>
        <TitleCard kicker="That is the whole loop" title="mermandraw.com" subtitle="Write, theme, export, send." />
      </Sequence>
    </AbsoluteFill>
  );
};

