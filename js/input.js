window.SI = window.SI || {};

SI.Input = {
  left: false,
  right: false,
  fire: false,
  pausePressed: false,

  _keyState: {},
  _audioUnlocked: false,

  init: function() {
    var self = this;

    // Touch controls
    var btnLeft = document.getElementById('btn-left');
    var btnRight = document.getElementById('btn-right');
    var btnFire = document.getElementById('btn-fire');

    this._bindButton(btnLeft, 'left');
    this._bindButton(btnRight, 'right');
    this._bindButton(btnFire, 'fire');

    // Pause: tap on canvas
    var canvas = document.getElementById('game-canvas');
    canvas.addEventListener('touchstart', function(e) {
      e.preventDefault();
      self.pausePressed = true;
      self._unlockAudio();
    }, { passive: false });

    // Keyboard (desktop dev)
    document.addEventListener('keydown', function(e) {
      self._keyState[e.code] = true;
      if (e.code === 'Escape' || e.code === 'KeyP') {
        self.pausePressed = true;
      }
      self._unlockAudio();
    });

    document.addEventListener('keyup', function(e) {
      self._keyState[e.code] = false;
    });

    // Unlock audio on first touch anywhere
    document.addEventListener('touchstart', function() {
      self._unlockAudio();
    }, { once: true });
  },

  _activeTouches: {},

  _bindButton: function(element, action) {
    var self = this;

    element.addEventListener('touchstart', function(e) {
      e.preventDefault();
      e.stopPropagation();
      for (var t = 0; t < e.changedTouches.length; t++) {
        self._activeTouches[e.changedTouches[t].identifier] = action;
      }
      self[action] = true;
      self._unlockAudio();
    }, { passive: false });

    element.addEventListener('touchend', function(e) {
      e.preventDefault();
      e.stopPropagation();
      for (var t = 0; t < e.changedTouches.length; t++) {
        delete self._activeTouches[e.changedTouches[t].identifier];
      }
      // Only release if no other touch is holding this action
      var held = false;
      for (var id in self._activeTouches) {
        if (self._activeTouches[id] === action) { held = true; break; }
      }
      if (!held) self[action] = false;
    }, { passive: false });

    element.addEventListener('touchcancel', function(e) {
      for (var t = 0; t < e.changedTouches.length; t++) {
        delete self._activeTouches[e.changedTouches[t].identifier];
      }
      var held = false;
      for (var id in self._activeTouches) {
        if (self._activeTouches[id] === action) { held = true; break; }
      }
      if (!held) self[action] = false;
    });

    // Mouse support for desktop testing
    element.addEventListener('mousedown', function(e) {
      e.preventDefault();
      self[action] = true;
      self._unlockAudio();
    });

    element.addEventListener('mouseup', function(e) {
      e.preventDefault();
      self[action] = false;
    });

    element.addEventListener('mouseleave', function() {
      self[action] = false;
    });
  },

  _unlockAudio: function() {
    if (this._audioUnlocked) return;
    this._audioUnlocked = true;
    SI.Audio.init();
    SI.Audio.resume();
  },

  update: function() {
    // Merge keyboard into input state
    if (this._keyState['ArrowLeft'] || this._keyState['KeyA']) this.left = true;
    if (this._keyState['ArrowRight'] || this._keyState['KeyD']) this.right = true;
    if (this._keyState['Space'] || this._keyState['ArrowUp']) this.fire = true;
  },

  resetFrame: function() {
    this.pausePressed = false;
    // Reset keyboard-driven states when keys are released
    if (!this._keyState['ArrowLeft'] && !this._keyState['KeyA']) {
      // Only reset if no touch is active
      // Touch sets these directly via touchstart/touchend
      // We track touch separately so we don't reset touch input here
    }
  },

  // Called by game to check if a specific key is held
  isKeyDown: function(code) {
    return !!this._keyState[code];
  },
};
