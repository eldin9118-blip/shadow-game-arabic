// Silhouette comparison.
//
// Both the target figure and the current shadows are rasterised into a small
// offscreen buffer and compared pixel by pixel: score = intersection / union.
// Working at low resolution keeps it cheap enough to run while dragging and
// makes the score forgiving of single-pixel jitter.

import { STAGE } from './level.js';
import { paintShape } from './shapes.js';

const GRID_W = 240;
const GRID_H = Math.round((GRID_W * STAGE.h) / STAGE.w);
const COVERED = 96;

function createBuffer() {
  const canvas = document.createElement('canvas');
  canvas.width = GRID_W;
  canvas.height = GRID_H;
  return { canvas, ctx: canvas.getContext('2d', { willReadFrequently: true }) };
}

function paintAll(ctx, figures) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, GRID_W, GRID_H);
  ctx.setTransform(GRID_W / STAGE.w, 0, 0, GRID_H / STAGE.h, 0, 0);
  for (const figure of figures) {
    paintShape(ctx, figure.shape, figure, { fill: '#000' });
  }
}

export function createScorer() {
  const target = createBuffer();
  const current = createBuffer();
  let targetAlpha = null;

  function setTarget(figures) {
    paintAll(target.ctx, figures);
    targetAlpha = target.ctx.getImageData(0, 0, GRID_W, GRID_H).data;
  }

  function measure(figures) {
    if (!targetAlpha) return 0;

    paintAll(current.ctx, figures);
    const pixels = current.ctx.getImageData(0, 0, GRID_W, GRID_H).data;

    let intersection = 0;
    let union = 0;
    for (let i = 3; i < pixels.length; i += 4) {
      const inTarget = targetAlpha[i] > COVERED;
      const inCurrent = pixels[i] > COVERED;
      if (inTarget || inCurrent) union += 1;
      if (inTarget && inCurrent) intersection += 1;
    }

    return union === 0 ? 0 : intersection / union;
  }

  return { setTarget, measure };
}
