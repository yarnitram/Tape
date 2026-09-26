/**
 * Web Audio API Sound Synthesizer Engine for MOCHEX.
 * Zero external audio files required — synthesizes clean audio chimes in-browser.
 */

const AUDIO_ENABLED_KEY = "mochex:audio-enabled";
const AUDIO_VOLUME_KEY = "mochex:audio-volume";

export function isAudioEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(AUDIO_ENABLED_KEY);
  return stored !== "false"; // default true
}

export function setAudioEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUDIO_ENABLED_KEY, String(enabled));
}

export function getAudioVolume(): number {
  if (typeof window === "undefined") return 0.5;
  const stored = localStorage.getItem(AUDIO_VOLUME_KEY);
  if (!stored) return 0.5;
  const num = parseFloat(stored);
  return Number.isNaN(num) ? 0.5 : Math.max(0, Math.min(1, num));
}

export function setAudioVolume(vol: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUDIO_VOLUME_KEY, String(vol));
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  return new AudioCtx();
}

/** Play upbeat double chime when a Watchlist price trigger fires */
export function playTriggerSound(): void {
  if (!isAudioEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const vol = getAudioVolume();

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    gain.connect(ctx.destination);

    // Tone 1
    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now); // E5
    osc1.connect(gain);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Tone 2
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.12); // A5
    osc2.connect(gain);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.35);
  } catch {
    /* ignore audio context restrictions */
  }
}

/** Play victory chord when Take Profit (TP) target is hit */
export function playTpSound(): void {
  if (!isAudioEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const vol = getAudioVolume();

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    gain.connect(ctx.destination);

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      osc.connect(gain);
      osc.start(now + idx * 0.08);
      osc.stop(now + 0.5);
    });
  } catch {
    /* ignore audio context restrictions */
  }
}

/** Play soft warning tone when Stop Loss (SL) target is hit */
export function playSlSound(): void {
  if (!isAudioEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const vol = getAudioVolume();

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    gain.connect(ctx.destination);

    // Low descending tone
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(329.63, now); // E4
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.35); // A3
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.4);
  } catch {
    /* ignore audio context restrictions */
  }
}
