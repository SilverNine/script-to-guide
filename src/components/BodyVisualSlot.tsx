/**
 * Keeps a scene's visuals out of the caption zone.
 *
 * Visuals render in the top 940px of a 1080px stage; captions own the bottom 140px.
 * Visuals use AbsoluteFill, so they fit the slot automatically.
 */
export const CAPTION_ZONE_HEIGHT = 140;

export const BodyVisualSlot: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: CAPTION_ZONE_HEIGHT,
      overflow: 'hidden',
    }}
  >
    {children}
  </div>
);
