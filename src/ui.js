// The DOM chrome around the canvas: meter, act badge, prompt and overlays.

const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export function toRoman(value) {
  return ROMAN[value] || String(value);
}

export function createUI(handlers = {}) {
  const el = (id) => document.getElementById(id);

  const meter = el('meter');
  const meterFill = el('meterFill');
  const meterValue = el('meterValue');
  const levelBadge = el('levelBadge');
  const prompt = el('prompt');
  const overlay = el('overlay');
  const overlayKicker = el('overlayKicker');
  const overlayTitle = el('overlayTitle');
  const overlayBody = el('overlayBody');
  const overlayAction = el('overlayAction');

  let action = null;
  let lastPercent = -1;
  let lastNear = null;

  overlayAction.addEventListener('click', () => {
    const next = action;
    action = null;
    hideOverlay();
    if (next) next();
  });

  el('btnHint').addEventListener('click', () => handlers.onHint && handlers.onHint());
  el('btnReset').addEventListener('click', () => handlers.onReset && handlers.onReset());
  el('btnSound').addEventListener('click', () => handlers.onSound && handlers.onSound());
  el('btnTurnLeft').addEventListener('click', () => handlers.onTurn && handlers.onTurn(-1));
  el('btnTurnRight').addEventListener('click', () => handlers.onTurn && handlers.onTurn(1));

  function setMeter(score, tolerance) {
    const percent = Math.round(Math.max(0, Math.min(1, score)) * 100);
    if (percent !== lastPercent) {
      lastPercent = percent;
      meterFill.style.width = `${percent}%`;
      meterValue.textContent = `${percent}%`;
    }
    const near = score >= tolerance - 0.06;
    if (near !== lastNear) {
      lastNear = near;
      meter.classList.toggle('is-near', near);
    }
  }

  function setLevel(index) {
    levelBadge.textContent = `Act ${toRoman(index)}`;
  }

  function setPrompt(text) {
    prompt.textContent = text;
  }

  function setSound(muted) {
    const button = el('btnSound');
    button.setAttribute('aria-pressed', muted ? 'false' : 'true');
    button.textContent = muted ? 'Muted' : 'Sound';
  }

  function showOverlay({ kicker, title, body, actionLabel, onAction }) {
    overlayKicker.textContent = kicker || '';
    overlayTitle.textContent = title || '';
    overlayBody.textContent = body || '';
    overlayAction.textContent = actionLabel || 'Continue';
    action = onAction || null;
    overlay.hidden = false;
    overlayAction.focus({ preventScroll: true });
  }

  function hideOverlay() {
    overlay.hidden = true;
  }

  return { setMeter, setLevel, setPrompt, setSound, showOverlay, hideOverlay };
}
