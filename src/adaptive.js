// The adaptive director.
//
// There is no large model in the loop: the director keeps a running estimate of
// the player's skill from how quickly and cleanly acts are solved, and turns
// that into the next act's shape (how many puppets, how far they scatter, how
// forgiving the match has to be, how long the target figure lingers). Hints
// and long stalls pull it back down, fast solves push it up.

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function createDirector() {
  let skill = 0.3;
  let index = 1;

  function difficulty() {
    return clamp(skill * 0.78 + (index - 1) * 0.035, 0, 1);
  }

  return {
    get index() {
      return index;
    },

    get skill() {
      return skill;
    },

    params() {
      return { index, difficulty: difficulty() };
    },

    advance() {
      index += 1;
    },

    recordSolve({ seconds, hints }) {
      const speed = seconds <= 40 ? 1 : seconds <= 90 ? 0.6 : 0.25;
      const clean = hints === 0 ? 1 : 0.45;
      skill = clamp(skill + 0.1 * speed * clean, 0, 1);
    },

    recordHint() {
      skill = clamp(skill - 0.05, 0, 1);
    },

    recordStuck() {
      skill = clamp(skill - 0.03, 0, 1);
    },
  };
}
