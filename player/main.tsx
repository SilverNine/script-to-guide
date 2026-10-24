import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import GUIDE from '@guide';
import { FrameProvider, type VideoConfig } from 'guide-runtime';

/**
 * The guide player.
 *
 * The guide is swapped in at build time (`scripts/build-web.mjs --guide <name>` aliases `@guide` to
 * `guides/<name>/web.tsx`). Scene code is the same code a frame renderer would run; the runtime is
 * `runtime/index.tsx`.
 *
 * The clock is the audio position. Picture and sound cannot drift apart; only the silence after the
 * narration ends is counted by a wall clock. A guide without audio runs on the wall clock from frame 0.
 *
 * Speed changes the audio's playbackRate. The picture follows the audio position, so it speeds up with
 * it; the wall clock multiplies by the same rate. The chosen speed is remembered per browser
 * (localStorage; falls back to 1x when storage is unavailable).
 *
 * URL options: `?ch=<id>` start at a chapter · `?f=<frame>` hold that frame · `?still` stage only (for frame checks)
 */
const { Scene, asset, fps: FPS, durationInFrames: DURATION, toc: TOC, poster: POSTER } = GUIDE;

const W = 1920;
const H = 1080;
const CONFIG: VideoConfig = { fps: FPS, width: W, height: H, durationInFrames: DURATION, id: GUIDE.id };

const q = new URLSearchParams(window.location.search);
const STILL = q.has('still');

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

/** Speed steps. Each press moves to the next; after the last, back to 1x */
const RATES = [1, 1.25, 1.5, 1.75, 2];
const RATE_KEY = 'guide-player-rate';
const savedRate = () => {
  try {
    const r = Number(localStorage.getItem(RATE_KEY));
    return RATES.includes(r) ? r : 1;
  } catch {
    return 1;
  }
};

const clock = (f: number) => {
  const s = Math.max(0, Math.floor(f / FPS));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Scales the 1920x1080 stage to fit its box */
const Stage: React.FC<{ frame: number; box: { w: number; h: number } }> = ({ frame, box }) => {
  const s = Math.min(box.w / W, box.h / H) || 0;
  return (
    <div
      style={{
        position: 'absolute',
        left: (box.w - W * s) / 2,
        top: (box.h - H * s) / 2,
        width: W,
        height: H,
        transform: `scale(${s})`,
        transformOrigin: '0 0',
        overflow: 'hidden',
        background: GUIDE.stage,
      }}
    >
      <FrameProvider frame={frame} config={CONFIG}>
        <Scene />
      </FrameProvider>
    </div>
  );
};

const Icon: React.FC<{ d: string; size?: number }> = ({ d, size = 22 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
    <path d={d} fill="currentColor" />
  </svg>
);
const PLAY = 'M7 4.5v15l12.5-7.5z';
const PAUSE = 'M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z';
const SOUND = 'M4 9h4l5-4v14l-5-4H4zM16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12';
const MUTE = 'M4 9h4l5-4v14l-5-4H4zM16.5 9.5l5 5M21.5 9.5l-5 5';
const FULL = 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5';

const App: React.FC = () => {
  const ch = TOC.find((t) => t.id === q.get('ch'));
  const fixed = q.get('f');
  const [frame, setFrame] = useState(fixed ? Number(fixed) : ch ? ch.at : POSTER);
  const startAt = ch ? ch.at : 0;
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(savedRate);
  const rateRef = useRef(rate);
  const [ready, setReady] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const wrap = useRef<HTMLDivElement>(null);
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

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** Second where the narration ends. 0 without audio, so the wall clock runs from the start */
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
    const at = f >= DURATION - 1 ? 0 : f;
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
    (f: number) => {
      const at = Math.max(0, Math.min(DURATION - 1, Math.round(f)));
      if (playing) playFrom(at);
      else {
        setFrame(at);
        if (audio.current) audio.current.currentTime = Math.min(at / FPS, audioEnd());
      }
    },
    [playing, playFrom],
  );

  const toggle = useCallback(() => {
    if (playing) pause();
    else playFrom(started ? frameRef.current : startAt);
  }, [playing, started, startAt, pause, playFrom]);

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
      const n = Math.floor(f);
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

  // Pause when the tab is hidden
  useEffect(() => {
    const on = () => document.hidden && pause();
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, [pause]);

  useEffect(() => {
    if (audio.current) audio.current.muted = muted;
  }, [muted]);

  // Speed: applied to the audio; if the wall clock is running, restart it from the current frame
  useEffect(() => {
    rateRef.current = rate;
    const a = audio.current;
    if (a) {
      a.playbackRate = rate;
      a.preservesPitch = true;
    }
    if (tail.current) tail.current = { from: frameRef.current, at: performance.now() };
    try {
      localStorage.setItem(RATE_KEY, String(rate));
    } catch {
      /* storage blocked: keep the rate for this playback only */
    }
  }, [rate]);

  const stepRate = useCallback((d: number) => {
    setRate((r) => {
      const i = RATES.indexOf(r);
      if (d > 0) return RATES[(i + 1) % RATES.length];
      return RATES[Math.max(0, i - 1)];
    });
  }, []);

  // Space and k play/pause, arrows seek 5 s, < > change speed. Space works even when a button has focus
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === 'INPUT' && e.key !== ' ') return;
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        toggle();
      } else if (e.key === 'ArrowRight') seek(frameRef.current + 5 * FPS);
      else if (e.key === 'ArrowLeft') seek(frameRef.current - 5 * FPS);
      else if (e.key === '>') stepRate(1);
      else if (e.key === '<') stepRate(-1);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [toggle, seek, stepRate]);

  const fullscreen = () => {
    const el = wrap.current?.parentElement;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.().catch(() => undefined);
  };

  if (STILL) {
    return (
      <div ref={wrap} style={{ position: 'fixed', inset: 0, background: GUIDE.stage }}>
        {box.w > 0 && <Stage frame={frame} box={box} />}
      </div>
    );
  }

  let cur = TOC[0]?.id;
  for (const t of TOC) if (frame >= t.at) cur = t.id;

  return (
    <div className="page">
      <div className="head">
        <h1>{GUIDE.title}</h1>
        <span>{GUIDE.subtitle}</span>
      </div>
      <div className="player">
        <div ref={wrap} className="screen" onClick={toggle} role="button" aria-label={playing ? 'Pause' : 'Play'}>
          {box.w > 0 && <Stage frame={frame} box={box} />}
          {!started && (
            <div className="big">
              <span>{ready ? <Icon d={PLAY} size={56} /> : '…'}</span>
            </div>
          )}
        </div>
        <div className="bar">
          <button onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
            <Icon d={playing ? PAUSE : PLAY} />
          </button>
          <span className="time">
            {clock(started ? frame : startAt)} / {clock(DURATION)}
          </span>
          <input
            type="range"
            min={0}
            max={DURATION - 1}
            value={started ? frame : startAt}
            aria-label="Position"
            onChange={(e) => {
              setStarted(true);
              seek(Number(e.target.value));
            }}
          />
          {GUIDE.audio && (
            <button onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute' : 'Mute'}>
              <Icon d={muted ? MUTE : SOUND} />
            </button>
          )}
          <button className="rate" onClick={() => stepRate(1)} aria-label={`Speed ${rate}x, press to change`} title="Speed (< >)">
            {rate}x
          </button>
          <button onClick={fullscreen} aria-label="Full screen">
            <Icon d={FULL} />
          </button>
        </div>
      </div>
      <div className="toc">
        {TOC.map((t) => (
          <button key={t.id} className={cur === t.id ? 'on' : ''} onClick={() => playFrom(t.at)}>
            {t.label}
          </button>
        ))}
      </div>
      {GUIDE.note && <p className="note">{GUIDE.note}</p>}
    </div>
  );
};

createRoot(document.getElementById('root') as HTMLElement).render(<App />);
