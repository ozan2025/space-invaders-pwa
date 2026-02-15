window.SI = window.SI || {};

SI.Audio = {
  ctx: null,
  masterGain: null,
  sfxGain: null,
  musicGain: null,
  muted: false,
  musicPlaying: false,
  _musicTimer: null,
  _musicBeat: 0,
  _musicTempo: 120,

  init: function() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.6;
    this.sfxGain.connect(this.masterGain);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.3;
    this.musicGain.connect(this.masterGain);
  },

  resume: function() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  _playTone: function(type, freq, duration, gainNode, volume, freqEnd) {
    if (!this.ctx || this.muted) return;
    var t = this.ctx.currentTime;
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 20), t + duration);
    }
    gain.gain.setValueAtTime(volume || 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(gainNode || this.sfxGain);
    osc.start(t);
    osc.stop(t + duration);
  },

  _playNoise: function(duration, gainNode, volume) {
    if (!this.ctx || this.muted) return;
    var t = this.ctx.currentTime;
    var bufferSize = this.ctx.sampleRate * duration;
    var buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    var source = this.ctx.createBufferSource();
    source.buffer = buffer;
    var gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume || 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    source.connect(gain);
    gain.connect(gainNode || this.sfxGain);
    source.start(t);
  },

  playLaser: function() {
    this._playTone('square', 880, 0.1, this.sfxGain, 0.15, 220);
  },

  playExplosion: function() {
    this._playNoise(0.3, this.sfxGain, 0.25);
    this._playTone('sawtooth', 150, 0.25, this.sfxGain, 0.15, 30);
  },

  playEnemyExplosion: function() {
    this._playNoise(0.2, this.sfxGain, 0.15);
    this._playTone('square', 200, 0.15, this.sfxGain, 0.1, 50);
  },

  playEnemyMove: function() {
    this._playTone('triangle', 80, 0.05, this.sfxGain, 0.08);
  },

  playPowerUp: function() {
    if (!this.ctx || this.muted) return;
    var t = this.ctx.currentTime;
    var notes = [523, 659, 784]; // C5, E5, G5
    for (var i = 0; i < notes.length; i++) {
      var osc = this.ctx.createOscillator();
      var gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = notes[i];
      gain.gain.setValueAtTime(0, t + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.2, t + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.15);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.15);
    }
  },

  playBossAppear: function() {
    this._playTone('sawtooth', 60, 1.5, this.sfxGain, 0.2, 40);
    this._playTone('square', 50, 1.5, this.sfxGain, 0.1, 30);
  },

  playBossHit: function() {
    this._playNoise(0.15, this.sfxGain, 0.2);
    this._playTone('square', 300, 0.1, this.sfxGain, 0.15, 100);
  },

  playPlayerHit: function() {
    this._playNoise(0.4, this.sfxGain, 0.3);
    this._playTone('sawtooth', 200, 0.3, this.sfxGain, 0.2, 40);
  },

  playGameOver: function() {
    if (!this.ctx || this.muted) return;
    var t = this.ctx.currentTime;
    var notes = [392, 349, 330, 262]; // G4, F4, E4, C4 descending
    for (var i = 0; i < notes.length; i++) {
      var osc = this.ctx.createOscillator();
      var gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = notes[i];
      gain.gain.setValueAtTime(0.25, t + i * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.3 + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.3);
      osc.stop(t + i * 0.3 + 0.4);
    }
  },

  playWaveComplete: function() {
    if (!this.ctx || this.muted) return;
    var t = this.ctx.currentTime;
    var notes = [523, 659, 784, 1047]; // C5, E5, G5, C6 ascending
    for (var i = 0; i < notes.length; i++) {
      var osc = this.ctx.createOscillator();
      var gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = notes[i];
      gain.gain.setValueAtTime(0.2, t + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.1);
      osc.stop(t + i * 0.1 + 0.25);
    }
  },

  playMenuSelect: function() {
    this._playTone('sine', 660, 0.08, this.sfxGain, 0.15);
  },

  startMusic: function() {
    if (this.musicPlaying || !this.ctx || this.muted) return;
    this.musicPlaying = true;
    this._musicBeat = 0;
    this._scheduleMusicBeat();
  },

  stopMusic: function() {
    this.musicPlaying = false;
    if (this._musicTimer) {
      clearTimeout(this._musicTimer);
      this._musicTimer = null;
    }
  },

  setMusicTempo: function(bpm) {
    this._musicTempo = Math.min(Math.max(bpm, 60), 300);
  },

  _scheduleMusicBeat: function() {
    if (!this.musicPlaying || !this.ctx) return;
    var self = this;
    var notes = [55, 49, 46, 49]; // A1, G1, Gb1, G1 - ominous bass
    var note = notes[this._musicBeat % notes.length];
    this._playTone('square', note, 0.08, this.musicGain, 0.2);
    this._musicBeat++;
    var interval = 60000 / this._musicTempo;
    this._musicTimer = setTimeout(function() {
      self._scheduleMusicBeat();
    }, interval);
  },

  toggleMute: function() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : 0.5;
    }
    if (this.muted) {
      this.stopMusic();
    }
    return this.muted;
  },
};
