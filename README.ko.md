# script-to-guide

**말하는 가이드.** 대본과 스크린샷을 넣으면 내레이션이 붙은 제품 사용 가이드가 나옵니다. 결과물은 작은 정적 웹 페이지이고(샘플은 1.4MB), 파일이 필요하면 MP4로도 냅니다.

[Claude Code](https://claude.com/claude-code) / [Codex](https://openai.com/codex) 스킬입니다. MIT. 영문 [README](README.md)가 정본이고, 이 문서는 요약입니다.

![샘플 가이드. 내레이션이 "Theme"라고 말할 때 커서가 테마 메뉴를 열고, "seven themes"에서 메뉴가 강조되고, "Neon"에서 미리보기가 네온으로 바뀝니다](docs/demo.gif)

**[한국어 샘플 가이드를 소리와 함께 재생](https://silvernine.github.io/script-to-guide/first-diagram-ko/)** (1분 38초, 한국어). 같은 흐름의 [영어 샘플](https://silvernine.github.io/script-to-guide/first-diagram/)(1분 29초)도 있습니다. [mermandraw.com](https://mermandraw.com)에서 코드 작성, 테마 선택, 내보내기, 링크 공유를 안내합니다. 만든 재료는 전부 [`guides/first-diagram-ko`](guides/first-diagram-ko)와 [`guides/first-diagram`](guides/first-diagram)에 있습니다. 대본, 캡처 4장, 장면 파일 하나이고 모든 강조는 `cue(장면, 단어)`로 걸었습니다.

모든 동작은 [갤러리](https://silvernine.github.io/script-to-guide/gallery/)에서 움직이는 모습으로 볼 수 있습니다.

## 무엇을 하나

대본을 씁니다. 문단마다 어느 장면인지, 화면에 무엇이 보여야 하는지 적습니다. 에이전트가 웹 앱을 헤드리스 브라우저로 캡처하고(직접 찍은 스크린샷도 됩니다), 내레이션을 합성하고, 가이드를 조립합니다. 화면의 모든 동작은 내레이션의 단어에 걸립니다.

## 왜 영상 파일이 아닌가

제품 화면은 바뀝니다. 녹화한 영상은 그때마다 다시 찍어야 합니다. 대본에서 만든 가이드는 고쳐서 다시 빌드하면 됩니다.

- **키프레임 대신 큐.** 타임라인에 손으로 놓는 것이 없습니다. `cue(장면, 단어)`가 모든 강조, 확대, 커서 이동을 내레이션에 묶습니다. 문장을 바꾸고 다시 합성하면 화면이 따라옵니다.
- **재촬영 대신 캡처 한 장 교체.** 버튼 자리가 바뀌면 그 캡처만 바꾸고 다시 빌드합니다.
- **웹 페이지입니다.** 대본이 글자라서 선택하고 검색할 수 있습니다. 배속과 단계 이동이 기본입니다. 따라하기 모드는 단계마다 멈춰서 보는 사람이 자기 앱에서 해 볼 수 있게 합니다. 폴더를 아무 정적 호스팅에 올리고 `<iframe>`으로 넣습니다.
- **필요하면 영상으로.** 같은 타임라인을 헤드리스 브라우저에서 프레임 단위로 찍어 MP4로 냅니다. 영상 프레임워크 의존성이 없습니다.
- **받아쓰기로 확인한 내레이션.** 합성한 음성을 다시 받아써서 대본과 비교합니다. 사전에 등록한 오독은 개수로, 나머지는 일치도 점수로 알려 줍니다.

## 설치

가장 쉬운 방법은 에이전트에게 링크를 주는 것입니다. "이 스킬 설치해 줘: https://github.com/SilverNine/script-to-guide". 직접 설치하려면 아래 중 하나를 고릅니다.

```bash
# Claude Code, Codex 등 스킬을 읽는 에이전트 공통, skills.sh
npx skills add SilverNine/script-to-guide

# Claude Code 플러그인
claude plugin marketplace add SilverNine/script-to-guide
claude plugin install script-to-guide@silvernine

# Codex (또는 플러그인 없이 Claude Code)
git clone https://github.com/SilverNine/script-to-guide.git ~/.script-to-guide
mkdir -p ~/.codex/skills ~/.claude/skills
ln -s ~/.script-to-guide ~/.codex/skills/script-to-guide
ln -s ~/.script-to-guide ~/.claude/skills/script-to-guide
```

에이전트에게 가이드를 만들어 달라고 하면 처음 한 번 `setup`이 돕니다. Node 패키지, Playwright Chromium(약 150MB), Python 가상환경을 스킬 폴더 안에 설치합니다. 첫 내레이션 검사 때 whisper 모델을 받습니다(영어 약 490MB, 한국어 등 다른 언어 약 570MB).

macOS나 Linux, Node 18 이상, Python 3.10 이상(Debian, Ubuntu는 `python3-venv` 포함), ffmpeg가 필요합니다. Windows는 시험하지 않았습니다.

스킬 폴더에는 엔진만 있습니다. 가이드는 내 프로젝트의 `guides/<이름>/`에, 빌드 결과는 `dist/`에 생깁니다. 스킬을 업데이트해도 내 작업은 그대로입니다. 내 프로젝트의 `.gitignore`에는 `dist/`와 `guides/*/takes/`를 넣습니다.

## 에이전트 없이 쓰기

```bash
stg() { node ~/.script-to-guide/scripts/stg.mjs "$@"; }
stg setup                     # 처음 한 번, 업데이트 뒤 한 번
stg doctor                    # 설치 상태 확인
stg new signup                # 샘플을 복사해 ./guides/signup/ 생성
stg synth signup              # 내레이션, 자막, 장면 시간표
stg verify signup             # 받아쓰기로 대본과 비교
stg build signup              # dist/signup/index.html
stg mp4 signup                # dist/signup.mp4 + .srt
```

플러그인으로 설치했다면 엔진 경로는 `~/.claude/plugins/cache/silvernine/script-to-guide/<버전>`입니다.

## 음성

- **Edge**(기본): edge-tts 패키지로 Microsoft Edge 신경망 음성을 씁니다. API 키 없이 동작합니다. 공식 공개 API가 아니므로 공개 배포 전에 이용 조건을 직접 확인하세요.
- **ElevenLabs**: `ELEVENLABS_API_KEY`를 설정합니다. 스크립트는 키를 출력하지 않습니다.
- 코드는 MIT이고, 음성 결과물의 이용 조건은 고른 음성 서비스를 따릅니다.

## 한국어에 대해

한국어 가이드에 쓸 수 있는 것은 이렇습니다.

- 화면 표기와 낭독 표기를 나누는 발음 사전(`pronunciation.json`)
- 합니다체 내레이션 규칙(`references/narration.md`)
- Edge 한국어 음성 기본값(`ko-KR-SunHiNeural`)
- 한글 폰트를 지정하면 화면에 쓰인 글자만 잘라 넣는 폰트 서브셋

샘플 가이드는 ElevenLabs 음성(한국어 Anna Kim, 영어 Max, `eleven_v3`)으로 낭독했습니다. 키 없이 쓰는 Edge 한국어 음성으로도 같은 가이드를 만들 수 있고, 음성은 `guide.json`의 `tts`에서 바꿉니다.

## 라이선스

MIT. [LICENSE](LICENSE)를 보세요.
