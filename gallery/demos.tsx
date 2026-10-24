import { AbsoluteFill } from 'guide-runtime';
import { asset } from '../player/assets';
import { Callout, Cursor, Magnifier, Pin, Redact, Screen, Spotlight, TypeIn, mid, pad, type Box } from '../src/components/overlays';
import { ChapterCard, Dialog, StepList, TitleCard } from '../src/components/cards';
import editorBoxes from './public/screens/editor.boxes.json';
import themeBoxes from './public/screens/theme.boxes.json';

/**
 * Gallery demos. One per card in cards/. Frames here are plain numbers so each demo loops on its own;
 * in a guide the same props take cue(scene, word).
 */

type Boxes = Record<string, Box> & { _size: [number, number] };
const E = editorBoxes as unknown as Boxes;
const T = themeBoxes as unknown as Boxes;
const editor = () => asset('screens/editor.webp');
const theme = () => asset('screens/theme.webp');
const exportBox: Box = [E.svg[0], E.svg[1], E.png[0] + E.png[2] - E.svg[0], E.svg[3]];
const previewBox: Box = [720, 44, 720, 766];
const tip = (b: Box): [number, number] => [mid(b)[0] + 4, mid(b)[1] + 4];

export interface Demo {
  id: string;
  name: string;
  summary: string;
  group: 'point' | 'focus' | 'change' | 'card';
  frames: number;
  Demo: React.FC;
  code: string;
}

const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => <AbsoluteFill style={{ background: '#0b0f17' }}>{children}</AbsoluteFill>;

export const DEMOS: Demo[] = [
  {
    id: 'spotlight',
    name: 'Spotlight',
    summary: 'Dim everything except the part being talked about.',
    group: 'focus',
    frames: 150,
    Demo: () => (
      <Stage>
        <Screen src={editor()} size={E._size} url="mermandraw.com/app/editor">
          <Spotlight box={E.editor} from={14} to={70} padding={0} radius={4} />
          <Spotlight box={previewBox} from={76} to={136} padding={0} radius={4} />
        </Screen>
      </Stage>
    ),
    code: `<Spotlight box={B.editor} from={cue('s2', 'code')} to={cue('s2', 'preview')} />`,
  },
  {
    id: 'pin',
    name: 'Numbered pin',
    summary: 'A marker whose number matches the step in the side panel.',
    group: 'point',
    frames: 150,
    Demo: () => (
      <Stage>
        <Screen src={editor()} size={E._size} url="mermandraw.com/app/editor">
          <Pin at={[E.examples[0] + E.examples[2] + 6, E.examples[1] + 26]} n={1} from={14} to={140} />
          <Pin at={[E.theme[0] + E.theme[2] + 6, E.theme[1] + 26]} n={2} from={40} to={140} />
          <Pin at={[E.share[0] - 6, E.share[1] + 30]} n={3} from={66} to={140} />
        </Screen>
      </Stage>
    ),
    code: `<Pin at={[x, y]} n={2} from={cue('s3', 'theme')} to={sceneEnd} />`,
  },
  {
    id: 'magnifier',
    name: 'Magnifier',
    summary: 'Enlarge a small control in an inset without moving the camera.',
    group: 'focus',
    frames: 150,
    Demo: () => (
      <Stage>
        <Screen src={editor()} size={E._size} url="mermandraw.com/app/editor">
          <Magnifier box={pad(exportBox, 6)} from={14} to={136} zoom={3} label="Export as SVG or PNG" />
        </Screen>
      </Stage>
    ),
    code: `<Magnifier box={pad(B.export, 6)} from={cue('s4', 'export')} to={next} zoom={3} label="Export" />`,
  },
  {
    id: 'cursor',
    name: 'Cursor and click',
    summary: 'A pointer that travels to a control and clicks it.',
    group: 'point',
    frames: 150,
    Demo: () => (
      <Stage>
        <Screen src={editor()} size={E._size} url="mermandraw.com/app/editor">
          <Cursor
            keys={[
              { at: 10, p: [600, 420] },
              { at: 44, p: tip(E.png) },
              { at: 58, p: tip(E.png), click: true },
              { at: 96, p: tip(E.share) },
              { at: 108, p: tip(E.share), click: true },
              { at: 140 },
            ]}
          />
        </Screen>
      </Stage>
    ),
    code: `<Cursor keys={[
  { at: cue('s4', 'PNG') - 10, p: mid(B.png) },
  { at: cue('s4', 'PNG') + 8, p: mid(B.png), click: true },
]} />`,
  },
  {
    id: 'callout',
    name: 'Callout',
    summary: 'A short label attached to a control.',
    group: 'point',
    frames: 150,
    Demo: () => (
      <Stage>
        <Screen src={editor()} size={E._size} url="mermandraw.com/app/editor">
          <Callout box={E.theme} text="Seven diagram themes" from={14} to={136} />
          <Callout box={E.share} text="Share a link" side="left" from={54} to={136} />
        </Screen>
      </Stage>
    ),
    code: `<Callout box={B.theme} text="Seven diagram themes" from={cue('s3', 'theme')} to={next} />`,
  },
  {
    id: 'type-in',
    name: 'Type in',
    summary: 'Text typed into a field, with a caret.',
    group: 'change',
    frames: 150,
    Demo: () => (
      <Stage>
        <Screen src={editor()} size={E._size} url="mermandraw.com/app/editor" camera={[{ at: 6, box: [0, 72, 720, 260], zoom: 1.8, len: 18 }, { at: 128, len: 18 }]}>
          <TypeIn box={E.line2} text="    A[Script] -->|cue| B[Guide]" from={28} cps={16} tone="dark" mono fontSize={14} />
        </Screen>
      </Stage>
    ),
    code: `<TypeIn box={B.line2} text="A[Script] --> B[Guide]" from={cue('s2', 'type')} tone="dark" mono />`,
  },
  {
    id: 'screen-swap',
    name: 'Screen swap',
    summary: 'Switch to another capture when the app changes state.',
    group: 'change',
    frames: 160,
    Demo: () => (
      <Stage>
        <Screen
          shots={[
            { at: 0, src: editor() },
            { at: 50, src: theme() },
            { at: 132, src: editor(), cut: true },
          ]}
          size={E._size}
          url="mermandraw.com/app/editor"
        >
          <Cursor keys={[{ at: 8, p: [700, 400] }, { at: 32, p: tip(E.theme) }, { at: 44, p: tip(E.theme), click: true }, { at: 90, p: tip(T.dark) }, { at: 102, p: tip(T.dark), click: true }, { at: 150 }]} />
          <Spotlight box={T.menu} from={58} to={128} padding={4} radius={10} />
        </Screen>
      </Stage>
    ),
    code: `<Screen shots={[
  { at: 0, src: asset('screens/editor.webp') },
  { at: cue('s3', 'opens'), src: asset('screens/theme-menu.webp') },
]} size={B._size} />`,
  },
  {
    id: 'camera',
    name: 'Camera push-in',
    summary: 'Move closer to one area, then back out. Use sparingly.',
    group: 'focus',
    frames: 150,
    Demo: () => (
      <Stage>
        <Screen
          src={editor()}
          size={E._size}
          url="mermandraw.com/app/editor"
          camera={[
            { at: 14, box: [880, 0, 560, 300], len: 24 },
            { at: 110, len: 24 },
          ]}
        />
      </Stage>
    ),
    code: `<Screen src={…} size={B._size} camera={[
  { at: cue('s5', 'toolbar'), box: B.toolbar },
  { at: cue('s5', 'back') },
]} />`,
  },
  {
    id: 'redact',
    name: 'Redact',
    summary: 'Blur or block anything that must not be readable.',
    group: 'focus',
    frames: 120,
    Demo: () => (
      <Stage>
        <Screen src={editor()} size={E._size} url="mermandraw.com/app/editor">
          <Redact box={[43, 100, 640, 210]} from={20} label="HIDDEN" />
          <Redact box={E.diagram} from={46} mode="block" label="HIDDEN" />
        </Screen>
      </Stage>
    ),
    code: `<Redact box={B.accountId} mode="blur" />`,
  },
  {
    id: 'title-card',
    name: 'Title card',
    summary: 'The opening card, and the poster before play.',
    group: 'card',
    frames: 120,
    Demo: () => <TitleCard kicker="MermanDraw guide" title="Your first diagram" subtitle="From text to a shareable link in two minutes" />,
    code: `<TitleCard kicker="Product guide" title="Your first diagram" subtitle="Two minutes" />`,
  },
  {
    id: 'chapter-card',
    name: 'Chapter card',
    summary: 'A break between parts, with the whole list for orientation.',
    group: 'card',
    frames: 120,
    Demo: () => <ChapterCard n={2} title="Pick a theme" sub="Seven looks, one click" all={['Write', 'Pick a theme', 'Export', 'Share']} />,
    code: `<ChapterCard n={2} title="Pick a theme" all={['Write', 'Pick a theme', 'Export', 'Share']} />`,
  },
  {
    id: 'step-list',
    name: 'Step list',
    summary: 'A list that lights one item per spoken step.',
    group: 'card',
    frames: 130,
    Demo: () => <StepList title="Three things to try" items={['Paste your diagram', 'Pick a theme', 'Share the link']} at={[18, 46, 74]} />,
    code: `<StepList items={['Paste', 'Theme', 'Share']} at={[cue('s1', 'paste'), cue('s1', 'theme'), cue('s1', 'share')]} />`,
  },
  {
    id: 'dialog',
    name: 'Drawn dialog',
    summary: 'A neutral confirm dialog for screens you cannot capture.',
    group: 'change',
    frames: 140,
    Demo: () => (
      <Dialog
        title="Allow clipboard access?"
        body="The editor reads the diagram you copied so it can paste it for you."
        primary="Allow"
        secondary="Not now"
        from={18}
        pressAt={92}
        backdrop={
          <Stage>
            <Screen src={editor()} size={E._size} url="mermandraw.com/app/editor" />
          </Stage>
        }
      />
    ),
    code: `<Dialog title="Allow clipboard access?" primary="Allow" secondary="Not now"
  from={cue('s2', 'asks')} pressAt={cue('s2', 'allow')} backdrop={<Screen … />} />`,
  },
];
