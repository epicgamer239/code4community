/**
 * Tutoring request alert.
 * Audio: 3rd beep from GFXSounds "Positive Beep Sound Effect"
 * https://www.youtube.com/watch?v=fQZFoiSeuKQ (credit: gfxsounds.com)
 */

const ALERT_SRC = "/sounds/tutor-alert.mp3";

/** @type {HTMLAudioElement | null} */
let primed = null;
let unlocked = false;

function makeAudio() {
  const audio = new Audio(ALERT_SRC);
  audio.preload = "auto";
  audio.volume = 1;
  return audio;
}

function ensurePrimed() {
  if (typeof window === "undefined") return null;
  if (!primed) {
    primed = makeAudio();
    try {
      primed.load();
    } catch {
      /* ignore */
    }
  }
  return primed;
}

/** Call from a user gesture so later alerts can play while the tab is open. */
export async function unlockTutorAlertAudio() {
  if (typeof window === "undefined") return;
  const audio = ensurePrimed();
  if (!audio) return;
  try {
    // Unmuted near-silent play is what Chrome counts as a real unlock.
    audio.volume = 0.01;
    audio.currentTime = 0;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 1;
    unlocked = true;
  } catch {
    unlocked = false;
  }
}

/**
 * @param {{ muted?: boolean }} [opts]
 */
export function playTutorAlertSound(opts = {}) {
  if (opts.muted || typeof window === "undefined") return;

  const playOne = (audio) => {
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 1;
      const p = audio.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          unlocked = false;
        });
      }
    } catch {
      unlocked = false;
    }
  };

  // Fresh element each time avoids stuck/interrupted play() races.
  const audio = makeAudio();
  if (unlocked) {
    playOne(audio);
    return;
  }

  // Try anyway (may work if another gesture already unlocked media).
  playOne(audio);
  // Also kick the primed element in case the clone is blocked.
  const fallback = ensurePrimed();
  if (fallback && fallback !== audio) playOne(fallback);
}
