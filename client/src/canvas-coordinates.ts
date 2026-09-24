/** SVG's default xMidYMid meet scales both axes equally, leaving letterboxing. */
export function screenDeltaToMap(
  dx: number, dy: number,
  viewWidth: number, viewHeight: number,
  screenWidth: number, screenHeight: number,
  zoom = 1, rotation = 0,
) {
  const ratio = Math.min(screenWidth / viewWidth, screenHeight / viewHeight) * zoom;
  if (!(ratio > 0)) return { x: 0, y: 0 };
  const angle = -rotation * Math.PI / 180;
  return {
    x: (dx * Math.cos(angle) - dy * Math.sin(angle)) / ratio,
    y: (dx * Math.sin(angle) + dy * Math.cos(angle)) / ratio,
  };
}
