// Canvas rendering for the shadow screen.

import { paintShape } from './shapes.js';
import { STAGE, SCREEN, LIGHT } from './level.js';

const GHOST_W = 600;
const GHOST_H = Math.round((GHOST_W * STAGE.h) / STAGE.w);

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function cornerBrackets(ctx) {
  const pad = 15;
  const arm = 26;
  const left = SCREEN.x + pad;
  const right = SCREEN.x + SCREEN.w - pad;
  const top = SCREEN.y + pad;
  const bottom = SCREEN.y + SCREEN.h - pad;

  ctx.strokeStyle = 'rgba(255, 220, 168, 0.16)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const [x, y, sx, sy] of [
    [left, top, 1, 1],
    [right, top, -1, 1],
    [left, bottom, 1, -1],
    [right, bottom, -1, -1],
  ]) {
    ctx.moveTo(x + arm * sx, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + arm * sy);
  }
  ctx.stroke();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  const ghost = document.createElement('canvas');
  ghost.width = GHOST_W;
  ghost.height = GHOST_H;
  const ghostCtx = ghost.getContext('2d');

  let scale = 1;
  let offX = 0;
  let offY = 0;

  function setTargets(targets) {
    ghostCtx.setTransform(1, 0, 0, 1, 0, 0);
    ghostCtx.clearRect(0, 0, GHOST_W, GHOST_H);
    ghostCtx.setTransform(GHOST_W / STAGE.w, 0, 0, GHOST_H / STAGE.h, 0, 0);
    for (const target of targets) {
      paintShape(ghostCtx, target.shape, target, { fill: '#fff2d6' });
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(320, Math.round(rect.width * dpr));
    const height = Math.max(192, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    scale = Math.min(canvas.width / STAGE.w, canvas.height / STAGE.h);
    offX = (canvas.width - STAGE.w * scale) / 2;
    offY = (canvas.height - STAGE.h * scale) / 2;
  }

  function toStage(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const px = (clientX - rect.left) * (canvas.width / Math.max(1, rect.width));
    const py = (clientY - rect.top) * (canvas.height / Math.max(1, rect.height));
    return { x: (px - offX) / scale, y: (py - offY) / scale };
  }

  function drawScreen(flicker) {
    const base = ctx.createRadialGradient(LIGHT.x, LIGHT.y, 30, LIGHT.x, LIGHT.y, 880);
    base.addColorStop(0, '#f9e2b8');
    base.addColorStop(0.5, '#e4b67b');
    base.addColorStop(1, '#9c5f28');
    ctx.fillStyle = base;
    ctx.fillRect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h);

    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(LIGHT.x, LIGHT.y, 8, LIGHT.x, LIGHT.y, 540);
    glow.addColorStop(0, `rgba(255, 214, 150, ${0.26 * flicker})`);
    glow.addColorStop(1, 'rgba(255, 214, 150, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h);
    ctx.globalCompositeOperation = 'source-over';
  }

  function draw(game) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offX, offY);

    ctx.fillStyle = '#0a0604';
    ctx.fillRect(0, 0, STAGE.w, STAGE.h);

    ctx.save();
    roundRect(ctx, SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h, 14);
    ctx.clip();

    drawScreen(game.flicker);

    if (game.ghostAlpha > 0.01) {
      ctx.globalAlpha = Math.min(1, game.ghostAlpha);
      ctx.drawImage(ghost, 0, 0, STAGE.w, STAGE.h);
      ctx.globalAlpha = 1;
    }

    for (const shadow of game.shadows) {
      const distance = Math.hypot(shadow.x - LIGHT.x, shadow.y - LIGHT.y);
      paintShape(ctx, shadow.shape, shadow, {
        fill: 'rgba(24, 12, 6, 0.95)',
        blur: (4 + distance / 130) * scale,
        shadowColor: 'rgba(24, 12, 6, 0.45)',
      });
    }

    const selected = game.shadows.find((shadow) => shadow.id === game.selectedId);
    if (selected) {
      paintShape(ctx, selected.shape, selected, {
        fill: 'rgba(38, 20, 9, 0.96)',
        blur: 20 * scale,
        shadowColor: 'rgba(255, 196, 118, 0.95)',
      });
    }

    // Warm vignette so the lamp reads as a single source.
    const vignette = ctx.createRadialGradient(LIGHT.x, LIGHT.y, 250, LIGHT.x, LIGHT.y, 900);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(46, 21, 6, 0.5)');
    ctx.fillStyle = vignette;
    ctx.fillRect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h);

    ctx.restore();

    cornerBrackets(ctx);

    roundRect(ctx, SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h, 14);
    ctx.strokeStyle = 'rgba(255, 226, 178, 0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();

    roundRect(ctx, SCREEN.x - 9, SCREEN.y - 9, SCREEN.w + 18, SCREEN.h + 18, 20);
    ctx.strokeStyle = '#20130a';
    ctx.lineWidth = 16;
    ctx.stroke();
  }

  return { draw, resize, toStage, setTargets };
}
