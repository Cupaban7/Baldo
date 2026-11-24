/**
 * Procedural Web Audio API sound engine for Baldo's Basics: Integrales Dobles.
 * - Unlocks cleanly on first pointer/touch/keyboard gesture (iOS Safari & Android Chrome)
 * - Cheerful 90s MIDI-style school melody that cuts dead into tense silence once Baldi gets angry
 * - Spatialized stereo + distance-attenuated ruler slap radar
 * - Synthesized SFX for doors, oiled doors, footsteps, whistle, jump-rope, bully, broom, boosters, math, and red alert
 */

export class RetroAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted = false;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private musicActive = false;
  private redAlertTimer: number | null = null;
  private redAlertActive = false;

  public unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.72;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.72, this.ctx.currentTime, 0.02);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public startSchoolMusic(): void {
    if (this.musicActive) return;
    this.musicActive = true;
    this.musicStep = 0;
    // Playful 90s edutainment MIDI melody (C major bouncy school tune)
    const melody = [
      523.25, 659.25, 783.99, 659.25, 880.0, 783.99, 659.25, 587.33,
      523.25, 587.33, 659.25, 783.99, 659.25, 523.25, 587.33, 0,
    ];
    const bass = [
      261.63, 0, 196.0, 0, 220.0, 0, 196.0, 0,
      174.61, 0, 261.63, 0, 196.0, 0, 196.0, 0,
    ];

    this.musicTimer = window.setInterval(() => {
      if (!this.musicActive || this.muted || !this.ctx || !this.masterGain) return;
      if (this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const idx = this.musicStep % melody.length;
      const note = melody[idx];
      const bNote = bass[idx];
      this.musicStep++;

      if (note > 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(note, now);
        gain.gain.setValueAtTime(0.055, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.2);
      }

      if (bNote > 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(bNote, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.26);
      }
    }, 240);
  }

  public stopSchoolMusic(): void {
    this.musicActive = false;
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  public setRedAlertAlarm(active: boolean): void {
    if (this.redAlertActive === active) return;
    this.redAlertActive = active;
    if (this.redAlertTimer !== null) {
      window.clearInterval(this.redAlertTimer);
      this.redAlertTimer = null;
    }
    if (active) {
      this.playRedAlertPulse();
      this.redAlertTimer = window.setInterval(() => {
        if (this.redAlertActive) this.playRedAlertPulse();
      }, 1500);
    }
  }

  public stopAllLoops(): void {
    this.stopSchoolMusic();
    this.setRedAlertAlarm(false);
  }

  private playRedAlertPulse(): void {
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.linearRampToValueAtTime(340, now + 0.45);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.52);
  }

  /**
   * Iconic wooden ruler SLAP! Spatialized by distance & stereo pan (-1..1).
   */
  public playRulerSlap(distance: number, pan: number, anger: number): void {
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const atten = Math.max(0.04, Math.min(1, 1.35 / (1 + distance * 0.24)));
    const now = this.ctx.currentTime;

    // 1. Sharp filtered noise crack
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.085);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.22));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1450 + anger * 95;
    filter.Q.value = 1.6;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.95 * atten, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

    // 2. Wooden body thwack
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240 + anger * 14, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.065);
    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.55 * atten, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    const outNode: AudioNode =
      typeof this.ctx.createStereoPanner === 'function'
        ? (() => {
            const p = this.ctx!.createStereoPanner();
            p.pan.value = Math.max(-0.95, Math.min(0.95, pan));
            p.connect(this.masterGain!);
            return p;
          })()
        : this.masterGain;

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(outNode);
    osc.connect(oscGain);
    oscGain.connect(outNode);

    noise.start(now);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playFootstep(running: boolean): void {
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const pitchJitter = 0.92 + Math.random() * 0.16;
    osc.type = 'sine';
    osc.frequency.setValueAtTime((running ? 135 : 98) * pitchJitter, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.045);
    gain.gain.setValueAtTime(running ? 0.14 : 0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playDoor(silenced: boolean): void {
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (silenced) {
      // Soft oiled pssh sound
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.11);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.13);
      return;
    }
    // Loud retro wooden door creak + slam!
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.linearRampToValueAtTime(340, now + 0.14);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.24);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.27);
  }

  public playPickup(): void {
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99];
    freqs.forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + i * 0.055);
      gain.gain.setValueAtTime(0.16, now + i * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + 0.13);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.14);
    });
  }

  public playMathResult(correct: boolean): void {
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (correct) {
      [587.33, 880.0].forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(f, now + i * 0.09);
        gain.gain.setValueAtTime(0.14, now + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.18);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now + i * 0.09);
        osc.stop(now + i * 0.09 + 0.19);
      });
    } else {
      // Saturated 90s buzzer!
      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc2.type = 'square';
      osc.frequency.setValueAtTime(115, now);
      osc2.frequency.setValueAtTime(123, now);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.56);
      osc2.stop(now + 0.56);
    }
  }

  public playWhistle(): void {
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2750, now);
    lfo.frequency.value = 34;
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    lfo.start(now);
    osc.stop(now + 0.52);
    lfo.stop(now + 0.52);
  }

  public playJump(success: boolean): void {
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = success ? 'triangle' : 'sawtooth';
    osc.frequency.setValueAtTime(success ? 340 : 160, now);
    osc.frequency.exponentialRampToValueAtTime(success ? 680 : 95, now + 0.14);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playBooster(type: 'coffee' | 'energy' | 'scissors' | 'oil'): void {
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (type === 'coffee') {
      // Fizzy soda/espresso hiss blast
      const bufLen = Math.floor(this.ctx.sampleRate * 0.35);
      const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.45));
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'highpass';
      filt.frequency.value = 950;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.32, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      src.connect(filt);
      filt.connect(g);
      g.connect(this.masterGain);
      src.start(now);
    } else if (type === 'energy') {
      [440, 554.37, 659.25, 880].forEach((f, idx) => {
        const osc = this.ctx!.createOscillator();
        const g = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + idx * 0.045);
        g.gain.setValueAtTime(0.18, now + idx * 0.045);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.12);
        osc.connect(g);
        g.connect(this.masterGain!);
        osc.start(now + idx * 0.045);
        osc.stop(now + idx * 0.045 + 0.13);
      });
    } else if (type === 'scissors') {
      // Crisp metallic double snip
      [0, 0.08].forEach((offset) => {
        const osc = this.ctx!.createOscillator();
        const g = this.ctx!.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1900, now + offset);
        osc.frequency.exponentialRampToValueAtTime(520, now + offset + 0.05);
        g.gain.setValueAtTime(0.2, now + offset);
        g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.06);
        osc.connect(g);
        g.connect(this.masterGain!);
        osc.start(now + offset);
        osc.stop(now + offset + 0.065);
      });
    } else {
      // Oil spray squeak-stop
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.22);
      g.gain.setValueAtTime(0.18, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  }

  public playBullyGrunt(): void {
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.26);
    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playSweepRoar(): void {
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const bufLen = Math.floor(this.ctx.sampleRate * 0.45);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      d[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = 620;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.28, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.44);
    src.connect(filt);
    filt.connect(g);
    g.connect(this.masterGain);
    src.start(now);
  }

  public playGameOverScare(): void {
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    // Classic Baldi harsh static buzz
    const bufLen = Math.floor(this.ctx.sampleRate * 0.65);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      d[i] = (Math.random() * 2 - 1) * (0.9 - (i / bufLen) * 0.6);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.36, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    src.connect(g);
    g.connect(this.masterGain);
    src.start(now);

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(92, now);
    osc.frequency.linearRampToValueAtTime(55, now + 0.6);
    osc.connect(g);
    osc.start(now);
    osc.stop(now + 0.65);
  }

  public playVoiceBlip(pitchOffset = 0): void {
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    const base = 290 + pitchOffset * 28 + (Math.random() * 44 - 22);
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 1.18, now + 0.045);
    g.gain.setValueAtTime(0.09, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playVictoryFanfare(): void {
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, now + idx * 0.11);
      g.gain.setValueAtTime(0.16, now + idx * 0.11);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.35);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(now + idx * 0.11);
      osc.stop(now + idx * 0.11 + 0.36);
    });
  }
}
