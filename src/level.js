// Procedural acts for the shadow play.
//
// A level is built the way a real shadow play works: the lamp sits in front of
// the screen, so a puppet standing `z` in front of the screen casts a shadow
// magnified by LAMP_DEPTH / (LAMP_DEPTH - z). We first compose the *shadow*
// picture (the silhouette the player must reproduce), then solve backwards for
// the puppet pose that casts it. A scattered starting pose is derived from the
// same magnification, so every act is solvable by construction.

export const STAGE = { w: 1200, h: 720 };
export const SCREEN = { x: 26, y: 26, w: STAGE.w - 52, h: STAGE.h - 52 };

// Where the lamp shines from, in stage units.
export const LIGHT = { x: 600, y: 320 };

// Puppets may not be dragged so far that their shadow leaves the screen.
export const BOUNDS = {
  x0: SCREEN.x + 76,
  x1: SCREEN.x + SCREEN.w - 76,
  y0: SCREEN.y + 76,
  y1: SCREEN.y + SCREEN.h - 76,
};

const DEG = Math.PI / 180;

const MOTIFS = [
  {
    name: 'Night of the Crescent',
    parts: [
      { shape: 'palm', x: 0.24, y: 0.62, size: 250 },
      { shape: 'dome', x: 0.56, y: 0.62, size: 210 },
      { shape: 'crescent', x: 0.74, y: 0.26, size: 200 },
      { shape: 'star', x: 0.47, y: 0.19, size: 62 },
    ],
  },
  {
    name: 'Minaret at Dusk',
    parts: [
      { shape: 'minaret', x: 0.7, y: 0.56, size: 380 },
      { shape: 'dome', x: 0.3, y: 0.64, size: 230 },
      { shape: 'crescent', x: 0.47, y: 0.22, size: 140 },
      { shape: 'star', x: 0.84, y: 0.17, size: 60 },
    ],
  },
  {
    name: 'The Walled Garden',
    parts: [
      { shape: 'palm', x: 0.3, y: 0.6, size: 280 },
      { shape: 'arch', x: 0.58, y: 0.62, size: 250 },
      { shape: 'lantern', x: 0.44, y: 0.34, size: 110 },
      { shape: 'crescent', x: 0.78, y: 0.22, size: 140 },
    ],
  },
  {
    name: 'Procession of Lamps',
    parts: [
      { shape: 'lantern', x: 0.18, y: 0.62, size: 150 },
      { shape: 'arch', x: 0.44, y: 0.62, size: 230 },
      { shape: 'minaret', x: 0.72, y: 0.52, size: 340 },
      { shape: 'star', x: 0.87, y: 0.18, size: 58 },
    ],
  },
  {
    name: 'Dome of Stars',
    parts: [
      { shape: 'arch', x: 0.14, y: 0.66, size: 170 },
      { shape: 'dome', x: 0.48, y: 0.62, size: 320 },
      { shape: 'star', x: 0.26, y: 0.22, size: 76 },
      { shape: 'star', x: 0.7, y: 0.27, size: 62 },
      { shape: 'crescent', x: 0.87, y: 0.15, size: 100 },
    ],
  },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The shadow a puppet casts. */
export function shadowOf(puppet, magnification) {
  return {
    x: LIGHT.x + (puppet.x - LIGHT.x) * magnification,
    y: LIGHT.y + (puppet.y - LIGHT.y) * magnification,
    size: puppet.size * magnification,
    rot: puppet.rot,
  };
}

/** The puppet that casts a given shadow. */
export function projectShadowToPuppet(shadow, magnification) {
  return {
    x: LIGHT.x + (shadow.x - LIGHT.x) / magnification,
    y: LIGHT.y + (shadow.y - LIGHT.y) / magnification,
    size: shadow.size / magnification,
    rot: shadow.rot,
  };
}

function scatterShadow(target, rand, difficulty) {
  const angle = rand() * Math.PI * 2;
  const radius = (95 + difficulty * 190) * (0.65 + rand() * 0.7);
  const wantsTurn = difficulty >= 0.28 && rand() < 0.65;
  const turns = wantsTurn ? (rand() < 0.5 ? -1 : 1) * (1 + Math.floor(rand() * (1 + Math.round(difficulty * 3)))) : 0;

  return {
    x: clamp(target.x + Math.cos(angle) * radius, BOUNDS.x0, BOUNDS.x1),
    y: clamp(target.y + Math.sin(angle) * radius, BOUNDS.y0, BOUNDS.y1),
    size: target.size,
    rot: target.rot + turns * 15 * DEG,
  };
}

/** Push scattered puppets apart so none is buried under another. */
function separate(pieces) {
  for (let pass = 0; pass < 40; pass += 1) {
    let moved = false;
    for (let i = 0; i < pieces.length; i += 1) {
      for (let j = i + 1; j < pieces.length; j += 1) {
        const a = shadowOf(pieces[i].puppet, pieces[i].magnification);
        const b = shadowOf(pieces[j].puppet, pieces[j].magnification);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.hypot(dx, dy) || 1;
        if (distance >= 132) continue;

        const push = (132 - distance) / distance;
        const next = {
          x: clamp(b.x + dx * push, BOUNDS.x0, BOUNDS.x1),
          y: clamp(b.y + dy * push, BOUNDS.y0, BOUNDS.y1),
          size: b.size,
          rot: b.rot,
        };
        pieces[j].puppet = projectShadowToPuppet(next, pieces[j].magnification);
        pieces[j].start = { ...pieces[j].puppet };
        moved = true;
      }
    }
    if (!moved) break;
  }
}

export function createLevel({ index, difficulty, seed }) {
  const rand = mulberry32(seed);
  const motif = MOTIFS[(index - 1) % MOTIFS.length];
  const count = clamp(3 + Math.round(difficulty * 2), 3, motif.parts.length);
  const parts = [...motif.parts].sort((a, b) => b.size - a.size).slice(0, count);

  const targets = parts.map((part) => ({
    shape: part.shape,
    x: (part.x + (rand() - 0.5) * 0.028) * STAGE.w,
    y: (part.y + (rand() - 0.5) * 0.024) * STAGE.h,
    size: part.size * (0.94 + rand() * 0.12),
    rot: (Math.floor(rand() * 5) - 2) * 15 * DEG,
  }));

  const pieces = targets.map((target, i) => {
    const magnification = 1.08 + rand() * 0.62;
    const solution = projectShadowToPuppet(target, magnification);
    const start = projectShadowToPuppet(scatterShadow(target, rand, difficulty), magnification);
    return {
      id: i,
      shape: target.shape,
      magnification,
      puppet: { ...start },
      start: { ...start },
      solution: { ...solution },
      target,
    };
  });

  separate(pieces);

  return {
    index,
    seed,
    title: motif.name,
    difficulty,
    tolerance: 0.885 + difficulty * 0.05,
    ghostHold: 5.2 - difficulty * 2.6,
    targets,
    pieces,
  };
}

/** A rough combined positional-and-angular error, used for hints. */
export function pieceError(piece) {
  const shadow = shadowOf(piece.puppet, piece.magnification);
  let rotation = (shadow.rot - piece.target.rot) % (Math.PI * 2);
  if (rotation > Math.PI) rotation -= Math.PI * 2;
  if (rotation < -Math.PI) rotation += Math.PI * 2;
  return Math.hypot(shadow.x - piece.target.x, shadow.y - piece.target.y) + Math.abs(rotation) * 70;
}
