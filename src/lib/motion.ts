/**
 * Shared easing and pulse primitives. Define them once here so tuning constants do not drift
 * between guides. New motion components import from here instead of declaring their own.
 */

/** Default deceleration. Most entrances and moves use this. */
export const easeOutCubic = (p: number) => 1 - (1 - p) ** 3;

/** Overshooting deceleration: passes the target slightly and settles, so a landing has life. */
export const easeOutBack = (p: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (p - 1) ** 3 + c1 * (p - 1) ** 2;
};

/**
 * Landing pulse: a 0 → amp → 0 curve starting at frame `t`. Add the result to a scale:
 * `transform: scale(${1 + pulse(frame, landFrame)})`. A negative amp contracts instead.
 */
export const pulse = (frame: number, t: number, dur = 10, amp = 0.07) =>
  frame >= t && frame <= t + dur ? amp * Math.sin(Math.PI * ((frame - t) / dur)) : 0;
