import { AbsoluteFill, interpolate, spring, useCurrentFrame, useGuideFrame, useVideoConfig } from 'guide-runtime';
import { bodyFontFamily } from '../theme/fonts';

/**
 * Full-stage cards: titles, chapter breaks, step lists and drawn dialogs.
 *
 * Entrances run on the block frame (useCurrentFrame), so a card animates in when its <Sequence>
 * starts. Anything tied to a word (`at` props) runs on the guide frame, like the overlays.
 */

type Tone = 'dark' | 'light';
const palette = (tone: Tone) =>
  tone === 'dark'
    ? { bg: '#0b0f17', fg: '#ffffff', dim: 'rgba(255,255,255,0.62)', faint: 'rgba(255,255,255,0.28)', panel: '#151b26', line: 'rgba(255,255,255,0.12)' }
    : { bg: '#f6f7f9', fg: '#14171c', dim: '#5b626d', faint: '#a3a9b2', panel: '#ffffff', line: '#e2e5ea' };
const BRAND = 'var(--guide-brand, #2563eb)';

/** Entrance style at block frame `frame` for an element that starts at `at`. A plain function, not a hook. */
const rise = (at: number, frame: number, fps: number) => {
  const p = spring({ frame: frame - at, fps, config: { damping: 22, stiffness: 160 } });
  return { opacity: p, transform: `translateY(${(1 - p) * 24}px)` };
};

/** Opening card: kicker, title, subtitle. */
export const TitleCard: React.FC<{ title: string; subtitle?: string; kicker?: string; tone?: Tone }> = ({ title, subtitle, kicker, tone = 'dark' }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = palette(tone);
  return (
    <AbsoluteFill style={{ background: c.bg, color: c.fg, fontFamily: bodyFontFamily, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 160px' }}>
      {kicker && (
        <div style={{ ...rise(0, f, fps), fontSize: 34, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color: BRAND, marginBottom: 28 }}>{kicker}</div>
      )}
      <div style={{ ...rise(6, f, fps), fontSize: 124, fontWeight: 900, letterSpacing: -4, lineHeight: 1.05 }}>{title}</div>
      {subtitle && <div style={{ ...rise(14, f, fps), fontSize: 44, fontWeight: 500, color: c.dim, marginTop: 30 }}>{subtitle}</div>}
    </AbsoluteFill>
  );
};

/** Chapter break: big number, title, one line under it, and the list of chapters with this one lit. */
export const ChapterCard: React.FC<{ n: number; title: string; sub?: string; all?: string[]; tone?: Tone }> = ({ n, title, sub, all, tone = 'dark' }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = palette(tone);
  const line = interpolate(f, [6, 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: c.bg, color: c.fg, fontFamily: bodyFontFamily, justifyContent: 'center', padding: '0 220px' }}>
      <div style={{ ...rise(0, f, fps), fontSize: 150, fontWeight: 900, color: BRAND, letterSpacing: -4, lineHeight: 1 }}>{String(n).padStart(2, '0')}</div>
      <div style={{ ...rise(5, f, fps), fontSize: 100, fontWeight: 900, letterSpacing: -3, marginTop: 10 }}>{title}</div>
      {sub && <div style={{ ...rise(10, f, fps), fontSize: 42, color: c.dim, marginTop: 14 }}>{sub}</div>}
      <div style={{ height: 3, width: `${line * 100}%`, background: c.line, margin: '64px 0 28px' }} />
      {all && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {all.map((t, i) => (
            <div
              key={t}
              style={{
                ...rise(12 + i * 2, f, fps),
                padding: '10px 18px',
                borderRadius: 12,
                border: `2px solid ${i + 1 === n ? BRAND : c.line}`,
                background: i + 1 === n ? 'color-mix(in srgb, var(--guide-brand, #2563eb) 14%, transparent)' : 'transparent',
                color: i + 1 === n ? c.fg : i + 1 < n ? c.dim : c.faint,
                fontSize: 24,
                fontWeight: i + 1 === n ? 800 : 600,
              }}
            >
              {String(i + 1).padStart(2, '0')} {t}
            </div>
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
};

/** A list that lights one item per cue. Items before their cue are dim, not hidden, so the list never jumps. */
export const StepList: React.FC<{ title?: string; items: string[]; at: number[]; tone?: Tone }> = ({ title, items, at, tone = 'dark' }) => {
  const g = useGuideFrame();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = palette(tone);
  return (
    <AbsoluteFill style={{ background: c.bg, color: c.fg, fontFamily: bodyFontFamily, justifyContent: 'center', padding: '0 260px' }}>
      {title && <div style={{ ...rise(0, f, fps), fontSize: 64, fontWeight: 900, letterSpacing: -2, marginBottom: 48 }}>{title}</div>}
      {items.map((t, i) => {
        const on = spring({ frame: g - (at[i] ?? 1e9), fps, config: { damping: 20, stiffness: 170 } });
        return (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 28, marginBottom: 26, opacity: 0.35 + 0.65 * on }}>
            <div
              style={{
                flex: 'none',
                width: 64,
                height: 64,
                borderRadius: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 30,
                fontWeight: 800,
                color: on > 0.5 ? '#fff' : c.dim,
                background: on > 0.5 ? BRAND : 'transparent',
                border: `3px solid ${on > 0.5 ? BRAND : c.faint}`,
                transform: `scale(${1 + 0.12 * Math.sin(Math.PI * Math.min(1, on))})`,
              }}
            >
              {i + 1}
            </div>
            <div style={{ fontSize: 48, fontWeight: 700, transform: `translateX(${(1 - on) * 12}px)` }}>{t}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/**
 * A drawn confirmation dialog, for screens that cannot be captured (OS prompts, permission sheets).
 * Neutral look on purpose: it should read as "a dialog", not imitate a specific OS. `pressAt` presses the primary button.
 */
export const Dialog: React.FC<{
  title: string;
  body?: string;
  primary: string;
  secondary?: string;
  from: number;
  pressAt?: number;
  tone?: Tone;
  backdrop?: React.ReactNode;
}> = ({ title, body, primary, secondary, from, pressAt, tone = 'light', backdrop }) => {
  const g = useGuideFrame();
  const { fps } = useVideoConfig();
  const c = palette(tone);
  const pop = spring({ frame: g - from, fps, config: { damping: 16, stiffness: 190 } });
  const pressed = pressAt !== undefined && g >= pressAt && g < pressAt + 6;
  const gone = pressAt !== undefined ? 1 - Math.min(1, Math.max(0, (g - pressAt - 8) / 8)) : 1;
  if (g < from) return <AbsoluteFill>{backdrop}</AbsoluteFill>;
  return (
    <AbsoluteFill style={{ fontFamily: bodyFontFamily }}>
      {backdrop}
      <AbsoluteFill style={{ background: `rgba(6,9,16,${0.45 * pop * gone})`, alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            width: 640,
            borderRadius: 22,
            background: c.panel,
            color: c.fg,
            padding: '40px 44px 32px',
            boxShadow: '0 30px 90px rgba(0,0,0,0.45)',
            transform: `scale(${0.92 + 0.08 * pop})`,
            opacity: pop * gone,
          }}
        >
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -0.5 }}>{title}</div>
          {body && <div style={{ fontSize: 26, color: c.dim, marginTop: 14, lineHeight: 1.45 }}>{body}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, marginTop: 34 }}>
            {secondary && (
              <div style={{ padding: '14px 26px', borderRadius: 12, border: `2px solid ${c.line}`, fontSize: 24, fontWeight: 700, color: c.dim }}>{secondary}</div>
            )}
            <div
              style={{
                padding: '14px 28px',
                borderRadius: 12,
                background: BRAND,
                color: '#fff',
                fontSize: 24,
                fontWeight: 800,
                transform: `scale(${pressed ? 0.94 : 1})`,
                boxShadow: pressed ? 'none' : '0 6px 18px rgba(37,99,235,0.35)',
              }}
            >
              {primary}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
