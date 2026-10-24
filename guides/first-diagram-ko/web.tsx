import { type GuideDefinition, asset } from 'script-to-guide';
import { Scene } from './Scene';
import { captions, DURATION, FPS, sceneStart } from './timing';

const DIAGRAM = `flowchart TD
    A[대본 쓰기] --> B[화면 캡처]
    B --> C[내레이션 합성]
    C --> D{발음이 맞나?}
    D -->|아니요| A
    D -->|예| E[가이드 공개]`;

const guide: GuideDefinition = {
  id: 'first-diagram-ko',
  Scene,
  fps: FPS,
  durationInFrames: DURATION,
  asset,
  audio: 'narration.mp3',
  captions,
  poster: 40,
  steps: [
    { id: 'overview', label: '할 일 살펴보기', at: 0 },
    { id: 'write', label: '코드 쓰기', at: sceneStart('write'), copy: [DIAGRAM] },
    { id: 'theme', label: '테마 고르기', at: sceneStart('theme') },
    { id: 'export', label: '그림 내보내기', at: sceneStart('export') },
    { id: 'link', label: '링크 보내기', at: sceneStart('link') },
    { id: 'end', label: '직접 해 보기', at: sceneStart('end'), copy: ['https://mermandraw.com/app/editor/'] },
  ],
  title: 'MermanDraw로 첫 다이어그램 만들기',
  subtitle: 'script-to-guide로 만든 한국어 샘플 가이드',
  note:
    '내레이션은 Edge 신경망 음성(ko-KR-InJoonNeural)으로 API 키 없이 합성했습니다. 화면은 mermandraw.com을 데모 내용으로 딥링크에서 캡처했습니다. ' +
    'script-to-guide로 만들었고, 대본과 캡처와 장면 파일은 guides/first-diagram-ko에 있습니다.',
  preload: __IMAGES__,
  stage: '#0b0f17',
};

export default guide;
