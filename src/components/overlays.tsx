import { createContext, useContext, type ReactNode } from 'react';
import { Easing, spring, useGuideFrame, useVideoConfig } from 'guide-runtime';
import { bodyFontFamily } from '../theme/fonts';

/**
 * Guide overlays: a captured screen and the marks a guide puts on it.
 *
 * Every mark takes guide frames (from `cue()`), so it works the same at any depth of <Sequence>.
 * Every mark lives inside a <Screen> and is positioned in the screenshot's CSS pixels, the same
 * numbers `scripts/capture.mjs` writes to `<shot>.boxes.json`.
 *
 * Marks:
 *   Spotlight  dim everything except one box
 *   Pin        a numbered marker that matches a step number in the player's panel
 *   Magnifier  an inset that shows one box enlarged, without moving the camera
 *   Cursor     a pointer that travels between points and clicks
 *   Callout    a short label next to a box
 *   TypeIn     text typed into a field, with a caret
 *   Redact     blur or block out part of the capture
 * Screen itself can swap captures over time (`shots`) and push in on a box (`camera`).
 */

export type Box = [number, number, number, number];
export type Pt = [number, number];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = Easing.bezier(0.33, 0, 0.2, 1);
/** 0 → 1 → 0 over [from, to) with `len`-frame ramps */
const window01 = (f: number, from: number, to: number, len = 8) => Math.min(clamp01((f - from) / len), clamp01((to - f) / len));

export const mid = (b: Box): Pt => [b[0] + b[2] / 2, b[1] + b[3] / 2];
export const pad = (b: Box, p: number): Box => [b[0] - p, b[1] - p, b[2] + p * 2, b[3] + p * 2];

const ScreenCtx = createContext<{ src: string; w: number; h: number }>({ src: '', w: 1440, h: 810 });

const BRAND = 'var(--guide-brand, #2563eb)';

/** One camera key: from frame `at`, move over `len` frames to frame `box` at `zoom` (no box = whole screen) */
export interface CameraKey {
  at: number;
  box?: Box;
  zoom?: number;
  len?: number;
}

interface Cam {
  z: number;
  cx: number;
  cy: number;
}

const camAt = (keys: CameraKey[], f: number, w: number, h: number): Cam => {
  const FULL: Cam = { z: 1, cx: w / 2, cy: h / 2 };
  const mix = (a: Cam, b: Cam, p: number): Cam => ({ z: a.z + (b.z - a.z) * p, cx: a.cx + (b.cx - a.cx) * p, cy: a.cy + (b.cy - a.cy) * p });
  let from = FULL;
  let to = FULL;
  let start = -1e9;
  let len = 1;
  for (const k of keys) {
    if (k.at > f) break;
    from = mix(from, to, ease(clamp01((k.at - start) / len)));
    if (k.box) {
      // fit the box with some room, never below 1x
      const z = k.zoom ?? Math.max(1, Math.min(3, Math.min(w / (k.box[2] * 1.5), h / (k.box[3] * 1.5))));
      to = { z, cx: k.box[0] + k.box[2] / 2, cy: k.box[1] + k.box[3] / 2 };
    } else to = FULL;
    start = k.at;
    len = k.len ?? 20;
  }
  const c = mix(from, to, ease(clamp01((f - start) / len)));
  // keep the view inside the screenshot
  const hw = w / (2 * c.z);
  const hh = h / (2 * c.z);
  return { z: c.z, cx: Math.min(w - hw, Math.max(hw, c.cx)), cy: Math.min(h - hh, Math.max(hh, c.cy)) };
};

/**
 * A captured screen placed on the 1920x1080 stage. Children are positioned in screenshot pixels.
 * `src` is the 2x capture; `size` is its CSS size (half the image's pixel size).
 * `shots` swaps captures over time (crossfade, or a cut with `cut: true`); `camera` pushes in on a box.
 */
export const Screen: React.FC<{
  src?: string;
  shots?: { at: number; src: string; cut?: boolean }[];
  size: [number, number];
  camera?: CameraKey[];
  /** Stage rectangle. Defaults to centered, 1680 wide */
  x?: number;
  y?: number;
  width?: number;
  /** Small address pill above the screen */
  url?: string;
  children?: ReactNode;
}> = ({ src, shots, size, camera, x, y, width = 1680, url, children }) => {
  const f = useGuideFrame();
  const [w, h] = size;
  const s = width / w;
  const height = h * s;
  const left = x ?? (1920 - width) / 2;
  const top = y ?? (1080 - height) / 2 + (url ? 18 : 0);
  const list = shots ?? (src ? [{ at: -1e9, src }] : []);
  let ci = 0;
  for (let i = 0; i < list.length; i++) if (list[i].at <= f) ci = i;
  const curShot = list[ci];
  const prevShot = ci > 0 ? list[ci - 1] : undefined;
  const fadeIn = curShot && prevShot && !curShot.cut ? clamp01((f - curShot.at) / 8) : 1;
  const cam = camera ? camAt(camera, f, w, h) : { z: 1, cx: w / 2, cy: h / 2 };
  const view = `scale(${s}) translate(${w / 2}px, ${h / 2}px) scale(${cam.z}) translate(${-cam.cx}px, ${-cam.cy}px)`;
  const img = (p: string, o: number) => (
    <img key={p} src={p} alt="" decoding="sync" style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, opacity: o }} />
  );
  return (
    <ScreenCtx.Provider value={{ src: curShot?.src ?? '', w, h }}>
      {url && (
        <div
          style={{
            position: 'absolute',
            left,
            top: top - 50,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 16px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.75)',
            fontFamily: bodyFontFamily,
            fontSize: 20,
            letterSpacing: 0.2,
          }}
        >
          <span style={{ width: 9, height: 9, borderRadius: 9, background: '#22c55e' }} />
          {url}
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          left,
          top,
          width,
          height,
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 30px 80px rgba(0,0,0,0.45)',
        }}
      >
        <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: view, transformOrigin: '0 0' }}>
          {prevShot && fadeIn < 1 && img(prevShot.src, 1)}
          {curShot && img(curShot.src, fadeIn)}
          {children}
        </div>
      </div>
    </ScreenCtx.Provider>
  );
};

/** Dims the screen outside `box`. The lit area keeps a thin brand outline. */
export const Spotlight: React.FC<{ box: Box; from: number; to: number; padding?: number; radius?: number; dim?: number }> = ({
  box,
  from,
  to,
  padding = 8,
  radius = 12,
  dim = 0.62,
}) => {
  const f = useGuideFrame();
  const o = ease(window01(f, from, to, 10));
  if (o <= 0) return null;
  const [x, y, w, h] = pad(box, padding);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: radius,
        boxShadow: `0 0 0 4000px rgba(6, 9, 16, ${dim * o}), 0 0 0 2px color-mix(in srgb, ${BRAND} ${Math.round(o * 100)}%, transparent)`,
        pointerEvents: 'none',
      }}
    />
  );
};

/** A numbered marker. Use the same number as the step in the player panel. */
export const Pin: React.FC<{ at: Pt; n: number | string; from: number; to: number; size?: number }> = ({ at, n, from, to, size = 34 }) => {
  const f = useGuideFrame();
  const { fps } = useVideoConfig();
  const out = clamp01((to - f) / 6);
  if (f < from || out <= 0) return null;
  const pop = spring({ frame: f - from, fps, config: { damping: 12, stiffness: 180 } });
  const ring = clamp01((f - from) / 24);
  return (
    <div style={{ position: 'absolute', left: at[0] - size / 2, top: at[1] - size / 2, width: size, height: size, opacity: out, pointerEvents: 'none' }}>
      {ring < 1 && (
        <div
          style={{
            position: 'absolute',
            inset: -size * 0.6 * ring,
            borderRadius: '50%',
            border: `2px solid ${BRAND}`,
            opacity: 1 - ring,
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: BRAND,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: bodyFontFamily,
          fontWeight: 800,
          fontSize: size * 0.5,
          transform: `scale(${pop})`,
          boxShadow: '0 4px 14px rgba(0,0,0,0.35), 0 0 0 3px #fff',
        }}
      >
        {n}
      </div>
    </div>
  );
};

/**
 * Shows `box` enlarged in an inset, so the viewer reads a small control without losing the whole
 * screen. The inset goes to the quadrant opposite the box unless `at` (top-left, screen pixels) is given.
 */
export const Magnifier: React.FC<{ box: Box; from: number; to: number; zoom?: number; at?: Pt; label?: string }> = ({
  box,
  from,
  to,
  zoom = 3,
  at,
  label,
}) => {
  const f = useGuideFrame();
  const { fps } = useVideoConfig();
  const { src, w, h } = useContext(ScreenCtx);
  const out = clamp01((to - f) / 8);
  if (f < from || out <= 0) return null;
  const grow = spring({ frame: f - from, fps, config: { damping: 18, stiffness: 160 } });
  const lw = box[2] * zoom;
  const lh = box[3] * zoom;
  const [cx, cy] = mid(box);
  const margin = 36;
  const pos: Pt = at ?? [cx < w / 2 ? w - lw - margin : margin, cy < h / 2 ? h - lh - margin - (label ? 40 : 0) : margin];
  const [sx, sy] = [cx - (pos[0] + lw / 2), cy - (pos[1] + lh / 2)];
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: box[0] - 3,
          top: box[1] - 3,
          width: box[2] + 6,
          height: box[3] + 6,
          borderRadius: 8,
          border: `2px dashed ${BRAND}`,
          opacity: out,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: pos[0],
          top: pos[1],
          width: lw,
          height: lh,
          borderRadius: 16,
          overflow: 'hidden',
          background: '#fff',
          boxShadow: `0 0 0 4px #fff, 0 0 0 6px ${BRAND}, 0 24px 60px rgba(0,0,0,0.45)`,
          opacity: out,
          transform: `translate(${sx * (1 - grow)}px, ${sy * (1 - grow)}px) scale(${0.25 + 0.75 * grow})`,
          pointerEvents: 'none',
        }}
      >
        <img
          src={src}
          alt=""
          decoding="sync"
          style={{ position: 'absolute', left: -box[0] * zoom, top: -box[1] * zoom, width: w * zoom, height: h * zoom, maxWidth: 'none' }}
        />
      </div>
      {label && (
        <div
          style={{
            position: 'absolute',
            // Centre the label under the lens, but pin it to the lens edge near a stage edge so it never clips.
            left: pos[0] + lw / 2 < 480 ? pos[0] : pos[0] + lw / 2,
            top: pos[1] + lh + 14,
            transform: pos[0] + lw / 2 < 480 ? undefined : 'translateX(-50%)',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            fontFamily: bodyFontFamily,
            fontSize: 22,
            fontWeight: 700,
            color: '#fff',
            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
            opacity: out * grow,
          }}
        >
          {label}
        </div>
      )}
    </>
  );
};

/** A pointer. Each key moves it to `p` by frame `at` (travel starts 16 frames earlier); `click` adds a ripple. */
export const Cursor: React.FC<{ keys: { at: number; p?: Pt; click?: boolean }[] }> = ({ keys }) => {
  const f = useGuideFrame();
  const MOVE = 16;
  let i = -1;
  for (let k = 0; k < keys.length; k++) if (keys[k].at <= f) i = k;
  const cur = i >= 0 ? keys[i] : undefined;
  const next = keys[i + 1];
  let p: Pt | undefined = cur?.p;
  let o = 1;
  if (!p) {
    if (!(next?.p && f > next.at - MOVE)) return null;
    p = next.p;
    o = clamp01((f - (next.at - MOVE)) / 8);
  } else if (next?.p && f > next.at - MOVE) {
    const t = ease(clamp01((f - (next.at - MOVE)) / MOVE));
    p = [p[0] + (next.p[0] - p[0]) * t, p[1] + (next.p[1] - p[1]) * t];
  } else if (next && !next.p) {
    o = 1 - clamp01((f - next.at) / 6);
  }
  const since = cur?.click ? f - cur.at : -1;
  const press = since >= 0 && since < 6 ? 0.86 : 1;
  const ripple = since >= 0 && since < 18 ? since / 18 : null;
  return (
    <>
      {ripple !== null && (
        <div
          style={{
            position: 'absolute',
            left: p[0] - 30 * ripple,
            top: p[1] - 30 * ripple,
            width: 60 * ripple,
            height: 60 * ripple,
            borderRadius: '50%',
            background: `color-mix(in srgb, ${BRAND} 35%, transparent)`,
            opacity: 1 - ripple,
            pointerEvents: 'none',
          }}
        />
      )}
      <svg
        width={22}
        height={30}
        viewBox="0 0 22 30"
        style={{
          position: 'absolute',
          left: p[0] - 2,
          top: p[1] - 2,
          opacity: o,
          transform: `scale(${press})`,
          transformOrigin: '2px 2px',
          filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.45))',
          pointerEvents: 'none',
        }}
      >
        <path d="M2 2 L2 24 L8 18.5 L12 27.5 L15.5 26 L11.5 17 L19.5 17 Z" fill="#fff" stroke="#111" strokeWidth={1.6} strokeLinejoin="round" />
      </svg>
    </>
  );
};

/**
 * Types `text` into an input field drawn over `box`, at `cps` characters per second, with a caret.
 * `secret` shows dots. `tone` matches the field: light fields get dark text and the reverse.
 */
export const TypeIn: React.FC<{
  box: Box;
  text: string;
  from: number;
  to?: number;
  cps?: number;
  secret?: boolean;
  tone?: 'light' | 'dark';
  fontSize?: number;
  mono?: boolean;
}> = ({ box, text, from, to = Infinity, cps = 14, secret, tone = 'light', fontSize = 15, mono }) => {
  const f = useGuideFrame();
  const { fps } = useVideoConfig();
  if (f < from || f >= to) return null;
  const n = Math.min(text.length, Math.floor(((f - from) / fps) * cps));
  const typing = n < text.length;
  const caretOn = typing || Math.floor((f - from) / (fps / 2)) % 2 === 0;
  const shown = secret ? '•'.repeat(n) : text.slice(0, n);
  const light = tone === 'light';
  return (
    <div
      style={{
        position: 'absolute',
        left: box[0],
        top: box[1],
        width: box[2],
        height: box[3],
        borderRadius: 6,
        background: light ? '#ffffff' : '#25262b',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        overflow: 'hidden',
        whiteSpace: 'pre',
        fontFamily: mono ? 'var(--font-code, ui-monospace, Menlo, monospace)' : bodyFontFamily,
        fontSize,
        letterSpacing: secret ? 2 : 0,
        color: light ? '#111' : '#f1f1f1',
        boxShadow: `0 0 0 2px ${BRAND}`,
        pointerEvents: 'none',
      }}
    >
      {shown}
      <span style={{ width: 2, height: fontSize * 1.2, marginLeft: 1, background: light ? '#111' : '#f1f1f1', opacity: caretOn ? 1 : 0 }} />
    </div>
  );
};

/**
 * Hides part of a capture: a blur or a solid block. For anything that must not be readable in a
 * published guide. Captures should already hold demo data only; this is the second line, not the first.
 */
export const Redact: React.FC<{ box: Box; from?: number; to?: number; mode?: 'blur' | 'block'; label?: string }> = ({
  box,
  from = -1e9,
  to = Infinity,
  mode = 'blur',
  label,
}) => {
  const f = useGuideFrame();
  if (f < from || f >= to) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: box[0],
        top: box[1],
        width: box[2],
        height: box[3],
        borderRadius: 6,
        ...(mode === 'blur'
          ? { backdropFilter: 'blur(9px) saturate(0.6)', WebkitBackdropFilter: 'blur(9px) saturate(0.6)', background: 'rgba(128,128,128,0.12)' }
          : { background: '#2a2d35' }),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.85)',
        fontFamily: bodyFontFamily,
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: 0.5,
        pointerEvents: 'none',
      }}
    >
      {label}
    </div>
  );
};

/** A short label attached to a box, below it by default. */
export const Callout: React.FC<{ box: Box; text: string; from: number; to: number; side?: 'below' | 'above' | 'left' | 'right' }> = ({
  box,
  text,
  from,
  to,
  side = 'below',
}) => {
  const f = useGuideFrame();
  const o = ease(window01(f, from, to, 8));
  if (o <= 0) return null;
  const gap = 14;
  const [cx, cy] = mid(box);
  const style: React.CSSProperties =
    side === 'below'
      ? { left: cx, top: box[1] + box[3] + gap, transform: `translate(-50%, ${(1 - o) * -8}px)` }
      : side === 'above'
        ? { left: cx, top: box[1] - gap, transform: `translate(-50%, calc(-100% + ${(1 - o) * 8}px))` }
        : side === 'right'
          ? { left: box[0] + box[2] + gap, top: cy, transform: `translate(${(1 - o) * -8}px, -50%)` }
          : { left: box[0] - gap, top: cy, transform: `translate(calc(-100% + ${(1 - o) * 8}px), -50%)` };
  return (
    <div
      style={{
        position: 'absolute',
        ...style,
        padding: '8px 14px',
        borderRadius: 10,
        background: BRAND,
        color: '#fff',
        fontFamily: bodyFontFamily,
        fontSize: 18,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        opacity: o,
        pointerEvents: 'none',
      }}
    >
      {text}
    </div>
  );
};
