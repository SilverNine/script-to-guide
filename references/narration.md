# Narration

The voice is the guide. Write for the ear.

## Sentences

- One idea per sentence, 6 to 16 words. The voice reads a long sentence in one breath and the viewer loses it.
- Imperative for actions ("Open the Theme menu."), present tense for results ("The preview changes at once.").
- Say what to do before why. Name the control the way it is labelled on screen.
- No parentheses, no slashes, no abbreviations the voice has to guess. Write "for example", not "e.g.".
- Numbers: write them the way they should be read ("two minutes", "version 3.2").

## Pacing

- About 150 words per minute for English, 300 syllables per minute for Korean, with `gaps.json` adding silence where the viewer watches something happen.
- A demo scene needs its motions to finish before the next scene starts. If a cursor click lands on the last word, add 0.8 to 1.5 seconds in `gaps.json`.
- An intro under 10 seconds. State the outcome and the length; skip greetings.

## What the voice does not say

- Anything the screen does not show or the product does not do.
- Marketing words ("powerful", "seamless", "simply").
- Keyboard shortcuts without showing them on screen.

## Voices

`guide.json` `tts`: `{ "provider": "edge" | "elevenlabs" | "silent", "voice": "<id>", "model": "<id>" }`.

- edge: no key needed. `en-US-AriaNeural`, `en-US-GuyNeural`, `ko-KR-SunHiNeural`, `ko-KR-InJoonNeural`. `<skill>/.venv/bin/edge-tts --list-voices` lists the rest.
- elevenlabs: key from `ELEVENLABS_API_KEY`, or a `.env.elevenlabs` file in your project folder (add `.env*` to its `.gitignore`). The scripts never print it.
- silent: timing from text length, no audio. For CI and layout work.

## Korean

- 문장은 "~합니다"로 통일합니다. 번역투("~를 통해", "~에 대해")를 피합니다.
- 화면 버튼 이름은 화면 표기 그대로 씁니다. 영어 버튼이면 영어로 쓰고 발음은 사전에서 맞춥니다.
- Edge 한국어 음성은 영문 약어를 철자대로 읽는 경우가 많습니다. `pronunciation.json`에 한글 표기를 넣습니다.
