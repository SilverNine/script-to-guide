import { AbsoluteFill, Sequence } from 'guide-runtime';
import { asset, Callout, Cursor, Magnifier, Screen, Spotlight, mid, pad, type Box, StepList, TitleCard } from 'script-to-guide';
import writeBoxes from './public/screens/write.boxes.json';
import menuBoxes from './public/screens/theme-menu.boxes.json';
import linkBoxes from './public/screens/link.boxes.json';
import { cue, DURATION, sceneEnd, sceneStart } from './timing';

/**
 * "MermanDraw로 첫 다이어그램 만들기". The Korean twin of guides/first-diagram: same flow, Korean
 * narration and diagram, every motion placed with cue(scene, word). One <Screen> spans every app
 * scene; captures swap on the click that causes them.
 */

type Boxes = Record<string, Box> & { _size: [number, number] };
const W = writeBoxes as unknown as Boxes;
const M = menuBoxes as unknown as Boxes;
const L = linkBoxes as unknown as Boxes;
const tip = (b: Box): [number, number] => [mid(b)[0] + 4, mid(b)[1] + 4];

/** Regions measured on write.webp that capture.mjs cannot select: the preview pane, a code label, the decision node, the code lines */
const preview: Box = [720, 44, 720, 766];
const labelInLine2: Box = [92, 105, 62, 21];
const decision: Box = [1040, 508, 132, 132];
const codeLines: Box = [36, 78, 250, 140];
const exportBox: Box = [W.svg[0], W.svg[1], W.png[0] + W.png[2] - W.svg[0], W.svg[3]];

const App: React.FC = () => {
  // write
  const left = cue('write', '왼쪽에');
  const line = cue('write', '한 줄이');
  const brackets = cue('write', '대괄호');
  const right = cue('write', '오른쪽');
  const decide = cue('write', '판단');
  // theme
  const themeWord = cue('theme', 'Theme');
  const seven = cue('theme', 'Clean부터');
  const neon = cue('theme', 'Neon을');
  const changes = cue('theme', '미리보기가');
  const code = cue('theme', '코드는');
  // export
  const exp = cue('export', '그림으로');
  const png = cue('export', 'PNG는');
  // link
  const link = cue('link', 'Link를');
  const copies = cue('link', '복사된');
  const share = cue('link', 'Share가');
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
        {/* write: the code is magnified while the narration explains one line */}
        <Spotlight box={W.editor} from={left} to={line} padding={0} radius={4} />
        <Spotlight box={pad(W.line2, 4)} from={line} to={right} radius={6} />
        <Magnifier box={codeLines} from={line} to={right} zoom={2.8} at={[560, 250]} label="한 줄이 화살표 하나" />
        <Callout box={labelInLine2} text="상자 이름" side="below" from={brackets} to={right} />
        <Spotlight box={preview} from={right} to={decide} padding={0} radius={4} />
        <Spotlight box={decision} from={decide} to={sceneEnd('write')} radius={18} />

        {/* theme: the menu is magnified while its seven themes are named */}
        <Cursor
          keys={[
            { at: themeWord - 12, p: tip(W.theme) },
            { at: themeWord + 2, p: tip(W.theme), click: true },
            { at: neon - 4, p: tip(M.neon) },
            { at: neon + 2, p: tip(M.neon), click: true },
            { at: changes + 10 },
          ]}
        />
        <Spotlight box={M.menu} from={themeWord + 6} to={neon + 6} padding={4} radius={10} />
        <Magnifier box={pad(M.menu, 4)} from={seven} to={neon} zoom={1.9} at={[420, 110]} label="테마 7가지" />
        <Spotlight box={preview} from={changes} to={code} padding={0} radius={4} />
        <Spotlight box={W.editor} from={code} to={sceneEnd('theme')} padding={0} radius={4} />

        {/* export */}
        <Magnifier box={pad(exportBox, 6)} from={exp} to={sceneEnd('export')} zoom={3} at={[40, 500]} label="SVG는 문서용, PNG는 어디든" />
        <Cursor keys={[{ at: png - 12, p: tip(W.png) }, { at: png + 4, p: tip(W.png), click: true }, { at: sceneEnd('export') - 4 }]} />

        {/* link */}
        <Cursor keys={[{ at: link - 12, p: tip(W.link) }, { at: link + 2, p: tip(W.link), click: true }, { at: copies + 20 }]} />
        <Magnifier box={pad(L.toast, 10)} from={copies} to={share} zoom={2.4} at={[360, 480]} />
        <Magnifier box={pad(W.share, 6)} from={share} to={appEnd} zoom={3} label="미리보기 이미지가 있는 공개 페이지" />
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
        <TitleCard kicker="MermanDraw 가이드" title="첫 다이어그램" subtitle="글로 쓰면 그림이 됩니다. 2분이면 충분합니다." />
      </Sequence>
      <Sequence from={planAt} durationInFrames={appAt - planAt}>
        <StepList
          title="할 일 네 가지"
          items={['코드 쓰기', '테마 고르기', '그림 내보내기', '링크 보내기']}
          at={[cue('plan', '코드를'), cue('plan', '테마를'), cue('plan', '그림을'), cue('plan', '링크를')]}
        />
      </Sequence>
      <Sequence from={appAt} durationInFrames={endAt - appAt}>
        <App />
      </Sequence>
      <Sequence from={endAt} durationInFrames={DURATION - endAt}>
        <TitleCard kicker="여기까지가 한 바퀴" title="mermandraw.com" subtitle="쓰고, 고르고, 내보내고, 보냅니다." />
      </Sequence>
    </AbsoluteFill>
  );
};
