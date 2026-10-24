import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import GUIDE from '@guide';
import { FrameProvider, type VideoConfig } from 'guide-runtime';
import { parseCaptions } from '../src/lib/captions';

/**
 * The guide player.
 *
 * Layout: the stage on the left, a step panel with the live transcript on the right (below on narrow
 * screens). Under the stage, a progress bar split into one segment per step.
 *
 * Clock: the audio position. Picture and sound cannot drift apart; only the silence after the
 * narration ends is counted by a wall clock. A guide without audio runs on the wall clock.
 *
 * Step by step (follow-along): playback stops at the end of each step so the viewer can do it in
 * their own app, then continues on request. The choice is remembered per browser.
 *
 * URL options: `?ch=<step id>` start at a step · `?f=<frame>` hold that frame · `?still` stage only (frame checks, MP4 render)
 *   · `?still&cc` stage only with captions burned in
 * Render hook (`?still` only): `window.__seek(frame)` resolves once that frame is painted with its images decoded.
 * Keys: space/k play · ←/→ 5 s · n/p next/previous step · s step by step · c captions · f full screen · < > speed
 */
const { Scene, asset, fps: FPS, durationInFrames: DURATION, poster: POSTER } = GUIDE;
const W = 1920;
const H = 1080;
const CONFIG: VideoConfig = { fps: FPS, width: W, height: H, durationInFrames: DURATION, id: GUIDE.id };

const q = new URLSearchParams(window.location.search);
const STILL = q.has('still');
const STILL_CC = STILL && q.has('cc');

const RAW_STEPS = GUIDE.steps.length ? GUIDE.steps : [{ id: 'all', label: GUIDE.title, at: 0 }];
const STEPS = RAW_STEPS.map((s, i) => ({ ...s, end: i + 1 < RAW_STEPS.length ? RAW_STEPS[i + 1].at : DURATION }));
const stepAt = (f: number) => {
  let i = 0;
  for (let k = 0; k < STEPS.length; k++) if (f >= STEPS[k].at) i = k;
  return i;
};

// ---------- transcript model: words → sentences → steps ----------

interface Word {
  text: string;
  f: number;
  t: number;
}
interface Sentence {
  words: Word[];
  f: number;
  t: number;
}
const WORDS: Word[] = GUIDE.captions
  ? parseCaptions(GUIDE.captions).map((w) => ({ text: w.text, f: Math.floor((w.fromMs / 1000) * FPS), t: Math.ceil((w.toMs / 1000) * FPS) }))
  : [];
const BY_STEP: Sentence[][] = STEPS.map(() => []);
{
  let cur: Sentence | null = null;
  let curStep = -1;
  for (const w of WORDS) {
    const s = stepAt(w.f);
    if (!cur || s !== curStep) {
      cur = { words: [], f: w.f, t: w.t };
      BY_STEP[s].push(cur);
      curStep = s;
    }
    cur.words.push(w);
    cur.t = w.t;
    if (/[.!?。！？]$/.test(w.text)) cur = null;
  }
}
const SENTENCES = BY_STEP.flat();
const sentenceAt = (f: number): Sentence | null => {
  let hit: Sentence | null = null;
  for (const s of SENTENCES) if (s.f <= f) hit = s;
  return hit && f <= hit.t + FPS * 1.2 ? hit : null;
};

// ---------- small helpers ----------

const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* storage blocked: keep for this page only */
    }
  },
};

/** A host may inline the audio as a data: URL. Safari needs a Blob URL for seeking to work. */
const audioUrl = (p: string): string => {
  const src = asset(p);
  if (!src.startsWith('data:')) return src;
  try {
    const [head, b64] = src.split(',');
    const mime = head.slice(5).split(';')[0] || 'audio/mpeg';
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([buf], { type: mime }));
  } catch {
    return src;
  }
};

const preload = () =>
  Promise.all(
    GUIDE.preload.map(
      (p) =>
        new Promise<void>((res) => {
          const im = new Image();
          im.onload = () => (im.decode ? im.decode().then(() => res(), () => res()) : res());
          im.onerror = () => res();
          im.src = asset(p);
        }),
    ),
  );

const RATES = [0.75, 1, 1.25, 1.5, 2];
const savedRate = () => {
  const r = Number(store.get('guide-rate'));
  return RATES.includes(r) ? r : 1;
};

const clock = (f: number) => {
  const s = Math.max(0, Math.floor(f / FPS));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// ---------- pieces ----------

const Stage: React.FC<{ frame: number; box: { w: number; h: number } }> = ({ frame, box }) => {
  const s = Math.min(box.w / W, box.h / H) || 0;
  return (
    <div
      className="stage"
      style={{ left: (box.w - W * s) / 2, top: (box.h - H * s) / 2, width: W, height: H, transform: `scale(${s})`, background: GUIDE.stage }}
    >
      <FrameProvider frame={frame} config={CONFIG}>
        <Scene />
      </FrameProvider>
    </div>
  );
};

const I = {
  play: 'M8 5.5v13l11-6.5z',
  pause: 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z',
  sound: 'M4 9h4l5-4v14l-5-4H4zM16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12',
  mute: 'M4 9h4l5-4v14l-5-4H4zM16.5 9.5l5 5M21.5 9.5l-5 5',
  full: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
  cc: 'M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5zM10.5 10a2.2 2.2 0 1 0 0 4M17 10a2.2 2.2 0 1 0 0 4',
  steps: 'M5 6h2M5 12h2M5 18h2M10 6h9M10 12h9M10 18h9',
  next: 'M6 5.5v13l9-6.5zM16.5 5.5H19v13h-2.5z',
  replay: 'M12 5a7 7 0 1 1-6.6 4.7M5 4v5h5',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  check: 'M5 12.5l4.5 4.5L19 7.5',
};
const Icon: React.FC<{ d: string; size?: number; stroke?: boolean }> = ({ d, size = 20, stroke }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
    {stroke ? (
      <path d={d} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <path d={d} fill="currentColor" />
    )}
  </svg>
);
const STROKE = new Set([I.cc, I.steps, I.replay, I.copy, I.check, I.full, I.sound, I.mute]);
const Ico: React.FC<{ d: string; size?: number }> = ({ d, size }) => <Icon d={d} size={size} stroke={STROKE.has(d)} />;

const CopyChip: React.FC<{ text: string }> = ({ text }) => {
  const [done, setDone] = useState(false);
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      /* clipboard blocked (sandboxed embed): the text stays selectable */
    }
  };
  return (
    <div className="copy">
      <code>{text}</code>
      <button onClick={copy} aria-label={done ? 'Copied' : 'Copy'} title={done ? 'Copied' : 'Copy'}>
        <Ico d={done ? I.check : I.copy} size={16} />
      </button>
    </div>
  );
};

// ---------- app ----------

const App: React.FC = () => {
  const ch = STEPS.find((t) => t.id === q.get('ch'));
  const fixed = q.get('f');
  const [frame, setFrame] = useState(fixed ? Number(fixed) : ch ? ch.at : POSTER);
  const startAt = ch ? ch.at : 0;
  const [playing, setPlaying] = useState(false);
  /** `?f=` holds a frame as if playback had reached it (for review screenshots and deep links) */
  const [started, setStarted] = useState(fixed !== null);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(savedRate);
  const [follow, setFollow] = useState(() => store.get('guide-follow') === '1');
  const [cc, setCc] = useState(() => store.get('guide-cc') === '1');
  const [isFull, setIsFull] = useState(false);
  const [waiting, setWaiting] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const rateRef = useRef(rate);
  const followRef = useRef(follow);
  followRef.current = follow;
  const playerRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLOListElement>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const tail = useRef<{ from: number; at: number } | null>(null);
  const frameRef = useRef(frame);
  frameRef.current = frame;

  useEffect(() => {
    let a: HTMLAudioElement | null = null;
    if (GUIDE.audio) {
      a = new window.Audio();
      a.preload = 'auto';
      a.src = audioUrl(GUIDE.audio);
      a.playbackRate = rateRef.current;
      audio.current = a;
    }
    Promise.all([preload(), document.fonts ? document.fonts.ready : Promise.resolve()]).then(() => {
      setReady(true);
      (window as unknown as { __READY__: boolean }).__READY__ = true;
    });
    return () => a?.pause();
  }, []);

  useEffect(() => {
    if (!STILL) return;
    const w = window as unknown as Record<string, unknown>;
    w.__META__ = { fps: FPS, durationInFrames: DURATION, audio: GUIDE.audio ?? null, lang: document.documentElement.lang };
    w.__SUBS__ = SENTENCES.map((x) => ({ text: x.words.map((y) => y.text).join(' '), f: x.f, t: x.t }));
    w.__seek = async (n: number) => {
      flushSync(() => setFrame(n));
      // A missing image must not hang the render: settle on load, error or after 10 s, and report it.
      const settle = (img: HTMLImageElement) =>
        new Promise<void>((done) => {
          if (img.complete) {
            if (!img.naturalWidth) console.error(`[guide] image failed: ${img.src}`);
            img.decode().catch(() => undefined).then(() => done());
            return;
          }
          const t = setTimeout(() => (console.error(`[guide] image timed out: ${img.src}`), done()), 10000);
          img.addEventListener('load', () => (clearTimeout(t), done()), { once: true });
          img.addEventListener('error', () => (clearTimeout(t), console.error(`[guide] image failed: ${img.src}`), done()), { once: true });
        });
      await Promise.all(Array.from(document.images, settle));
      await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    };
  }, []);

  useLayoutEffect(() => {
    const el = screenRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const audioEnd = () => {
    const a = audio.current;
    if (!a) return 0;
    return Number.isFinite(a.duration) ? a.duration : DURATION / FPS;
  };

  const pause = useCallback(() => {
    audio.current?.pause();
    tail.current = null;
    setPlaying(false);
  }, []);

  const playFrom = useCallback((f: number) => {
    const a = audio.current;
    const at = f >= DURATION - 1 ? 0 : Math.max(0, f);
    setWaiting(null);
    setFrame(at);
    setStarted(true);
    setPlaying(true);
    const t = at / FPS;
    if (a && t < audioEnd() - 0.05) {
      tail.current = null;
      a.currentTime = t;
      a.play().catch(() => setPlaying(false));
    } else {
      a?.pause();
      tail.current = { from: at, at: performance.now() };
    }
  }, []);

  const seek = useCallback(
    (f: number, andPlay = false) => {
      const at = Math.max(0, Math.min(DURATION - 1, Math.round(f)));
      setStarted(true);
      setWaiting(null);
      if (playing || andPlay) playFrom(at);
      else {
        setFrame(at);
        if (audio.current) audio.current.currentTime = Math.min(at / FPS, audioEnd());
      }
    },
    [playing, playFrom],
  );

  const toggle = useCallback(() => {
    if (playing) pause();
    else if (waiting !== null) playFrom(STEPS[waiting].at);
    else playFrom(started ? frameRef.current : startAt);
  }, [playing, waiting, started, startAt, pause, playFrom]);

  // Clock: audio position → frame. After the narration ends, the wall clock counts the silence
  useEffect(() => {
    if (!playing) return;
    let id = 0;
    const tick = () => {
      const a = audio.current;
      let f: number;
      if (tail.current) f = tail.current.from + ((performance.now() - tail.current.at) / 1000) * FPS * rateRef.current;
      else if (a && a.ended) {
        tail.current = { from: Math.round(audioEnd() * FPS), at: performance.now() };
        f = tail.current.from;
      } else f = (a?.currentTime ?? 0) * FPS;
      let n = Math.floor(f);
      // step by step: stop on the last frame of a step
      if (followRef.current) {
        const i = stepAt(frameRef.current);
        if (i + 1 < STEPS.length && n >= STEPS[i + 1].at) {
          n = STEPS[i + 1].at - 1;
          setFrame(n);
          pause();
          setWaiting(i + 1);
          return;
        }
      }
      if (n >= DURATION - 1) {
        setFrame(DURATION - 1);
        pause();
        return;
      }
      if (n !== frameRef.current) setFrame(n);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing, pause]);

  useEffect(() => {
    const on = () => document.hidden && pause();
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, [pause]);

  useEffect(() => {
    if (audio.current) audio.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    rateRef.current = rate;
    const a = audio.current;
    if (a) {
      a.playbackRate = rate;
      a.preservesPitch = true;
    }
    if (tail.current) tail.current = { from: frameRef.current, at: performance.now() };
    store.set('guide-rate', String(rate));
  }, [rate]);
  useEffect(() => store.set('guide-follow', follow ? '1' : '0'), [follow]);
  useEffect(() => store.set('guide-cc', cc ? '1' : '0'), [cc]);

  useEffect(() => {
    const on = () => setIsFull(document.fullscreenElement === playerRef.current);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const fullscreen = useCallback(() => {
    const el = playerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.().catch(() => undefined);
  }, []);

  const cur = stepAt(frame);
  const goStep = useCallback((i: number) => seek(STEPS[Math.max(0, Math.min(STEPS.length - 1, i))].at, true), [seek]);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (k === ' ' || k === 'k') {
        e.preventDefault();
        toggle();
      } else if (k === 'ArrowRight') seek(frameRef.current + 5 * FPS);
      else if (k === 'ArrowLeft') seek(frameRef.current - 5 * FPS);
      else if (k === 'n') goStep(stepAt(frameRef.current) + 1);
      else if (k === 'p') goStep(stepAt(frameRef.current) - (frameRef.current - STEPS[stepAt(frameRef.current)].at > FPS * 2 ? 0 : 1));
      else if (k === 's') setFollow((v) => !v);
      else if (k === 'c') setCc((v) => !v);
      else if (k === 'f') fullscreen();
      else if (k === '>') setRate((r) => RATES[Math.min(RATES.length - 1, RATES.indexOf(r) + 1)]);
      else if (k === '<') setRate((r) => RATES[Math.max(0, RATES.indexOf(r) - 1)]);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [toggle, seek, goStep, fullscreen]);

  // keep the active sentence in view inside the panel (never scrolls the page)
  const active = sentenceAt(frame);
  const activeKey = active ? `${active.f}` : `step-${cur}`;
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !started) return;
    const el = panel.querySelector<HTMLElement>(`[data-k="${activeKey}"]`);
    if (!el) return;
    const top = el.offsetTop - panel.offsetTop;
    if (top < panel.scrollTop + 24 || top > panel.scrollTop + panel.clientHeight - 80) {
      panel.scrollTo({ top: Math.max(0, top - panel.clientHeight / 3), behavior: 'smooth' });
    }
  }, [activeKey, started]);

  // progress bar: pointer seeks, drag scrubs
  const barRef = useRef<HTMLDivElement>(null);
  const barSeek = (e: React.PointerEvent) => {
    const r = barRef.current?.getBoundingClientRect();
    if (!r) return;
    seek(((e.clientX - r.left) / r.width) * DURATION);
  };

  const shown = started ? frame : startAt;
  const wordState = (w: Word) => (w.f > shown ? 'w' : w.t >= shown ? 'w now' : 'w said');

  const stageView = useMemo(() => (box.w > 0 ? <Stage frame={frame} box={box} /> : null), [frame, box]);

  if (STILL) {
    return (
      <div ref={screenRef} className="still" style={{ position: 'fixed', inset: 0, background: GUIDE.stage }}>
        {stageView}
        {STILL_CC && active && (
          <div className="cap">
            <span>{active.words.map((w) => w.text).join(' ')}</span>
          </div>
        )}
      </div>
    );
  }

  const step = STEPS[cur];
  return (
    <div className="page">
      <header className="head">
        <h1>{GUIDE.title}</h1>
        <span>{GUIDE.subtitle}</span>
      </header>
      <div className="layout">
        <div className={`player${isFull ? ' full' : ''}`} ref={playerRef}>
          <div ref={screenRef} className="screen" onClick={toggle} role="button" aria-label={playing ? 'Pause' : 'Play'}>
            {stageView}
            {started && (
              <div className="tag">
                <b>{cur + 1}</b>
                <span>/ {STEPS.length}</span>
                {step.label}
              </div>
            )}
            {(cc || isFull) && active && started && (
              <div className="cap">
                <span>{active.words.map((w) => w.text).join(' ')}</span>
              </div>
            )}
            {!started && (
              <div className="cover">
                <button className="big" aria-label="Play" onClick={(e) => (e.stopPropagation(), toggle())}>
                  {ready ? <Ico d={I.play} size={44} /> : '…'}
                </button>
                <div className="cover-meta">
                  {STEPS.length} steps · {clock(DURATION)}
                </div>
              </div>
            )}
            {waiting !== null && (
              <div className="wait" onClick={(e) => e.stopPropagation()}>
                <div className="wait-card">
                  <div className="wait-kicker">Step {waiting} done</div>
                  <div className="wait-title">Try it in your app, then continue.</div>
                  <div className="wait-actions">
                    <button className="primary" onClick={() => playFrom(STEPS[waiting].at)} autoFocus>
                      <Ico d={I.next} size={18} /> Step {waiting + 1}: {STEPS[waiting].label}
                    </button>
                    <button onClick={() => playFrom(STEPS[waiting - 1].at)}>
                      <Ico d={I.replay} size={18} /> Replay
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="controls">
            <div
              className="bar"
              ref={barRef}
              role="slider"
              tabIndex={0}
              aria-label="Position"
              aria-valuemin={0}
              aria-valuemax={DURATION - 1}
              aria-valuenow={shown}
              aria-valuetext={`${clock(shown)}, step ${cur + 1} of ${STEPS.length}`}
              onPointerDown={(e) => {
                (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                barSeek(e);
              }}
              onPointerMove={(e) => e.buttons === 1 && barSeek(e)}
            >
              {STEPS.map((s, i) => (
                <div key={s.id} className={`seg${i === cur ? ' on' : ''}`} style={{ flexGrow: s.end - s.at }} title={`${i + 1}. ${s.label}`}>
                  <div className="fill" style={{ width: `${Math.max(0, Math.min(1, (shown - s.at) / (s.end - s.at))) * 100}%` }} />
                </div>
              ))}
            </div>
            <div className="row">
              <button className="btn play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} title="Play/pause (space)">
                <Ico d={playing ? I.pause : I.play} />
              </button>
              <span className="time">
                {clock(shown)} <i>/ {clock(DURATION)}</i>
              </span>
              <span className="grow" />
              <button
                className={`btn pill${follow ? ' on' : ''}`}
                aria-pressed={follow}
                onClick={() => setFollow((v) => !v)}
                title="Stop after each step so you can do it yourself (s)"
              >
                <Ico d={I.steps} size={18} /> Step by step
              </button>
              {GUIDE.captions && (
                <button className={`btn${cc ? ' on' : ''}`} aria-pressed={cc} onClick={() => setCc((v) => !v)} aria-label="Captions" title="Captions on the stage (c)">
                  <Ico d={I.cc} />
                </button>
              )}
              {GUIDE.audio && (
                <button className="btn" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute' : 'Mute'}>
                  <Ico d={muted ? I.mute : I.sound} />
                </button>
              )}
              <select className="rate" value={rate} onChange={(e) => setRate(Number(e.target.value))} aria-label="Speed" title="Speed (< >)">
                {RATES.map((r) => (
                  <option key={r} value={r}>
                    {r}×
                  </option>
                ))}
              </select>
              <button className="btn" onClick={fullscreen} aria-label="Full screen" title="Full screen (f)">
                <Ico d={I.full} />
              </button>
            </div>
          </div>
        </div>
        <aside className="panel" aria-label="Steps">
          <ol ref={panelRef}>
            {STEPS.map((s, i) => (
              <li key={s.id} className={`step ${i < cur ? 'done' : i === cur ? 'now' : 'next'}`}>
                <button className="step-head" data-k={`step-${i}`} onClick={() => goStep(i)}>
                  <span className="num">{i + 1}</span>
                  <span className="label">{s.label}</span>
                  <span className="dur">{clock(s.end - s.at)}</span>
                </button>
                {BY_STEP[i].length > 0 && (
                  <div className="lines">
                    {BY_STEP[i].map((sen) => (
                      <p key={sen.f} data-k={sen.f} className={active === sen ? 'line on' : 'line'} onClick={() => seek(sen.f, true)}>
                        {sen.words.map((w, j) => (
                          <span key={j} className={wordState(w)}>
                            {w.text}{' '}
                          </span>
                        ))}
                      </p>
                    ))}
                  </div>
                )}
                {s.copy && s.copy.length > 0 && (
                  <div className="copies">
                    {s.copy.map((c) => (
                      <CopyChip key={c} text={c} />
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </aside>
      </div>
      {GUIDE.note && <p className="note">{GUIDE.note}</p>}
      <p className="keys">
        <kbd>space</kbd> play · <kbd>n</kbd>/<kbd>p</kbd> step · <kbd>s</kbd> step by step · <kbd>c</kbd> captions · <kbd>f</kbd> full screen
      </p>
    </div>
  );
};

createRoot(document.getElementById('root') as HTMLElement).render(<App />);
