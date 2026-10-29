// Zill — a shadow play.
//
// The lamp casts each puppet onto the screen; the player drags the shadows into
// the faint figure. This module owns the game loop, the act state machine and
// the pointer gestures that move puppets.

import './style.css';

import { createDirector } from './adaptive.js';
import { createAudio } from './audio.js';
import {
  BOUNDS,
  createLevel,
  pieceError,
  projectShadowToPuppet,
  shadowOf,
} from './level.js';
import { createPicker } from './pick.js';
import { createRenderer } from './render.js';
import { createScorer } from './score.js';
import { createUI, toRoman } from './ui.js';

const canvas = document.getElementById('stage');
const renderer = createRenderer(canvas);
const scorer = createScorer();
const picker = createPicker();
const director = createDirector();
const audio = createAudio();

const TAU = Math.PI * 2;
const TURN = Math.PI / 12;
const SNAP_DISTANCE = 9;

const state = {
  phase: 'intro',
  level: null,
  selectedId: -1,
  drag: null,
  iou: 0,
  bestGain: 0,
  ghostTimer: 0,
  whisper: 0,
  flicker: 1,
  startedAt: 0,
  lastGainAt: 0,
  scoreClock: 0,
  hints: 0,
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function normAngle(angle) {
  let a = angle % TAU;
  if (a > Math.PI) a -= TAU;
  if (a < -Math.PI) a += TAU;
  return a;
}

function shadowsOf(level) {
  return level.pieces.map((piece) => ({
    id: piece.id,
    shape: piece.shape,
    ...shadowOf(piece.puppet, piece.magnification),
  }));
}

const ui = createUI({
  onHint: useHint,
  onReset: resetAct,
  onSound: toggleSound,
  onTurn: turnSelected,
});

/* ------------------------------------------------------------- scoring ---- */

function updateScore(figures) {
  if (!state.level) return;
  state.iou = scorer.measure(figures);
  if (state.iou > state.bestGain + 0.004) {
    state.bestGain = state.iou;
    state.lastGainAt = performance.now();
  }
  ui.setMeter(state.iou, state.level.tolerance);
}

function ghostAlpha() {
  const fade = Math.min(1, state.ghostTimer / 1.1);
  return Math.max(0.12, fade, state.whisper > 0 ? 0.5 : 0);
}

/* ----------------------------------------------------------- act cycle ---- */

function startAct(index) {
  const params = director.params();
  const seed =
    (Math.imul(index, 2654435761) ^ Math.imul(Math.round(params.difficulty * 997) + 1, 40503)) >>> 0;
  const level = createLevel({ index, difficulty: params.difficulty, seed });

  state.level = level;
  state.phase = 'play';
  state.selectedId = -1;
  state.drag = null;
  state.hints = 0;
  state.whisper = 0;
  state.bestGain = 0;
  state.ghostTimer = level.ghostHold;
  state.startedAt = performance.now();
  state.lastGainAt = performance.now();
  state.scoreClock = 1;

  scorer.setTarget(level.targets);
  renderer.setTargets(level.targets);
  ui.setLevel(index);
  ui.setPrompt(`${level.title} — drag each shadow onto the faint figure.`);
  updateScore(shadowsOf(level));
}

function completeAct() {
  if (state.phase !== 'play' || !state.level) return;
  state.phase = 'won';

  const seconds = (performance.now() - state.startedAt) / 1000;
  const percent = Math.round(state.iou * 100);
  director.recordSolve({ seconds, hints: state.hints });
  audio.solve();
  ui.setMeter(state.iou, state.level.tolerance);

  ui.showOverlay({
    kicker: `Act ${toRoman(state.level.index)} complete`,
    title: percent >= 98 ? 'Perfect shadow' : 'The figure holds',
    body: `${percent}% match · ${Math.round(seconds)}s · ${
      state.hints === 0 ? 'no hints' : `${state.hints} hint${state.hints > 1 ? 's' : ''}`
    }`,
    actionLabel: 'Next act',
    onAction: () => {
      director.advance();
      startAct(director.index);
    },
  });
}

function snapPiece(piece) {
  if (Math.abs(normAngle(piece.puppet.rot - piece.solution.rot)) > 0.002) return false;
  const shadow = shadowOf(piece.puppet, piece.magnification);
  if (Math.hypot(shadow.x - piece.target.x, shadow.y - piece.target.y) > SNAP_DISTANCE) return false;
  piece.puppet = { ...piece.solution };
  return true;
}

/* -------------------------------------------------------------- actions --- */

function useHint() {
  if (state.phase !== 'play' || !state.level) return;
  state.hints += 1;
  state.ghostTimer = Math.max(state.ghostTimer, 3.2);
  director.recordHint();
  audio.hint();

  let worst = -1;
  let worstError = -1;
  for (const piece of state.level.pieces) {
    const error = pieceError(piece);
    if (error > worstError) {
      worstError = error;
      worst = piece.id;
    }
  }
  if (worst >= 0) state.selectedId = worst;

  ui.setPrompt('The figure returns — study its edges, then match them.');
}

function resetAct() {
  if (state.phase !== 'play' || !state.level) return;
  for (const piece of state.level.pieces) piece.puppet = { ...piece.start };
  state.selectedId = -1;
  state.whisper = 0;
  director.recordStuck();
  audio.pick();
  updateScore(shadowsOf(state.level));
  ui.setPrompt('The puppets return to their starting places.');
}

function turnSelected(direction) {
  if (state.phase !== 'play' || !state.level) return;
  if (state.selectedId < 0) {
    ui.setPrompt('Touch a shadow first, then turn it.');
    return;
  }
  const piece = state.level.pieces[state.selectedId];
  piece.puppet.rot = normAngle(piece.puppet.rot + direction * TURN);
  audio.turn();
  snapPiece(piece);
  updateScore(shadowsOf(state.level));
  if (state.iou >= state.level.tolerance) completeAct();
}

function toggleSound() {
  audio.start();
  audio.setMuted(!audio.muted);
  ui.setSound(audio.muted);
}

/* --------------------------------------------------------------- input ---- */

canvas.addEventListener('pointerdown', (event) => {
  audio.unlock();
  if (state.phase !== 'play' || !state.level) return;

  const point = renderer.toStage(event.clientX, event.clientY);
  const figures = shadowsOf(state.level);
  const hit = picker.pick(figures, point);

  if (hit < 0) {
    state.selectedId = -1;
    return;
  }

  const shadow = figures[hit];
  state.selectedId = hit;
  state.drag = { id: hit, offX: point.x - shadow.x, offY: point.y - shadow.y };

  try {
    canvas.setPointerCapture(event.pointerId);
  } catch {
    /* capture is a nicety, dragging still works without it */
  }

  audio.pick();
  event.preventDefault();
});

canvas.addEventListener('pointermove', (event) => {
  if (!state.drag || !state.level || state.phase !== 'play') return;

  const point = renderer.toStage(event.clientX, event.clientY);
  const piece = state.level.pieces[state.drag.id];
  const current = shadowOf(piece.puppet, piece.magnification);

  // The shadow follows the finger exactly, which means the puppet behind the
  // screen travels only a fraction of the distance when it sits near the lamp.
  const next = {
    x: clamp(point.x - state.drag.offX, BOUNDS.x0, BOUNDS.x1),
    y: clamp(point.y - state.drag.offY, BOUNDS.y0, BOUNDS.y1),
    size: current.size,
    rot: piece.puppet.rot,
  };
  piece.puppet = projectShadowToPuppet(next, piece.magnification);
  event.preventDefault();
});

function endDrag() {
  if (!state.drag || !state.level) return;
  const piece = state.level.pieces[state.drag.id];
  state.drag = null;
  snapPiece(piece);
  updateScore(shadowsOf(state.level));
  if (state.phase === 'play' && state.iou >= state.level.tolerance) completeAct();
}

canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

window.addEventListener('keydown', (event) => {
  if (state.phase !== 'play') return;
  const key = event.key.toLowerCase();
  if (key === 'h') useHint();
  else if (key === 'r') resetAct();
  else if (key === 'q') turnSelected(-1);
  else if (key === 'e') turnSelected(1);
  else if (key === 'm') toggleSound();
});

/* ---------------------------------------------------------------- loop ---- */

let lastFrame = performance.now();

function frame(now) {
  const delta = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;

  const t = now / 1000;
  state.flicker = 0.82 + 0.18 * Math.sin(t * 1.7) * Math.sin(t * 0.63 + 1.1) + 0.05 * Math.sin(t * 19.3);

  if (!state.level) {
    renderer.draw({ shadows: [], ghostAlpha: 0, flicker: state.flicker, selectedId: -1 });
    requestAnimationFrame(frame);
    return;
  }

  state.ghostTimer = Math.max(0, state.ghostTimer - delta);
  if (state.whisper > 0) state.whisper = Math.max(0, state.whisper - delta);

  const figures = shadowsOf(state.level);

  if (state.phase === 'play') {
    state.scoreClock += delta;
    if (state.drag || state.scoreClock > 0.12) {
      state.scoreClock = 0;
      updateScore(figures);
    }
    // The director lends a hand when the player has been stuck for a while.
    if (now - state.lastGainAt > 20000 && state.iou < state.level.tolerance - 0.12) {
      state.whisper = 3.2;
      state.lastGainAt = now;
      director.recordStuck();
      ui.setPrompt('A voice recites — the figure returns for a moment.');
    }
  }

  renderer.draw({
    shadows: figures,
    ghostAlpha: ghostAlpha(),
    flicker: state.flicker,
    selectedId: state.selectedId,
  });

  requestAnimationFrame(frame);
}

/* ---------------------------------------------------------------- boot ---- */

renderer.resize();
if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(() => renderer.resize()).observe(canvas);
}
window.addEventListener('resize', () => renderer.resize());

ui.setSound(false);
ui.showOverlay({
  kicker: 'Zill · ظِل',
  title: 'A Shadow Play',
  body: 'Move the puppets behind the screen until their shadows join into the figure drawn in light. The figure fades — learn its edges quickly, and call it back with Hint. ⟲ ⟳ turn the shadow you last touched.',
  actionLabel: 'Begin the play',
  onAction: () => {
    audio.start();
    startAct(1);
  },
});

requestAnimationFrame(frame);
