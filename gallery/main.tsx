import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FrameProvider } from 'guide-runtime';
import { DEMOS, type Demo } from './demos';

/**
 * The gallery: every card's demo playing in a loop, rendered by the same runtime the player uses.
 * A tile plays only while it is on screen. `?id=<card>&f=<frame>` holds one tile's frame (screenshots).
 */
const REPO = 'https://github.com/SilverNine/script-to-guide';
const FPS = 30;
const HOLD = 24;
const q = new URLSearchParams(location.search);

const Tile: React.FC<{ demo: Demo }> = ({ demo }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [frame, setFrame] = useState(q.get('id') === demo.id && q.get('f') ? Number(q.get('f')) : Math.round(demo.frames * 0.45));
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const held = q.get('id') === demo.id && q.has('f');

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!visible || held || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let id = 0;
    const t0 = performance.now();
    const loop = demo.frames + HOLD;
    const tick = () => {
      const f = Math.floor(((performance.now() - t0) / 1000) * FPS) % loop;
      setFrame(Math.min(f, demo.frames - 1));
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [visible, held, demo.frames]);

  const s = w / 1920;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(demo.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <article className="tile" id={demo.id}>
      <div className="view" ref={ref}>
        {w > 0 && (
          <div className="stage" style={{ transform: `scale(${s})` }}>
            <FrameProvider frame={frame} config={{ fps: FPS, width: 1920, height: 1080, durationInFrames: demo.frames, id: demo.id }}>
              <demo.Demo />
            </FrameProvider>
          </div>
        )}
        <div className="prog" style={{ width: `${(frame / (demo.frames - 1)) * 100}%` }} />
      </div>
      <div className="meta">
        <div className="title">
          <h2>{demo.name}</h2>
          <span className={`group g-${demo.group}`}>{demo.group}</span>
        </div>
        <p>{demo.summary}</p>
        <div className="code">
          <pre>{demo.code}</pre>
          <button onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
        </div>
        <a href={`${REPO}/blob/main/cards/${demo.id}.md`}>Card: when to use it, parameters, pitfalls →</a>
      </div>
    </article>
  );
};

const GROUPS: { id: Demo['group'] | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'point', label: 'Point' },
  { id: 'focus', label: 'Focus' },
  { id: 'change', label: 'Change' },
  { id: 'card', label: 'Cards' },
];

const App: React.FC = () => {
  const [g, setG] = useState<(typeof GROUPS)[number]['id']>('all');
  const only = q.get('id');
  const list = DEMOS.filter((d) => (only ? d.id === only : g === 'all' || d.group === g));
  return (
    <div className="page">
      <header>
        <h1>script-to-guide gallery</h1>
        <p>
          Every motion a guide can use, playing live. Each one is a component; in a guide its frames come from <code>cue(scene, word)</code>, so it lands on a word of the narration.
          This page is rendered by the same runtime as the guide player. Nothing here is a video.
        </p>
        <nav>
          {GROUPS.map((x) => (
            <button key={x.id} className={g === x.id ? 'on' : ''} onClick={() => setG(x.id)}>
              {x.label}
            </button>
          ))}
          <a href={REPO}>GitHub</a>
        </nav>
      </header>
      <main className="grid">
        {list.map((d) => (
          <Tile key={d.id} demo={d} />
        ))}
      </main>
      <footer>Screens: mermandraw.com editor, captured with scripts/capture.mjs.</footer>
    </div>
  );
};

createRoot(document.getElementById('root') as HTMLElement).render(<App />);
(window as unknown as { __READY__: boolean }).__READY__ = true;
