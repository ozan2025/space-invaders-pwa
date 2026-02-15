window.SI = window.SI || {};

SI.Storage = {
  SAVE_KEY: 'si_gameState',
  HIGH_SCORE_KEY: 'si_highScore',
  SETTINGS_KEY: 'si_settings',
  VERSION: 1,

  // --- High Score ---
  getHighScore: function() {
    return parseInt(localStorage.getItem(this.HIGH_SCORE_KEY)) || 0;
  },

  setHighScore: function(score) {
    var current = this.getHighScore();
    if (score > current) {
      localStorage.setItem(this.HIGH_SCORE_KEY, score.toString());
      return true;
    }
    return false;
  },

  // --- Game State ---
  saveGame: function(state) {
    var data = {
      version: this.VERSION,
      timestamp: Date.now(),
      wave: state.wave,
      score: state.score,
      lives: state.player.lives,
      playerX: state.player.x,
      enemyAlive: this._serializeEnemyGrid(state.enemyGrid),
      shields: this._serializeShields(state.shields),
    };
    try {
      localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      // Storage full or unavailable
    }
  },

  loadGame: function() {
    try {
      var raw = localStorage.getItem(this.SAVE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (data.version !== this.VERSION) return null;
      return data;
    } catch (e) {
      this.clearSave();
      return null;
    }
  },

  hasSavedGame: function() {
    return localStorage.getItem(this.SAVE_KEY) !== null;
  },

  clearSave: function() {
    localStorage.removeItem(this.SAVE_KEY);
  },

  // --- Settings ---
  getSettings: function() {
    try {
      return JSON.parse(localStorage.getItem(this.SETTINGS_KEY)) || { muted: false };
    } catch (e) {
      return { muted: false };
    }
  },

  saveSettings: function(settings) {
    try {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      // Storage full or unavailable
    }
  },

  // --- Serialization helpers ---
  _serializeEnemyGrid: function(grid) {
    if (!grid || !grid.enemies) return [];
    var alive = [];
    for (var i = 0; i < grid.enemies.length; i++) {
      alive.push(grid.enemies[i].active ? 1 : 0);
    }
    return alive;
  },

  _serializeShields: function(shields) {
    if (!shields) return [];
    var result = [];
    for (var s = 0; s < shields.length; s++) {
      var cells = [];
      for (var r = 0; r < shields[s].cells.length; r++) {
        cells.push(shields[s].cells[r].slice());
      }
      result.push(cells);
    }
    return result;
  },
};
