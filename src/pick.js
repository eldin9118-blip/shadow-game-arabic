// Hit-testing by colour.
//
// Each shadow is drawn into an offscreen buffer in its own flat colour, then
// one pixel is read back at the pointer. This resolves overlaps the way the
// player sees them (topmost wins) and works for any shape without needing
// point-in-path maths.

import { STAGE } from './level.js';
import { paintShape } from './shapes.js';

const PICK_W = 480;
const PICK_H = Math.round((PICK_W * STAGE.h) / STAGE.w);

export function createPicker() {
  const canvas = document.createElement('canvas');
  canvas.width = PICK_W;
  canvas.height = PICK_H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  function nearest(figures, point, radius) {
    let best = -1;
    let bestDistance = radius;
    figures.forEach((figure, i) => {
      const distance = Math.hypot(figure.x - point.x, figure.y - point.y);
      if (distance < bestDistance) {
        best = i;
        bestDistance = distance;
      }
    });
    return best;
  }

  function pick(figures, point) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, PICK_W, PICK_H);
    ctx.setTransform(PICK_W / STAGE.w, 0, 0, PICK_H / STAGE.h, 0, 0);
    figures.forEach((figure, i) => {
      paintShape(ctx, figure.shape, figure, { fill: `rgb(${i + 1},0,0)` });
    });

    const px = Math.round((point.x * PICK_W) / STAGE.w);
    const py = Math.round((point.y * PICK_H) / STAGE.h);
    if (px < 0 || py < 0 || px >= PICK_W || py >= PICK_H) return -1;

    const data = ctx.getImageData(px, py, 1, 1).data;
    if (data[0] > 0) return data[0] - 1;

    // Thin silhouettes (a minaret, a star point) are hard to hit exactly.
    return nearest(figures, point, 46);
  }

  return { pick };
}
