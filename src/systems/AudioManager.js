/**
 * AudioManager — Procedural Web Audio Engine for Flappy Bird Chaos
 * All sounds are synthesized via the Web Audio API.
 * Zero copyright concerns — entirely original, generated in code.
 */

class AudioManagerClass {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('fbc_muted') === 'true';
    this.masterGain = null;

    // Music state
    this._musicNodes = [];
    this._musicSource = null;
    this._ambientBuffer = null;
    this._currentTrack = null;

    // Melody patterns (MIDI note numbers)
    this._menuMelody = [60, 64, 67, 72, 71, 67, 64, 60, 62, 65, 69, 74, 72, 69, 65, 62];
    this._gameMelody = [67, 72, 76, 79, 76, 72, 74, 77, 69, 72, 76, 79, 76, 69, 71, 74];
    this._chaosMelody = [84, 82, 80, 78, 76]; // descending dramatic

    this._scoreCount = 0;
  }

  /** Must be called after a user gesture to unlock AudioContext */
  unlock() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 1;
    this.masterGain.connect(this.ctx.destination);
    this._loadAmbientTrack();
  }

  async _loadAmbientTrack() {
    try {
      // Load the CC0 ambient track downloaded from OpenGameArt
      const response = await fetch('/Flappy-Bird-Chaos/assets/audio/ambient.ogg');
      const arrayBuffer = await response.arrayBuffer();
      this._ambientBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      
      // If a track was requested while loading, play it now
      if (this._currentTrack === 'menu') {
        this._currentTrack = null; // Reset so it triggers
        this.playMenuMusic();
      } else if (this._currentTrack === 'game') {
        const score = this._gameScore || 0;
        this._currentTrack = null; // Reset so it triggers
        this.playGameMusic(score);
      }
    } catch (e) {
      console.error('Failed to load ambient track:', e);
    }
  }

  // ─── Mute ────────────────────────────────────────────────────────────────

  get isMuted() { return this.muted; }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('fbc_muted', this.muted);
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.05);
    }
    return this.muted;
  }

  // ─── Low-level helpers ───────────────────────────────────────────────────

  _note(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /** Create a simple oscillator with ADSR envelope, returns the gain node */
  _osc({ type = 'square', freq, start, duration, attack = 0.01, decay = 0.08,
         sustain = 0.5, release = 0.12, volume = 0.18 }) {
    if (!this.ctx) return null;
    const t = start ?? this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + attack);
    gain.gain.linearRampToValueAtTime(sustain * volume, t + attack + decay);
    gain.gain.setValueAtTime(sustain * volume, t + duration - release);
    gain.gain.linearRampToValueAtTime(0, t + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + duration + 0.01);
    return gain;
  }

  /** White noise burst */
  _noise({ start, duration, volume = 0.12, attack = 0.002, release = 0.05 }) {
    if (!this.ctx) return;
    const t = start ?? this.ctx.currentTime;
    const bufSize = this.ctx.sampleRate * duration;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + attack);
    gain.gain.linearRampToValueAtTime(0, t + duration);
    src.connect(gain);
    gain.connect(this.masterGain);
    src.start(t);
  }

  // ─── SFX ─────────────────────────────────────────────────────────────────

  playFlap() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Soft soothing whoosh: triangle with very low pass feel
    this._osc({ type: 'triangle', freq: 150, start: t, duration: 0.15,
      attack: 0.04, decay: 0.06, sustain: 0.2, release: 0.1, volume: 0.15 });
    this._noise({ start: t, duration: 0.1, volume: 0.02, attack: 0.02, release: 0.08 });
  }

  playScore(scoreCount = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Soft chime — pentatonic scale so it always sounds harmonious
    const pentatonic = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
    const index = scoreCount % pentatonic.length;
    const semitoneShift = pentatonic[index];
    const baseFreq = 440 * Math.pow(2, semitoneShift / 12); // A4 based
    
    // Smooth bell-like sine
    this._osc({ type: 'sine', freq: baseFreq, start: t, duration: 0.4,
      attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.3, volume: 0.15 });
    // Soft harmonic
    this._osc({ type: 'sine', freq: baseFreq * 2, start: t, duration: 0.3,
      attack: 0.02, decay: 0.1, sustain: 0.1, release: 0.2, volume: 0.08 });
  }

  playDie() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Gentle descending sigh
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(330, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.8);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.1);
    gain.gain.linearRampToValueAtTime(0, t + 0.8);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(t); osc.stop(t + 0.9);
  }

  playChaosActivate() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Soft mysterious ascending chord
    const notes = [60, 64, 67, 71, 74]; // CMaj9
    notes.forEach((n, i) => {
      this._osc({ type: 'sine', freq: this._note(n), start: t + i * 0.08,
        duration: 0.6, attack: 0.05, decay: 0.1, sustain: 0.3, release: 0.4, volume: 0.12 });
    });
  }

  playBounce() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Gentle resonant drop
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.1);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.3);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.05);
    gain.gain.linearRampToValueAtTime(0, t + 0.3);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(t); osc.stop(t + 0.35);
  }

  playDash() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Soft wind rush
    this._osc({ type: 'sine', freq: 440, start: t, duration: 0.2,
      attack: 0.05, decay: 0.1, sustain: 0.1, release: 0.1, volume: 0.1 });
    this._noise({ start: t, duration: 0.2, volume: 0.05, attack: 0.05, release: 0.15 });
  }

  playSpeedChange(fast = true) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    if (fast) {
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(660, t + 0.3);
    } else {
      osc.frequency.setValueAtTime(660, t);
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.3);
    }
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.1);
    gain.gain.linearRampToValueAtTime(0, t + 0.3);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(t); osc.stop(t + 0.35);
  }

  playCountdown(beat) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Soft meditative gongs
    const freqs = [329.63, 392.00, 523.25]; // E4, G4, C5
    const freq = freqs[Math.min(beat, freqs.length - 1)];
    const vol = beat === 2 ? 0.2 : 0.15;
    this._osc({ type: 'sine', freq, start: t, duration: 0.6,
      attack: 0.02, decay: 0.2, sustain: 0.2, release: 0.4, volume: vol });
  }

  // ─── Background Music ─────────────────────────────────────────────────────

  _stopMusic() {
    if (this._musicSource) {
      this._musicSource.stop();
      this._musicSource.disconnect();
      this._musicSource = null;
    }
    this._currentTrack = null;
  }

  playMenuMusic() {
    if (!this.ctx || this._currentTrack === 'menu') return;
    this._stopMusic();
    this._currentTrack = 'menu';
    
    if (this._ambientBuffer) {
      this._musicSource = this.ctx.createBufferSource();
      this._musicSource.buffer = this._ambientBuffer;
      this._musicSource.loop = true;
      this._musicSource.playbackRate.value = 1.0;
      
      const gain = this.ctx.createGain();
      gain.gain.value = 0.5; // Soothing volume
      this._musicSource.connect(gain);
      gain.connect(this.masterGain);
      
      this._musicSource.start();
    }
  }

  playGameMusic(score = 0) {
    if (!this.ctx) return;
    
    // If it's already playing game music, just update the rate
    if (this._currentTrack === 'game') {
      this.updateGameTempo(score);
      return;
    }
    
    this._stopMusic();
    this._currentTrack = 'game';
    this._gameScore = score;

    if (this._ambientBuffer) {
      this._musicSource = this.ctx.createBufferSource();
      this._musicSource.buffer = this._ambientBuffer;
      this._musicSource.loop = true;
      
      // Slightly faster for gameplay
      const rate = Math.min(1.1 + (score * 0.02), 2.5);
      this._musicSource.playbackRate.value = rate;
      
      const gain = this.ctx.createGain();
      gain.gain.value = 0.6;
      this._musicSource.connect(gain);
      gain.connect(this.masterGain);
      
      this._musicSource.start();
    }
  }

  updateGameTempo(score) {
    if (this._currentTrack !== 'game') return;
    this._gameScore = score;
    if (this._musicSource) {
      // Gently increase pitch/speed as score rises for subtle tension
      const targetRate = Math.min(1.1 + (score * 0.02), 2.5);
      this._musicSource.playbackRate.setTargetAtTime(targetRate, this.ctx.currentTime, 0.5);
    }
  }

  stopMusic() {
    this._stopMusic();
  }

  playDeathStinger() {
    if (!this.ctx) return;
    this._stopMusic();
    const t = this.ctx.currentTime;
    // Sad trombone descend
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(392, t);          // G4
    osc.frequency.setValueAtTime(349, t + 0.15);   // F4
    osc.frequency.setValueAtTime(330, t + 0.30);   // E4
    osc.frequency.setValueAtTime(294, t + 0.45);   // D4
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.45);
    gain.gain.linearRampToValueAtTime(0, t + 0.75);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(t); osc.stop(t + 0.8);
  }
}

export const AudioManager = new AudioManagerClass();
