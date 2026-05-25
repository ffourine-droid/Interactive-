// Web Audio API Sound Effects Synthesizer for school/student transactions
// Highly reliable, 100% offline, requires no external file loading.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  // Resume if suspended (browser security blocks autoplay until user interaction)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Global toggle for sounds, persisted to localStorage
export function areSoundEffectsEnabled(): boolean {
  const saved = localStorage.getItem('azilearn_sfx_enabled');
  return saved !== 'false'; // default is true
}

export function setSoundEffectsEnabled(enabled: boolean) {
  localStorage.setItem('azilearn_sfx_enabled', enabled ? 'true' : 'false');
}

/**
 * Standard single transient "tick" sound for countdown timer seconds changing.
 */
export function playTick() {
  if (!areSoundEffectsEnabled()) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Short, high-pitch crisp click
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.05);

    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);
  } catch (e) {
    console.warn('AudioContext tick error:', e);
  }
}

/**
 * Double warning metallic tick for critical timer seconds (seconds < 5).
 */
export function playHurry() {
  if (!areSoundEffectsEnabled()) return;
  try {
    const ctx = getAudioContext();
    
    // Play a sharp, distinct high beep
    const playBeep = (delay: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1800, ctx.currentTime + delay);
      
      gainNode.gain.setValueAtTime(0.06, ctx.currentTime + delay);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.08);
      
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.09);
    };

    // Play double tick rapidly
    playBeep(0);
    playBeep(0.08);
  } catch (e) {
    console.warn('AudioContext hurry error:', e);
  }
}

/**
 * Beautiful positive double-pitch chord/chime to celebrate correct choice.
 */
export function playSuccess() {
  if (!areSoundEffectsEnabled()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const playNote = (freq: number, startTime: number, duration: number) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, startTime);
      
      // Warm fifth subharmonic or sine helper
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 1.5, startTime);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.12, startTime + 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + duration + 0.05);
      osc2.stop(startTime + duration + 0.05);
    };

    // Arpeggio: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) -> C6 (1046Hz)
    playNote(523.25, now, 0.4);
    playNote(659.25, now + 0.08, 0.4);
    playNote(783.99, now + 0.16, 0.4);
    playNote(1046.50, now + 0.24, 0.6);
  } catch (e) {
    console.warn('AudioContext success error:', e);
  }
}

/**
 * Soft low-pitch buzzer sound for wrong answers/failed actions.
 */
export function playFailure() {
  if (!areSoundEffectsEnabled()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Play a dual low buzzy combination
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(140, now);
    osc1.frequency.linearRampToValueAtTime(95, now + 0.28);
    
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(142, now);
    osc2.frequency.linearRampToValueAtTime(96, now + 0.28);
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  } catch (e) {
    console.warn('AudioContext failure error:', e);
  }
}

/**
 * Standard sliding transitional swoosh sound when switching screen or flipping question cards.
 */
export function playTransition() {
  if (!areSoundEffectsEnabled()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.type = 'sine';
    // Frequency sweeps upward elegantly to model level flow transitions
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(940, now + 0.22);
    
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.08, now + 0.08);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    
    osc.start(now);
    osc.stop(now + 0.25);
  } catch (e) {
    console.warn('AudioContext transition error:', e);
  }
}
