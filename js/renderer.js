window.SI = window.SI || {};

SI.Renderer = {
  canvas: null,
  ctx: null,
  scale: 1,
  spriteCache: {},
  stars: [],
  particles: [],
  floatingTexts: [],
  shakeTimer: 0,

  init: function(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this._initStarfield();
    this._cacheSprites();
    this.resize();
    window.addEventListener('resize', this.resize.bind(this));
  },

  resize: function() {
    var container = this.canvas.parentElement;
    var controls = document.getElementById('touch-controls');
    var controlsH = controls ? controls.offsetHeight : 90;
    var w = container.clientWidth;
    var h = container.clientHeight - controlsH;

    var scaleX = w / SI.GAME_WIDTH;
    var scaleY = h / SI.GAME_HEIGHT;
    this.scale = Math.min(scaleX, scaleY);

    var dpr = window.devicePixelRatio || 1;
    this.canvas.width = SI.GAME_WIDTH * dpr;
    this.canvas.height = SI.GAME_HEIGHT * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  },

  // --- Starfield ---
  _initStarfield: function() {
    this.stars = [];
    for (var i = 0; i < SI.PARTICLES.STAR_COUNT; i++) {
      this.stars.push({
        x: Math.random() * SI.GAME_WIDTH,
        y: Math.random() * SI.GAME_HEIGHT,
        speed: SI.PARTICLES.STAR_SPEED_MIN + Math.random() * (SI.PARTICLES.STAR_SPEED_MAX - SI.PARTICLES.STAR_SPEED_MIN),
        size: Math.random() < 0.3 ? 2 : 1,
        brightness: 0.3 + Math.random() * 0.7,
      });
    }
  },

  updateStarfield: function(dt) {
    for (var i = 0; i < this.stars.length; i++) {
      var s = this.stars[i];
      s.y += s.speed * dt;
      if (s.y > SI.GAME_HEIGHT) {
        s.y = -2;
        s.x = Math.random() * SI.GAME_WIDTH;
      }
    }
  },

  _drawStarfield: function() {
    for (var i = 0; i < this.stars.length; i++) {
      var s = this.stars[i];
      var alpha = s.brightness;
      this.ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
      this.ctx.fillRect(Math.floor(s.x), Math.floor(s.y), s.size, s.size);
    }
  },

  // --- Sprite Caching ---
  _cacheSprites: function() {
    var names = Object.keys(SI.SPRITES);
    for (var n = 0; n < names.length; n++) {
      var name = names[n];
      var rows = SI.SPRITES[name];
      this.spriteCache[name] = {
        data: rows,
        width: rows[0].length,
        height: rows.length,
      };
    }
  },

  drawSprite: function(name, x, y, color, pixelSize) {
    var sprite = this.spriteCache[name];
    if (!sprite) return;
    var ps = pixelSize || 2;
    this.ctx.fillStyle = color;
    for (var r = 0; r < sprite.height; r++) {
      var row = sprite.data[r];
      for (var c = 0; c < sprite.width; c++) {
        if (row[c] === '1') {
          this.ctx.fillRect(
            Math.floor(x + c * ps),
            Math.floor(y + r * ps),
            ps, ps
          );
        }
      }
    }
  },

  // --- Entity Drawing ---
  drawPlayer: function(player) {
    if (!player.active) return;
    // Blink when invincible
    if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer * 10) % 2 === 0) return;
    this.drawSprite('PLAYER', player.x, player.y, SI.COLORS.PLAYER, 2);
  },

  drawUFO: function(ufo) {
    if (!ufo || !ufo.active) return;
    this.drawSprite('UFO', ufo.x, ufo.y, SI.COLORS.UFO, 2);
    // Glow effect
    this.ctx.shadowColor = SI.COLORS.UFO;
    this.ctx.shadowBlur = 8;
    this.ctx.shadowBlur = 0;
  },

  drawEnemies: function(grid) {
    if (!grid || !grid.enemies) return;
    for (var i = 0; i < grid.enemies.length; i++) {
      var e = grid.enemies[i];
      if (!e.active) continue;
      var spriteName = e.spriteName + (grid.animFrame ? '_B' : '_A');
      this.drawSprite(spriteName, e.x, e.y, e.color, e.pixelSize || 2);
    }
  },

  drawBoss: function(boss) {
    if (!boss || !boss.active) return;
    // Draw boss sprite
    this.drawSprite('BOSS', boss.x, boss.y, '#f44', 2.5);
    // HP bar
    var barW = SI.BOSS.WIDTH;
    var barH = 4;
    var barX = boss.x + (SI.BOSS.WIDTH * 2.5 - barW * 2.5) / 2;
    var barY = boss.y - 10;
    var ratio = boss.hp / boss.maxHp;
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(barX, barY, barW * 2, barH);
    this.ctx.fillStyle = ratio > 0.5 ? '#0f0' : ratio > 0.25 ? '#ff0' : '#f00';
    this.ctx.fillRect(barX, barY, barW * 2 * ratio, barH);
  },

  drawBullets: function(playerBullets, enemyBullets) {
    this.ctx.fillStyle = SI.COLORS.PLAYER_BULLET;
    for (var i = 0; i < playerBullets.length; i++) {
      var b = playerBullets[i];
      if (!b.active) continue;
      // Glow effect
      this.ctx.shadowColor = SI.COLORS.PLAYER_BULLET;
      this.ctx.shadowBlur = 6;
      this.ctx.fillRect(Math.floor(b.x), Math.floor(b.y), b.width, b.height);
      this.ctx.shadowBlur = 0;
    }
    this.ctx.fillStyle = SI.COLORS.ENEMY_BULLET;
    for (var j = 0; j < enemyBullets.length; j++) {
      var eb = enemyBullets[j];
      if (!eb.active) continue;
      this.ctx.shadowColor = SI.COLORS.ENEMY_BULLET;
      this.ctx.shadowBlur = 4;
      this.ctx.fillRect(Math.floor(eb.x), Math.floor(eb.y), eb.width, eb.height);
      this.ctx.shadowBlur = 0;
    }
  },

  drawShields: function(shields) {
    for (var s = 0; s < shields.length; s++) {
      var shield = shields[s];
      var cs = SI.SHIELD.CELL_SIZE;
      for (var r = 0; r < shield.cells.length; r++) {
        for (var c = 0; c < shield.cells[r].length; c++) {
          var hp = shield.cells[r][c];
          if (hp <= 0) continue;
          if (hp >= 3) this.ctx.fillStyle = SI.COLORS.SHIELD;
          else if (hp === 2) this.ctx.fillStyle = SI.COLORS.SHIELD_MED;
          else this.ctx.fillStyle = SI.COLORS.SHIELD_LOW;
          this.ctx.fillRect(
            Math.floor(shield.x + c * cs),
            Math.floor(shield.y + r * cs),
            cs, cs
          );
        }
      }
    }
  },

  drawPowerUps: function(powerUps) {
    for (var i = 0; i < powerUps.length; i++) {
      var pu = powerUps[i];
      if (!pu.active) continue;
      var color;
      switch (pu.type) {
        case 'rapid_fire': color = SI.COLORS.POWERUP_RAPID; break;
        case 'double_shot': color = SI.COLORS.POWERUP_DOUBLE; break;
        case 'shield_restore': color = SI.COLORS.POWERUP_SHIELD; break;
        case 'ozan_bomb': color = SI.COLORS.OZAN_BOMB; break;
        default: color = '#fff';
      }
      // Pulsing glow
      var pulse = 0.6 + 0.4 * Math.sin(pu.pulseTimer * 6);
      this.ctx.globalAlpha = pulse;
      this.ctx.fillStyle = color;
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 10;
      // Draw diamond shape
      var cx = pu.x + pu.width / 2;
      var cy = pu.y + pu.height / 2;
      var s = pu.width / 2;
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy - s);
      this.ctx.lineTo(cx + s, cy);
      this.ctx.lineTo(cx, cy + s);
      this.ctx.lineTo(cx - s, cy);
      this.ctx.closePath();
      this.ctx.fill();
      // Letter inside
      this.ctx.shadowBlur = 0;
      this.ctx.globalAlpha = 1;
      this.ctx.fillStyle = '#000';
      this.ctx.font = 'bold 10px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      var letter = pu.type === 'rapid_fire' ? 'R' : pu.type === 'double_shot' ? 'D' : pu.type === 'ozan_bomb' ? 'O' : 'S';
      this.ctx.fillText(letter, cx, cy);
    }
  },

  // --- Particles ---
  spawnExplosion: function(x, y, color) {
    for (var i = 0; i < SI.PARTICLES.EXPLOSION_COUNT; i++) {
      var angle = (Math.PI * 2 / SI.PARTICLES.EXPLOSION_COUNT) * i + Math.random() * 0.5;
      var speed = SI.PARTICLES.EXPLOSION_SPEED * (0.5 + Math.random() * 0.5);
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: SI.PARTICLES.EXPLOSION_LIFE,
        maxLife: SI.PARTICLES.EXPLOSION_LIFE,
        color: color,
        size: 2 + Math.random() * 2,
      });
    }
  },

  updateParticles: function(dt) {
    for (var i = this.particles.length - 1; i >= 0; i--) {
      var p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  },

  _drawParticles: function() {
    for (var i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];
      var alpha = p.life / p.maxLife;
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(
        Math.floor(p.x - p.size / 2),
        Math.floor(p.y - p.size / 2),
        Math.ceil(p.size),
        Math.ceil(p.size)
      );
    }
    this.ctx.globalAlpha = 1;
  },

  // --- Floating Text ---
  spawnFloatingText: function(x, y, text, color) {
    this.floatingTexts.push({
      x: x,
      y: y,
      text: text,
      color: color || '#fff',
      life: 1.5,
      maxLife: 1.5,
    });
  },

  updateFloatingTexts: function(dt) {
    for (var i = this.floatingTexts.length - 1; i >= 0; i--) {
      var ft = this.floatingTexts[i];
      ft.y -= 40 * dt;
      ft.life -= dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  },

  _drawFloatingTexts: function() {
    for (var i = 0; i < this.floatingTexts.length; i++) {
      var ft = this.floatingTexts[i];
      var alpha = ft.life / ft.maxLife;
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = ft.color;
      this.ctx.font = 'bold 18px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.shadowColor = ft.color;
      this.ctx.shadowBlur = 12;
      this.ctx.fillText(ft.text, ft.x, ft.y);
      this.ctx.shadowBlur = 0;
    }
    this.ctx.globalAlpha = 1;
  },

  // --- HUD ---
  drawHUD: function(score, lives, wave, highScore, activePowerUp) {
    this.ctx.font = '12px monospace';
    this.ctx.textBaseline = 'top';

    // Score (left)
    this.ctx.fillStyle = SI.COLORS.HUD_SCORE;
    this.ctx.textAlign = 'left';
    this.ctx.fillText('SCORE: ' + score, 10, 8);

    // High score (center)
    this.ctx.fillStyle = SI.COLORS.HUD_HIGH;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('HI: ' + highScore, SI.GAME_WIDTH / 2, 8);

    // Wave (right)
    this.ctx.fillStyle = SI.COLORS.WAVE_TEXT;
    this.ctx.textAlign = 'right';
    this.ctx.fillText('WAVE ' + wave, SI.GAME_WIDTH - 10, 8);

    // Lives (ship icons below score)
    for (var i = 0; i < lives; i++) {
      this.drawSprite('PLAYER', 10 + i * 22, 24, SI.COLORS.PLAYER, 1);
    }

    // Active power-up indicator
    if (activePowerUp) {
      var puColor;
      var puLabel;
      switch (activePowerUp.type) {
        case 'rapid_fire': puColor = SI.COLORS.POWERUP_RAPID; puLabel = 'RAPID'; break;
        case 'double_shot': puColor = SI.COLORS.POWERUP_DOUBLE; puLabel = 'DOUBLE'; break;
        case 'shield_restore': puColor = SI.COLORS.POWERUP_SHIELD; puLabel = 'SHIELD'; break;
        default: puColor = '#fff'; puLabel = '???';
      }
      var barX = SI.GAME_WIDTH - 80;
      var barY = 26;
      var barW = 70;
      var barH = 6;
      var ratio = activePowerUp.timeRemaining / SI.POWERUP.DURATION;
      this.ctx.fillStyle = '#222';
      this.ctx.fillRect(barX, barY, barW, barH);
      this.ctx.fillStyle = puColor;
      this.ctx.fillRect(barX, barY, barW * ratio, barH);
      this.ctx.font = '9px monospace';
      this.ctx.textAlign = 'right';
      this.ctx.fillStyle = puColor;
      this.ctx.fillText(puLabel, barX - 4, barY - 1);
    }
  },

  // --- Text Overlays ---
  drawWaveAnnouncement: function(waveNum, alpha) {
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = SI.COLORS.WAVE_TEXT;
    this.ctx.font = 'bold 48px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.shadowColor = SI.COLORS.WAVE_TEXT;
    this.ctx.shadowBlur = 20;
    this.ctx.fillText('WAVE ' + waveNum, SI.GAME_WIDTH / 2, SI.GAME_HEIGHT / 2 - (waveNum >= 10 ? 15 : 0));
    if (waveNum >= 10) {
      this.ctx.font = 'bold 16px monospace';
      this.ctx.fillStyle = '#ff0';
      this.ctx.shadowColor = '#ff0';
      this.ctx.fillText('OZAN IS PROUD', SI.GAME_WIDTH / 2, SI.GAME_HEIGHT / 2 + 25);
    }
    this.ctx.shadowBlur = 0;
    this.ctx.globalAlpha = 1;
  },

  drawBossWarning: function(alpha) {
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = '#f00';
    this.ctx.font = 'bold 40px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.shadowColor = '#f00';
    this.ctx.shadowBlur = 25;
    this.ctx.fillText('WARNING', SI.GAME_WIDTH / 2, SI.GAME_HEIGHT / 2 - 30);
    this.ctx.font = 'bold 24px monospace';
    this.ctx.fillText('BOSS APPROACHING', SI.GAME_WIDTH / 2, SI.GAME_HEIGHT / 2 + 15);
    this.ctx.shadowBlur = 0;
    this.ctx.globalAlpha = 1;
  },

  // --- Effects ---
  triggerShake: function() {
    this.canvas.classList.remove('shake');
    // Force reflow
    void this.canvas.offsetWidth;
    this.canvas.classList.add('shake');
    var canvas = this.canvas;
    setTimeout(function() { canvas.classList.remove('shake'); }, 150);
  },

  triggerFlash: function() {
    var container = document.getElementById('game-container');
    container.classList.remove('flash');
    void container.offsetWidth;
    container.classList.add('flash');
    setTimeout(function() { container.classList.remove('flash'); }, 300);
  },

  // --- Main Render ---
  render: function(state) {
    var ctx = this.ctx;
    // Clear
    ctx.fillStyle = SI.COLORS.BG;
    ctx.fillRect(0, 0, SI.GAME_WIDTH, SI.GAME_HEIGHT);

    // Starfield
    this._drawStarfield();

    // Game entities (only when relevant states)
    if (state.gameState !== 'MENU') {
      this.drawShields(state.shields || []);
      this.drawEnemies(state.enemyGrid);
      this.drawBoss(state.boss);
      this.drawUFO(state.ufo);
      this.drawBullets(state.playerBullets || [], state.enemyBullets || []);
      this.drawPowerUps(state.powerUps || []);
      this.drawPlayer(state.player);
      this._drawParticles();
      this._drawFloatingTexts();
      this.drawHUD(state.score, state.player ? state.player.lives : 0, state.wave, state.highScore, state.player ? state.player.activePowerUp : null);
    }

    // Wave announcement
    if (state.gameState === 'WAVE_TRANSITION') {
      var alpha = Math.min(1, state.waveTransitionTimer / 0.5);
      if (state.nextWaveIsBoss) {
        this.drawBossWarning(alpha);
      } else {
        this.drawWaveAnnouncement(state.wave, alpha);
      }
    }

    // Boss intro
    if (state.gameState === 'BOSS_INTRO') {
      var bAlpha = 0.5 + 0.5 * Math.sin(state.bossIntroTimer * 8);
      this.drawBossWarning(bAlpha);
    }
  },
};
