// Generative maqam music, synthesised in the browser — no audio files.
//
// A drone holds the tonic and fifth while a plucked voice walks the Hijaz
// scale (D, E♭, F♯, G, A, B♭, C♯) and a frame drum answers it. The same
// vocabulary colours the interaction sounds, so the interface sits inside the
// music rather than on top of it.

const HIJAZ = [0, 1, 4, 5, 7, 8, 11, 12, 13, 16, 17, 19, 20, 23, 24];
const TONIC = 50; // D3
const STEP_SECONDS = 0.28;

export function createAudio() {
  let ctx = null;
  let master = null;
  let noise = null;
  let droneGain = null;
  let droneOscs = [];
  let timer = null;
  let nextTime = 0;
  let step = 0;
  let degree = 7;
  let muted = false;
  let running = false;

  const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
  const clock = () => (ctx ? ctx.currentTime : 0);

  function ensure() {
    if (ctx) return true;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return false;
    try {
      ctx = new AudioCtor();
    } catch {
      ctx = null;
      return false;
    }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.85;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 6;
    master.connect(comp);
    comp.connect(ctx.destination);
    return true;
  }

  function noiseBuffer() {
    if (noise || !ctx) return noise;
    const length = Math.floor(ctx.sampleRate * 0.4);
    noise = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    return noise;
  }

  function pluck(midi, when, { velocity = 0.3, decay = 0.85 } = {}) {
    if (!ctx) return;
    const t = Math.max(when, clock());
    const fundamental = ctx.createOscillator();
    fundamental.type = 'triangle';
    fundamental.frequency.value = hz(midi);

    const shimmer = ctx.createOscillator();
    shimmer.type = 'sawtooth';
    shimmer.frequency.value = hz(midi) * 2.004;

    const shimmerGain = ctx.createGain();
    shimmerGain.gain.value = 0.22;

    const body = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2800, t);
    filter.frequency.exponentialRampToValueAtTime(620, t + decay);

    fundamental.connect(body);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(body);
    body.connect(filter);
    filter.connect(master);

    body.gain.setValueAtTime(0.0001, t);
    body.gain.exponentialRampToValueAtTime(velocity, t + 0.012);
    body.gain.exponentialRampToValueAtTime(0.0001, t + decay);

    fundamental.start(t);
    shimmer.start(t);
    fundamental.stop(t + decay + 0.05);
    shimmer.stop(t + decay + 0.05);
  }

  function frameDrum(when, kind) {
    if (!ctx) return;
    const t = Math.max(when, clock());
    if (kind === 'dum') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(132, t);
      osc.frequency.exponentialRampToValueAtTime(58, t + 0.22);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + 0.32);
      return;
    }

    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer();
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 2600;
    band.Q.value = 1.4;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    source.connect(band);
    band.connect(gain);
    gain.connect(master);
    source.start(t);
    source.stop(t + 0.09);
  }

  function startDrone() {
    if (!ctx || droneGain) return;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 720;

    droneGain = ctx.createGain();
    droneGain.gain.value = 0;
    droneGain.connect(filter);
    filter.connect(master);
    droneGain.gain.linearRampToValueAtTime(0.55, clock() + 3.5);

    droneOscs = [TONIC, TONIC + 7, TONIC + 12].map((midi, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.value = hz(midi);
      osc.detune.value = (i - 1) * 5;
      const gain = ctx.createGain();
      gain.gain.value = i === 0 ? 0.13 : 0.05;
      osc.connect(gain);
      gain.connect(droneGain);
      osc.start();
      return osc;
    });
  }

  function scheduleStep(index, when) {
    if (Math.random() < 0.62) {
      const move = [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)];
      degree = Math.min(HIJAZ.length - 1, Math.max(0, degree + move));
      const midi = TONIC + HIJAZ[degree];
      pluck(midi, when, { velocity: 0.2 + Math.random() * 0.12, decay: 0.7 + Math.random() * 0.5 });
      if (Math.random() < 0.22) pluck(midi + 12, when + 0.07, { velocity: 0.08, decay: 0.45 });
    }

    const bar = index % 16;
    if (bar === 0 || bar === 10) frameDrum(when, 'dum');
    if (bar === 3 || bar === 6 || bar === 12) frameDrum(when, 'tak');
    if (bar === 15) frameDrum(when + 0.14, 'tak');
  }

  function scheduler() {
    if (!running || !ctx) return;
    while (nextTime < clock() + 0.4) {
      scheduleStep(step, nextTime);
      step += 1;
      nextTime += STEP_SECONDS;
    }
  }

  return {
    start() {
      if (running || !ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
      running = true;
      startDrone();
      step = 0;
      nextTime = clock() + 0.15;
      scheduler();
      timer = window.setInterval(scheduler, 120);
    },

    /** Resume after a browser autoplay block. Safe to call on every gesture. */
    unlock() {
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
    },

    setMuted(value) {
      muted = value;
      if (!ctx || !master) return;
      master.gain.cancelScheduledValues(clock());
      master.gain.linearRampToValueAtTime(muted ? 0 : 0.85, clock() + 0.25);
    },

    get muted() {
      return muted;
    },

    stop() {
      running = false;
      if (timer) window.clearInterval(timer);
      timer = null;
    },

    /* ---- interface sounds ---- */

    pick() {
      if (!ctx) return;
      pluck(TONIC + HIJAZ[3], clock(), { velocity: 0.09, decay: 0.32 });
    },

    turn() {
      if (!ctx) return;
      pluck(TONIC + HIJAZ[5], clock(), { velocity: 0.08, decay: 0.26 });
    },

    hint() {
      if (!ctx) return;
      const t = clock();
      pluck(TONIC + HIJAZ[6], t, { velocity: 0.14, decay: 1.6 });
      pluck(TONIC + HIJAZ[9], t + 0.09, { velocity: 0.08, decay: 1.4 });
    },

    solve() {
      if (!ctx) return;
      const t = clock();
      [0, 2, 4, 6, 9, 12].forEach((d, i) => {
        pluck(TONIC + 12 + HIJAZ[Math.min(d, HIJAZ.length - 1)], t + i * 0.11, {
          velocity: 0.16,
          decay: 1.1,
        });
      });
      frameDrum(t, 'dum');
      frameDrum(t + 0.33, 'dum');
    },
  };
}
