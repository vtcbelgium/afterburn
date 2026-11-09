export class Soundtrack {
  constructor() {
    this.enabled = false;
    this.context = null;
    this.lastBeat = -1;
  }

  async setEnabled(enabled) {
    if (enabled && !this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.12;
      this.master.connect(this.context.destination);
    }
    if (enabled) await this.context.resume();
    this.enabled = enabled;
    if (this.master) this.master.gain.setTargetAtTime(enabled ? 0.12 : 0, this.context.currentTime, 0.04);
    return this.enabled;
  }

  tone(frequency, duration = 0.1, type = 'sine', gain = 0.4, slide = 0) {
    if (!this.enabled || !this.context) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (slide) oscillator.frequency.exponentialRampToValueAtTime(slide, now + duration);
    envelope.gain.setValueAtTime(gain, now);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(envelope);
    envelope.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  tick(time, boosting) {
    const beat = Math.floor(time * 2.2);
    if (beat === this.lastBeat) return;
    this.lastBeat = beat;
    const notes = [55, 55, 82.41, 55, 73.42, 73.42, 65.41, 82.41];
    this.tone(notes[beat % 8], 0.2, 'sawtooth', 0.14);
    this.tone(110, 0.13, 'sine', 0.8, 32);
    if (boosting) this.tone(440, 0.08, 'triangle', 0.12);
  }

  pickup() { this.tone(880, 0.16, 'sine', 0.4, 1760); }
  hit() { this.tone(140, 0.4, 'sawtooth', 0.5, 25); }
  start() { this.tone(220, 0.3, 'triangle', 0.4, 880); }
  nearMiss() { this.tone(440, 0.14, 'triangle', 0.4, 660); }
}
