/**
 * Web Audio API alarm sound generator.
 * Provides both single-play and continuous looping alarm capabilities.
 */

let audioContext = null;
let loopOscillators = [];
let loopGains = [];
let loopIntervalId = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Play a single melodic alarm pattern (3 repetitions of C5-E5-G5-C6).
 */
export function playAlarm() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const noteDuration = 0.15;
    const gap = 0.1;
    const repetitions = 3;

    for (let rep = 0; rep < repetitions; rep++) {
      notes.forEach((freq, i) => {
        const startTime = now + rep * (notes.length * (noteDuration + gap)) + i * (noteDuration + gap);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
        gain.gain.linearRampToValueAtTime(0.2, startTime + noteDuration * 0.5);
        gain.gain.linearRampToValueAtTime(0, startTime + noteDuration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + noteDuration);
      });
    }
  } catch (e) {
    console.warn('Audio playback failed:', e);
  }
}

/**
 * Start a continuous looping alarm that repeats indefinitely.
 * Returns a `stop` function that the caller can invoke to silence the alarm.
 */
export function startLoopingAlarm() {
  // Clean up any existing loop first
  stopLoopingAlarm();

  const ctx = getAudioContext();
  if (ctx.state === 'suspended') ctx.resume();

  let isActive = true;

  const playChime = () => {
    if (!isActive) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const noteDuration = 0.12;
    const gap = 0.08;

    notes.forEach((freq, i) => {
      const startTime = now + i * (noteDuration + gap);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.01);
      gain.gain.linearRampToValueAtTime(0.15, startTime + noteDuration * 0.5);
      gain.gain.linearRampToValueAtTime(0, startTime + noteDuration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + noteDuration);
    });
  };

  // Play immediately, then every 1.5 seconds
  playChime();
  loopIntervalId = setInterval(() => {
    if (isActive) playChime();
  }, 1500);

  return () => {
    isActive = false;
    stopLoopingAlarm();
  };
}

/**
 * Internal: stop the looping alarm and clean up resources.
 */
function stopLoopingAlarm() {
  if (loopIntervalId) {
    clearInterval(loopIntervalId);
    loopIntervalId = null;
  }
  loopOscillators = [];
  loopGains = [];
}

export function playTick() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.01);
    gain.gain.linearRampToValueAtTime(0, now + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  } catch (e) {
    // Silently fail for tick sounds
  }
}

