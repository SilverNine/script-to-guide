import { createContext, useContext, type CSSProperties, type ImgHTMLAttributes, type ReactNode } from 'react';

/**
 * Frame runtime for guide scenes.
 *
 * Scenes are React components that read the current frame from context and derive everything
 * on screen from it. The player decides what the frame is: while narration plays, the frame is the
 * audio position; after the narration ends, a wall clock counts the remaining silence.
 *
 * The API shape follows the one Remotion made familiar (useCurrentFrame, Sequence, interpolate,
 * spring), so scenes written for a Remotion render run here unchanged. No Remotion code is included;
 * this file is the whole runtime. If a scene needs an API that is not here, add it here.
 */

export interface VideoConfig {
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  id: string;
}

const FrameCtx = createContext(0);
const ConfigCtx = createContext<VideoConfig>({ fps: 30, width: 1920, height: 1080, durationInFrames: 1, id: 'guide' });

export const FrameProvider: React.FC<{ frame: number; config: VideoConfig; children: ReactNode }> = ({ frame, config, children }) => (
  <ConfigCtx.Provider value={config}>
    <FrameCtx.Provider value={frame}>{children}</FrameCtx.Provider>
  </ConfigCtx.Provider>
);

export const useCurrentFrame = () => useContext(FrameCtx);
export const useVideoConfig = () => useContext(ConfigCtx);

const fill: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
};

export const AbsoluteFill: React.FC<{ style?: CSSProperties; className?: string; children?: ReactNode }> = ({ style, className, children }) => (
  <div className={className} style={{ ...fill, ...style }}>
    {children}
  </div>
);

/** Renders nothing outside its window; inside it, children see a frame counted from the window start. */
export const Sequence: React.FC<{ from?: number; durationInFrames?: number; name?: string; children?: ReactNode }> = ({
  from = 0,
  durationInFrames = Infinity,
  children,
}) => {
  const f = useCurrentFrame();
  if (f < from || f >= from + durationInFrames) return null;
  return (
    <FrameCtx.Provider value={f - from}>
      <AbsoluteFill>{children}</AbsoluteFill>
    </FrameCtx.Provider>
  );
};

export const Img: React.FC<ImgHTMLAttributes<HTMLImageElement>> = (props) => <img alt="" decoding="sync" {...props} />;

/** The player owns audio playback. A scene's <Audio> only marks where the narration belongs. */
export const Audio: React.FC<{ src: string }> = () => null;

export const staticFile = (p: string) => p;

// ---------- interpolation ----------

type Extrapolate = 'clamp' | 'extend' | 'identity';
interface InterpolateOptions {
  easing?: (t: number) => number;
  extrapolateLeft?: Extrapolate;
  extrapolateRight?: Extrapolate;
}

export const interpolate = (input: number, inRange: readonly number[], outRange: readonly number[], opts: InterpolateOptions = {}): number => {
  const { easing = (t: number) => t, extrapolateLeft = 'extend', extrapolateRight = 'extend' } = opts;
  if (inRange.length !== outRange.length || inRange.length < 2) throw new Error('interpolate: ranges must have the same length (at least 2)');
  let i = 1;
  while (i < inRange.length - 1 && input > inRange[i]) i++;
  const [a, b] = [inRange[i - 1], inRange[i]];
  const [c, d] = [outRange[i - 1], outRange[i]];
  let x = input;
  if (x < a) {
    if (extrapolateLeft === 'clamp') return c;
    if (extrapolateLeft === 'identity') return x;
  }
  if (x > b) {
    if (extrapolateRight === 'clamp') return d;
    if (extrapolateRight === 'identity') return x;
  }
  const t = b === a ? 0 : (x - a) / (b - a);
  x = easing(t);
  return c + (d - c) * x;
};

// ---------- easing ----------

const bezier = (x1: number, y1: number, x2: number, y2: number) => {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let k = 0; k < 8; k++) {
      const e = sx(t) - x;
      const d = dx(t);
      if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0;
    let hi = 1;
    for (let k = 0; k < 30 && Math.abs(sx(t) - x) > 1e-6; k++) {
      if (sx(t) < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return sy(t);
  };
};

export const Easing = {
  linear: (t: number) => t,
  ease: bezier(0.42, 0, 1, 1),
  quad: (t: number) => t * t,
  cubic: (t: number) => t * t * t,
  bezier,
  in: (e: (t: number) => number) => e,
  out: (e: (t: number) => number) => (t: number) => 1 - e(1 - t),
  inOut: (e: (t: number) => number) => (t: number) => (t < 0.5 ? e(t * 2) / 2 : 1 - e((1 - t) * 2) / 2),
};

// ---------- spring ----------

interface SpringConfig {
  damping: number;
  mass: number;
  stiffness: number;
  overshootClamping: boolean;
}

/**
 * Closed-form damped oscillator. Defaults (mass 1, damping 10, stiffness 100) match the
 * values scene authors are used to; the value at frame f is the position at f/fps seconds.
 */
export const spring = ({
  frame,
  fps,
  config = {},
  from = 0,
  to = 1,
  delay = 0,
}: {
  frame: number;
  fps: number;
  config?: Partial<SpringConfig>;
  from?: number;
  to?: number;
  delay?: number;
  durationInFrames?: number;
}): number => {
  const { damping = 10, mass = 1, stiffness = 100, overshootClamping = false } = config;
  const f = frame - delay;
  if (f <= 0) return from;
  const t = f / fps;
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const x0 = 1;
  let x: number;
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    x = Math.exp(-zeta * w0 * t) * (x0 * Math.cos(wd * t) + ((zeta * w0 * x0) / wd) * Math.sin(wd * t));
  } else if (zeta === 1) {
    x = Math.exp(-w0 * t) * (x0 + w0 * x0 * t);
  } else {
    const r1 = -w0 * (zeta - Math.sqrt(zeta * zeta - 1));
    const r2 = -w0 * (zeta + Math.sqrt(zeta * zeta - 1));
    const c2 = (-r1 * x0) / (r2 - r1);
    const c1 = x0 - c2;
    x = c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t);
  }
  let p = 1 - x;
  if (overshootClamping) p = Math.min(1, p);
  return from + (to - from) * p;
};
