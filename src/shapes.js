// The puppet vocabulary of the shadow screen.
//
// Every shape traces a solid silhouette inside a 1x1 box centred on the
// origin and scaled by `size`; callers decide whether it is filled or stroked.
// Keeping them as plain paths lets the renderer, the hit-tester and the
// scorer draw exactly the same geometry.

function starPath(ctx, size, points, innerRatio) {
  const outer = 0.5 * size;
  const inner = outer * innerRatio;
  const step = Math.PI / points;

  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + i * step;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export const SHAPES = {
  crescent: {
    label: 'Hilal',
    fillRule: 'evenodd',
    path(ctx, s) {
      ctx.arc(0, 0, 0.5 * s, 0, Math.PI * 2);
      ctx.moveTo(0.16 * s + 0.32 * s, 0);
      ctx.arc(0.16 * s, 0, 0.32 * s, 0, Math.PI * 2);
    },
  },

  star: {
    label: 'Najma',
    path(ctx, s) {
      starPath(ctx, s, 8, 0.44);
    },
  },

  dome: {
    label: 'Qubba',
    path(ctx, s) {
      // Base plinth.
      ctx.moveTo(-0.45 * s, 0.5 * s);
      ctx.lineTo(0.45 * s, 0.5 * s);
      ctx.lineTo(0.45 * s, 0.38 * s);
      ctx.lineTo(-0.45 * s, 0.38 * s);
      ctx.closePath();

      // Onion dome: bulging shoulders narrowing to a point.
      ctx.moveTo(-0.4 * s, 0.4 * s);
      ctx.bezierCurveTo(-0.47 * s, 0.13 * s, -0.31 * s, 0.03 * s, -0.17 * s, -0.1 * s);
      ctx.bezierCurveTo(-0.11 * s, -0.24 * s, -0.06 * s, -0.34 * s, 0, -0.5 * s);
      ctx.bezierCurveTo(0.06 * s, -0.34 * s, 0.11 * s, -0.24 * s, 0.17 * s, -0.1 * s);
      ctx.bezierCurveTo(0.31 * s, 0.03 * s, 0.47 * s, 0.13 * s, 0.4 * s, 0.4 * s);
      ctx.closePath();
    },
  },

  minaret: {
    label: 'Minaara',
    path(ctx, s) {
      // Tapered shaft.
      ctx.moveTo(-0.15 * s, 0.5 * s);
      ctx.lineTo(0.15 * s, 0.5 * s);
      ctx.lineTo(0.09 * s, -0.04 * s);
      ctx.lineTo(-0.09 * s, -0.04 * s);
      ctx.closePath();

      // Balcony ring.
      ctx.moveTo(-0.23 * s, -0.04 * s);
      ctx.lineTo(0.23 * s, -0.04 * s);
      ctx.lineTo(0.23 * s, -0.16 * s);
      ctx.lineTo(-0.23 * s, -0.16 * s);
      ctx.closePath();

      // Upper storey.
      ctx.moveTo(-0.08 * s, -0.16 * s);
      ctx.lineTo(0.08 * s, -0.16 * s);
      ctx.lineTo(0.06 * s, -0.36 * s);
      ctx.lineTo(-0.06 * s, -0.36 * s);
      ctx.closePath();

      // Cap.
      ctx.moveTo(-0.12 * s, -0.36 * s);
      ctx.quadraticCurveTo(0, -0.31 * s, 0.12 * s, -0.36 * s);
      ctx.quadraticCurveTo(0.1 * s, -0.45 * s, 0, -0.5 * s);
      ctx.quadraticCurveTo(-0.1 * s, -0.45 * s, -0.12 * s, -0.36 * s);
      ctx.closePath();
    },
  },

  arch: {
    label: 'Qaws',
    path(ctx, s) {
      ctx.moveTo(-0.3 * s, 0.5 * s);
      ctx.lineTo(-0.3 * s, 0.06 * s);
      // A horseshoe arch overhangs its own jambs.
      ctx.arc(0, 0.06 * s, 0.34 * s, Math.PI, 0);
      ctx.lineTo(0.3 * s, 0.5 * s);
      ctx.closePath();
    },
  },

  palm: {
    label: 'Nakhla',
    path(ctx, s) {
      // Trunk.
      ctx.moveTo(-0.085 * s, 0.5 * s);
      ctx.quadraticCurveTo(-0.055 * s, 0.12 * s, -0.032 * s, -0.04 * s);
      ctx.lineTo(0.032 * s, -0.04 * s);
      ctx.quadraticCurveTo(0.032 * s, 0.14 * s, 0.09 * s, 0.5 * s);
      ctx.closePath();

      // Fronds fanning from the crown.
      const crownX = 0;
      const crownY = -0.06 * s;
      for (let i = 0; i < 7; i += 1) {
        const angle = -Math.PI * 0.94 + (i * Math.PI * 0.88) / 6;
        const length = (0.4 + (i % 3) * 0.035) * s;
        const wide = 0.085 * s;
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);
        const midX = crownX + dirX * length * 0.55;
        const midY = crownY + dirY * length * 0.55;
        const nx = -dirY * wide;
        const ny = dirX * wide;

        ctx.moveTo(crownX, crownY);
        ctx.quadraticCurveTo(midX + nx, midY + ny, crownX + dirX * length, crownY + dirY * length);
        ctx.quadraticCurveTo(midX - nx, midY - ny, crownX, crownY);
        ctx.closePath();
      }

      // Date cluster.
      ctx.moveTo(0.1 * s, 0.02 * s);
      ctx.arc(0.1 * s, 0.02 * s, 0.045 * s, 0, Math.PI * 2);
    },
  },

  lantern: {
    label: 'Fanoos',
    path(ctx, s) {
      // Body.
      ctx.moveTo(-0.22 * s, -0.06 * s);
      ctx.lineTo(0.22 * s, -0.06 * s);
      ctx.lineTo(0.27 * s, 0.17 * s);
      ctx.lineTo(0.15 * s, 0.4 * s);
      ctx.lineTo(-0.15 * s, 0.4 * s);
      ctx.lineTo(-0.27 * s, 0.17 * s);
      ctx.closePath();

      // Cap.
      ctx.moveTo(-0.15 * s, -0.06 * s);
      ctx.lineTo(0.15 * s, -0.06 * s);
      ctx.lineTo(0.09 * s, -0.2 * s);
      ctx.lineTo(-0.09 * s, -0.2 * s);
      ctx.closePath();

      // Neck and finial bead.
      ctx.moveTo(-0.05 * s, -0.2 * s);
      ctx.lineTo(0.05 * s, -0.2 * s);
      ctx.lineTo(0.05 * s, -0.25 * s);
      ctx.lineTo(-0.05 * s, -0.25 * s);
      ctx.closePath();
      ctx.moveTo(0.075 * s, -0.31 * s);
      ctx.arc(0, -0.31 * s, 0.075 * s, 0, Math.PI * 2);

      // Foot.
      ctx.moveTo(-0.06 * s, 0.4 * s);
      ctx.lineTo(0.06 * s, 0.4 * s);
      ctx.lineTo(0.045 * s, 0.5 * s);
      ctx.lineTo(-0.045 * s, 0.5 * s);
      ctx.closePath();
    },
  },
};

/**
 * Paint one puppet silhouette at `pose` ({ x, y, size, rot } in stage units).
 */
export function paintShape(ctx, shapeId, pose, options = {}) {
  const shape = SHAPES[shapeId];
  if (!shape) return;

  ctx.save();
  ctx.translate(pose.x, pose.y);
  if (pose.rot) ctx.rotate(pose.rot);
  ctx.beginPath();
  shape.path(ctx, pose.size);

  if (options.blur) {
    ctx.shadowColor = options.shadowColor || 'rgba(24, 12, 6, 0.5)';
    ctx.shadowBlur = options.blur;
  }

  if (options.fill) {
    ctx.fillStyle = options.fill;
    ctx.fill(shape.fillRule || 'nonzero');
  }

  if (options.stroke) {
    ctx.strokeStyle = options.stroke;
    ctx.lineWidth = options.lineWidth || 2;
    ctx.stroke();
  }

  ctx.restore();
}
