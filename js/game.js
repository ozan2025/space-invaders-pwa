window.SI = window.SI || {};

SI.Game = {
  state: 'MENU',
  player: null,
  enemyGrid: null,
  boss: null,
  playerBullets: [],
  enemyBullets: [],
  powerUps: [],
  shields: [],
  score: 0,
  wave: 1,
  highScore: 0,
  waveTransitionTimer: 0,
  bossIntroTimer: 0,
  lastFrameTime: 0,
  _nextWaveIsBoss: false,
  ufo: null,
  ufoTimer: 0,

  // --- Initialization ---
  init: function() {
    SI.Renderer.init(document.getElementById('game-canvas'));
    SI.Input.init();

    // Load settings
    var settings = SI.Storage.getSettings();
    if (settings.muted) {
      SI.Audio.muted = true;
    }

    this.highScore = SI.Storage.getHighScore();

    // Set version label
    var versionEl = document.getElementById('version-label');
    if (versionEl) versionEl.textContent = SI.VERSION;

    // Bind menu buttons
    this._bindMenuButtons();

    // Show menu
    this._showMenu();

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js?v=' + SI.VERSION).catch(function() {});
    }

    // Start game loop
    this.lastFrameTime = performance.now();
    var self = this;
    requestAnimationFrame(function(t) { self._loop(t); });
  },

  // --- Game Loop ---
  _loop: function(timestamp) {
    var dt = Math.min((timestamp - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = timestamp;

    SI.Input.update();
    this._update(dt);
    this._render();
    SI.Input.resetFrame();

    var self = this;
    requestAnimationFrame(function(t) { self._loop(t); });
  },

  _update: function(dt) {
    switch (this.state) {
      case 'MENU':
        SI.Renderer.updateStarfield(dt);
        break;

      case 'PLAYING':
        this._updatePlaying(dt);
        break;

      case 'PAUSED':
        if (SI.Input.pausePressed) this._unpause();
        break;

      case 'WAVE_TRANSITION':
        SI.Renderer.updateStarfield(dt);
        SI.Renderer.updateParticles(dt);
        this.waveTransitionTimer -= dt;
        if (this.waveTransitionTimer <= 0) {
          this._startWave(this.wave);
        }
        break;

      case 'BOSS_INTRO':
        SI.Renderer.updateStarfield(dt);
        if (this.boss) {
          var bossBullets = SI.Entities.updateBoss(this.boss, dt);
          // Don't add bullets during intro
        }
        this.bossIntroTimer -= dt;
        if (this.bossIntroTimer <= 0) {
          this.state = 'PLAYING';
          SI.Audio.startMusic();
        }
        break;

      case 'GAME_OVER':
        SI.Renderer.updateStarfield(dt);
        SI.Renderer.updateParticles(dt);
        break;
    }
  },

  _updatePlaying: function(dt) {
    // Check pause
    if (SI.Input.pausePressed) {
      this._pause();
      return;
    }

    // Update player
    SI.Entities.updatePlayer(this.player, dt, SI.Input);

    // Player firing
    if (SI.Input.fire && this.player.fireCooldown <= 0) {
      this._playerFire();
    }

    // Update enemies or boss
    if (this.boss && this.boss.active) {
      var bossBullets = SI.Entities.updateBoss(this.boss, dt);
      for (var bb = 0; bb < bossBullets.length; bb++) {
        this.enemyBullets.push(bossBullets[bb]);
      }
    } else if (this.enemyGrid && this.enemyGrid.enemies.length > 0) {
      var newBullets = SI.Entities.updateEnemyGrid(this.enemyGrid, dt);
      for (var nb = 0; nb < newBullets.length; nb++) {
        this.enemyBullets.push(newBullets[nb]);
      }
    }

    // Update bullets
    SI.Entities.updateBullets(this.playerBullets, dt);
    SI.Entities.updateBullets(this.enemyBullets, dt);

    // Update power-ups
    SI.Entities.updatePowerUps(this.powerUps, dt);

    // Update UFO
    this.ufoTimer -= dt;
    if (this.ufoTimer <= 0 && (!this.ufo || !this.ufo.active)) {
      this.ufo = SI.Entities.createUFO();
      this.ufoTimer = SI.UFO.SPAWN_INTERVAL_MIN + Math.random() * (SI.UFO.SPAWN_INTERVAL_MAX - SI.UFO.SPAWN_INTERVAL_MIN);
    }
    SI.Entities.updateUFO(this.ufo, dt);

    // Update visuals
    SI.Renderer.updateStarfield(dt);
    SI.Renderer.updateParticles(dt);
    SI.Renderer.updateFloatingTexts(dt);

    // Collision detection
    this._checkCollisions();

    // Win condition
    if (this.boss) {
      if (!this.boss.active) {
        this._completeWave();
      }
    } else if (this._allEnemiesDead()) {
      this._completeWave();
    }

    // Lose condition - enemies reached shields/player
    if (this._enemiesReachedBottom()) {
      this._gameOver();
    }

    // Cleanup
    this._cleanup();

    // Update music tempo
    this._updateMusicTempo();
  },

  // --- Collision Detection ---
  _checkCollisions: function() {
    var i, j;

    // Player bullets vs enemies
    for (i = 0; i < this.playerBullets.length; i++) {
      var pb = this.playerBullets[i];
      if (!pb.active) continue;

      // vs enemy grid
      if (this.enemyGrid) {
        for (j = 0; j < this.enemyGrid.enemies.length; j++) {
          var enemy = this.enemyGrid.enemies[j];
          if (!enemy.active) continue;
          if (this._aabb(pb, enemy)) {
            pb.active = false;
            enemy.active = false;
            this.enemyGrid.killCount++;
            this.score += enemy.points;
            SI.Audio.playEnemyExplosion();
            SI.Renderer.spawnExplosion(
              enemy.x + enemy.width / 2,
              enemy.y + enemy.height / 2,
              enemy.color
            );
            this._tryDropPowerUp(enemy.x + enemy.width / 2, enemy.y);
            break;
          }
        }
      }

      // vs UFO
      if (pb.active && this.ufo && this.ufo.active) {
        if (this._aabb(pb, this.ufo)) {
          pb.active = false;
          this.ufo.active = false;
          this.score += this.ufo.points;
          SI.Audio.playExplosion();
          SI.Renderer.spawnExplosion(
            this.ufo.x + this.ufo.width / 2,
            this.ufo.y + this.ufo.height / 2,
            SI.COLORS.UFO
          );
          SI.Renderer.spawnFloatingText(
            this.ufo.x + this.ufo.width / 2,
            this.ufo.y,
            'OZAN!', '#f0f'
          );
        }
      }

      // vs boss
      if (pb.active && this.boss && this.boss.active) {
        if (this._aabb(pb, this.boss)) {
          pb.active = false;
          this.boss.hp--;
          SI.Audio.playBossHit();
          SI.Renderer.spawnExplosion(pb.x, pb.y, '#fa0');
          if (this.boss.hp <= 0) {
            this.boss.active = false;
            this.score += SI.BOSS.POINTS;
            SI.Audio.playExplosion();
            // Big explosion
            for (var k = 0; k < 5; k++) {
              SI.Renderer.spawnExplosion(
                this.boss.x + Math.random() * this.boss.width,
                this.boss.y + Math.random() * this.boss.height,
                ['#f44', '#fa0', '#ff0'][Math.floor(Math.random() * 3)]
              );
            }
            // Easter egg: "OZAN" floats up from boss
            SI.Renderer.spawnFloatingText(
              this.boss.x + this.boss.width / 2,
              this.boss.y + this.boss.height / 2,
              'OZAN', '#ff0'
            );
          }
        }
      }
    }

    // Enemy bullets vs player
    if (this.player.invincibleTimer <= 0) {
      for (i = 0; i < this.enemyBullets.length; i++) {
        var eb = this.enemyBullets[i];
        if (!eb.active) continue;
        if (this._aabb(eb, this.player)) {
          eb.active = false;
          this._playerHit();
          break;
        }
      }
    }

    // All bullets vs shields
    var allBullets = this.playerBullets.concat(this.enemyBullets);
    for (i = 0; i < allBullets.length; i++) {
      var bullet = allBullets[i];
      if (!bullet.active) continue;
      for (j = 0; j < this.shields.length; j++) {
        var shield = this.shields[j];
        if (this._bulletHitsShield(bullet, shield)) {
          bullet.active = false;
          break;
        }
      }
    }

    // Player vs power-ups
    for (i = 0; i < this.powerUps.length; i++) {
      var pu = this.powerUps[i];
      if (!pu.active) continue;
      if (this._aabb(this.player, pu)) {
        pu.active = false;
        var puLabels = { rapid_fire: 'RAPID FIRE!', double_shot: 'DOUBLE SHOT!', shield_restore: 'SHIELD!' };
        if (puLabels[pu.type]) {
          SI.Renderer.spawnFloatingText(pu.x + pu.width / 2, pu.y, puLabels[pu.type], '#0f0');
        }
        if (pu.type === 'ozan_bomb') {
          this._detonateOzanBomb();
        } else {
          SI.Entities.applyPowerUp(this.player, pu.type, this.shields);
        }
        SI.Audio.playPowerUp();
      }
    }

    // Enemies vs shields (enemies march through shields, destroying them)
    if (this.enemyGrid) {
      for (i = 0; i < this.enemyGrid.enemies.length; i++) {
        var en = this.enemyGrid.enemies[i];
        if (!en.active) continue;
        for (j = 0; j < this.shields.length; j++) {
          if (this._aabb(en, this.shields[j])) {
            this._destroyShieldOverlap(en, this.shields[j]);
          }
        }
      }
    }
  },

  _aabb: function(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
  },

  _bulletHitsShield: function(bullet, shield) {
    if (!this._aabb(bullet, shield)) return false;
    // Try to damage at bullet tip
    var tipX = bullet.x + bullet.width / 2;
    var tipY = bullet.speed < 0 ? bullet.y : bullet.y + bullet.height;
    return SI.Entities.damageShieldAt(shield, tipX, tipY);
  },

  _destroyShieldOverlap: function(entity, shield) {
    var cs = SI.SHIELD.CELL_SIZE;
    var startCol = Math.floor((entity.x - shield.x) / cs);
    var endCol = Math.floor((entity.x + entity.width - shield.x) / cs);
    var startRow = Math.floor((entity.y - shield.y) / cs);
    var endRow = Math.floor((entity.y + entity.height - shield.y) / cs);
    for (var r = startRow; r <= endRow; r++) {
      for (var c = startCol; c <= endCol; c++) {
        if (r >= 0 && r < shield.cells.length && c >= 0 && c < shield.cells[r].length) {
          shield.cells[r][c] = 0;
        }
      }
    }
  },

  // --- Game Actions ---
  _playerFire: function() {
    var cx = this.player.x + this.player.width / 2;
    var by = this.player.y;

    this.playerBullets.push(
      SI.Entities.createBullet(cx - SI.BULLET.WIDTH / 2, by, SI.BULLET.PLAYER_SPEED, true)
    );

    if (this.player.doubleShot) {
      this.playerBullets.push(
        SI.Entities.createBullet(cx - 10, by, SI.BULLET.PLAYER_SPEED, true)
      );
      this.playerBullets.push(
        SI.Entities.createBullet(cx + 8, by, SI.BULLET.PLAYER_SPEED, true)
      );
    }

    this.player.fireCooldown = this.player.fireRate;
    SI.Audio.playLaser();
  },

  _playerHit: function() {
    this.player.lives--;
    this.player.invincibleTimer = SI.PLAYER.INVINCIBLE_TIME;
    SI.Audio.playPlayerHit();
    SI.Renderer.triggerShake();
    SI.Renderer.triggerFlash();

    if (this.player.lives <= 0) {
      this._gameOver();
    }
  },

  _completeWave: function() {
    SI.Audio.playWaveComplete();
    SI.Audio.stopMusic();
    this.wave++;
    this.state = 'WAVE_TRANSITION';

    // Check if next wave is boss
    var nextConfig = SI.WAVES.getConfig(this.wave);
    this._nextWaveIsBoss = nextConfig.isBossWave;

    this.waveTransitionTimer = 2.5;
    SI.Storage.saveGame(this._getStateSnapshot());
  },

  _startWave: function(waveNum) {
    var config = SI.WAVES.getConfig(waveNum);

    this.playerBullets = [];
    this.enemyBullets = [];
    this.powerUps = [];
    this.shields = SI.Entities.createShields();

    if (config.isBossWave) {
      this.boss = SI.Entities.createBoss(waveNum);
      this.enemyGrid = { enemies: [], killCount: 0 };
      this.state = 'BOSS_INTRO';
      this.bossIntroTimer = 2.0;
      SI.Audio.playBossAppear();
    } else {
      this.boss = null;
      this.enemyGrid = SI.Entities.createEnemyGrid(config);
      this.state = 'PLAYING';
      SI.Audio.startMusic();
    }
  },

  _detonateOzanBomb: function() {
    // Kill all active enemies with explosions
    if (this.enemyGrid) {
      for (var i = 0; i < this.enemyGrid.enemies.length; i++) {
        var e = this.enemyGrid.enemies[i];
        if (!e.active) continue;
        e.active = false;
        this.enemyGrid.killCount++;
        this.score += e.points;
        SI.Renderer.spawnExplosion(e.x + e.width / 2, e.y + e.height / 2, e.color);
      }
    }
    // Clear all enemy bullets
    this.enemyBullets = [];
    // Big "OZAN BOMB!" text
    SI.Renderer.spawnFloatingText(SI.GAME_WIDTH / 2, SI.GAME_HEIGHT / 2, 'OZAN BOMB!', '#0ff');
    SI.Audio.playExplosion();
    SI.Renderer.triggerShake();
  },

  _gameOver: function() {
    this.state = 'GAME_OVER';
    this.player.active = false;
    SI.Audio.stopMusic();
    SI.Audio.playGameOver();

    // Explosion at player position
    SI.Renderer.spawnExplosion(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2,
      SI.COLORS.PLAYER
    );

    var isNewHigh = SI.Storage.setHighScore(this.score);
    this.highScore = SI.Storage.getHighScore();
    SI.Storage.clearSave();
    this._showGameOver(isNewHigh);
  },

  _pause: function() {
    this.state = 'PAUSED';
    SI.Audio.stopMusic();
    SI.Storage.saveGame(this._getStateSnapshot());
    document.getElementById('pause-overlay').classList.remove('hidden');
  },

  _unpause: function() {
    this.state = 'PLAYING';
    document.getElementById('pause-overlay').classList.add('hidden');
    SI.Audio.startMusic();
  },

  // --- Menu ---
  _bindMenuButtons: function() {
    var self = this;

    document.getElementById('btn-new-game').addEventListener('click', function() {
      SI.Audio.playMenuSelect();
      self.newGame();
    });

    document.getElementById('btn-continue').addEventListener('click', function() {
      SI.Audio.playMenuSelect();
      self.continueGame();
    });

    document.getElementById('btn-resume').addEventListener('click', function(e) {
      e.stopPropagation();
      SI.Audio.playMenuSelect();
      self._unpause();
    });

    document.getElementById('btn-quit').addEventListener('click', function(e) {
      e.stopPropagation();
      SI.Audio.playMenuSelect();
      document.getElementById('pause-overlay').classList.add('hidden');
      SI.Audio.stopMusic();
      self.state = 'MENU';
      self._showMenu();
    });

    document.getElementById('btn-play-again').addEventListener('click', function() {
      SI.Audio.playMenuSelect();
      self.newGame();
    });

    document.getElementById('btn-go-menu').addEventListener('click', function() {
      SI.Audio.playMenuSelect();
      self.state = 'MENU';
      document.getElementById('gameover-screen').classList.add('hidden');
      self._showMenu();
    });

    document.getElementById('btn-mute').addEventListener('click', function() {
      var muted = SI.Audio.toggleMute();
      this.textContent = 'SOUND: ' + (muted ? 'OFF' : 'ON');
      SI.Storage.saveSettings({ muted: muted });
    });
  },

  _showMenu: function() {
    this.highScore = SI.Storage.getHighScore();
    document.getElementById('menu-high-score').textContent = 'HIGH SCORE: ' + this.highScore;

    var continueBtn = document.getElementById('btn-continue');
    if (SI.Storage.hasSavedGame()) {
      continueBtn.classList.remove('hidden');
    } else {
      continueBtn.classList.add('hidden');
    }

    var muteBtn = document.getElementById('btn-mute');
    muteBtn.textContent = 'SOUND: ' + (SI.Audio.muted ? 'OFF' : 'ON');

    document.getElementById('menu-screen').classList.remove('hidden');
    document.getElementById('touch-controls').classList.add('hidden');
  },

  _showGameOver: function(isNewHigh) {
    document.getElementById('go-score').textContent = this.score;
    document.getElementById('go-wave').textContent = this.wave;
    document.getElementById('go-high').textContent = this.highScore;

    var newHighEl = document.getElementById('new-high-score');
    if (isNewHigh) {
      newHighEl.classList.remove('hidden');
    } else {
      newHighEl.classList.add('hidden');
    }

    document.getElementById('gameover-screen').classList.remove('hidden');
    document.getElementById('touch-controls').classList.add('hidden');
  },

  newGame: function() {
    SI.Storage.clearSave();
    this.score = 0;
    this.wave = 1;
    this.player = SI.Entities.createPlayer();
    this.boss = null;
    this.playerBullets = [];
    this.enemyBullets = [];
    this.powerUps = [];
    this._nextWaveIsBoss = false;
    this.ufo = null;
    this.ufoTimer = SI.UFO.SPAWN_INTERVAL_MIN + Math.random() * (SI.UFO.SPAWN_INTERVAL_MAX - SI.UFO.SPAWN_INTERVAL_MIN);

    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('touch-controls').classList.remove('hidden');
    SI.Renderer.resize();

    this._startWave(1);
  },

  continueGame: function() {
    var saved = SI.Storage.loadGame();
    if (!saved) {
      this.newGame();
      return;
    }

    this.score = saved.score;
    this.wave = saved.wave;
    this.player = SI.Entities.createPlayer();
    this.player.lives = saved.lives;
    this.player.x = saved.playerX;
    this.boss = null;
    this.playerBullets = [];
    this.enemyBullets = [];
    this.powerUps = [];
    this._nextWaveIsBoss = false;

    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('touch-controls').classList.remove('hidden');
    SI.Renderer.resize();

    // Restart current wave fresh (with saved lives/score)
    this._startWave(this.wave);
  },

  // --- Helpers ---
  _allEnemiesDead: function() {
    if (!this.enemyGrid || !this.enemyGrid.enemies) return false;
    for (var i = 0; i < this.enemyGrid.enemies.length; i++) {
      if (this.enemyGrid.enemies[i].active) return false;
    }
    return this.enemyGrid.enemies.length > 0;
  },

  _enemiesReachedBottom: function() {
    if (!this.enemyGrid || !this.enemyGrid.enemies) return false;
    for (var i = 0; i < this.enemyGrid.enemies.length; i++) {
      var e = this.enemyGrid.enemies[i];
      if (e.active && e.y + e.height >= this.player.y) {
        return true;
      }
    }
    return false;
  },

  _tryDropPowerUp: function(x, y) {
    if (Math.random() < SI.POWERUP.DROP_CHANCE) {
      this.powerUps.push(SI.Entities.createPowerUp(x, y));
    }
  },

  _cleanup: function() {
    this.playerBullets = this.playerBullets.filter(function(b) { return b.active; });
    this.enemyBullets = this.enemyBullets.filter(function(b) { return b.active; });
    this.powerUps = this.powerUps.filter(function(p) { return p.active; });
  },

  _getStateSnapshot: function() {
    return {
      wave: this.wave,
      score: this.score,
      player: this.player,
      enemyGrid: this.enemyGrid,
      shields: this.shields,
    };
  },

  _updateMusicTempo: function() {
    if (!this.enemyGrid || !this.enemyGrid.enemies) return;
    var total = this.enemyGrid.enemies.length;
    if (total === 0) return;
    var alive = 0;
    for (var i = 0; i < total; i++) {
      if (this.enemyGrid.enemies[i].active) alive++;
    }
    var ratio = alive / total;
    SI.Audio.setMusicTempo(120 + (1 - ratio) * 140);
  },

  // --- Render ---
  _render: function() {
    SI.Renderer.render({
      gameState: this.state,
      player: this.player,
      enemyGrid: this.enemyGrid,
      boss: this.boss,
      ufo: this.ufo,
      playerBullets: this.playerBullets,
      enemyBullets: this.enemyBullets,
      powerUps: this.powerUps,
      shields: this.shields,
      score: this.score,
      wave: this.wave,
      highScore: this.highScore,
      waveTransitionTimer: this.waveTransitionTimer,
      bossIntroTimer: this.bossIntroTimer,
      nextWaveIsBoss: this._nextWaveIsBoss,
    });
  },
};

// Bootstrap
document.addEventListener('DOMContentLoaded', function() {
  SI.Game.init();
});
