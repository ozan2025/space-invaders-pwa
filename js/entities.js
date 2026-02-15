window.SI = window.SI || {};

SI.Entities = {

  // --- Player ---
  createPlayer: function() {
    return {
      x: SI.GAME_WIDTH / 2 - SI.PLAYER.WIDTH / 2,
      y: SI.GAME_HEIGHT - SI.PLAYER.Y_OFFSET,
      width: SI.PLAYER.WIDTH,
      height: SI.PLAYER.HEIGHT,
      speed: SI.PLAYER.SPEED,
      lives: SI.PLAYER.MAX_LIVES,
      fireCooldown: 0,
      fireRate: SI.PLAYER.FIRE_RATE,
      invincibleTimer: 0,
      activePowerUp: null,
      doubleShot: false,
      active: true,
    };
  },

  updatePlayer: function(player, dt, input) {
    if (!player.active) return;

    // Movement
    if (input.left) player.x -= player.speed * dt;
    if (input.right) player.x += player.speed * dt;

    // Clamp to screen
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > SI.GAME_WIDTH) player.x = SI.GAME_WIDTH - player.width;

    // Fire cooldown
    if (player.fireCooldown > 0) player.fireCooldown -= dt;

    // Invincibility
    if (player.invincibleTimer > 0) player.invincibleTimer -= dt;

    // Power-up timer
    if (player.activePowerUp) {
      player.activePowerUp.timeRemaining -= dt;
      if (player.activePowerUp.timeRemaining <= 0) {
        // Remove power-up effects
        player.fireRate = SI.PLAYER.FIRE_RATE;
        player.doubleShot = false;
        player.activePowerUp = null;
      }
    }
  },

  // --- Enemy Grid ---
  createEnemyGrid: function(config) {
    var enemies = [];
    var totalWidth = config.cols * SI.ENEMY_GRID.H_SPACING;
    var startX = (SI.GAME_WIDTH - totalWidth) / 2 + SI.ENEMY_GRID.H_SPACING / 2;

    for (var r = 0; r < config.rows; r++) {
      var type, spriteName, color, points, w, h;
      if (r === 0) {
        type = 'SQUID';
        spriteName = 'SQUID';
        color = SI.ENEMY_TYPES.SQUID.color;
        points = SI.ENEMY_TYPES.SQUID.points;
        w = SI.ENEMY_TYPES.SQUID.width;
        h = SI.ENEMY_TYPES.SQUID.height;
      } else if (r <= 2) {
        type = 'CRAB';
        spriteName = 'CRAB';
        color = SI.ENEMY_TYPES.CRAB.color;
        points = SI.ENEMY_TYPES.CRAB.points;
        w = SI.ENEMY_TYPES.CRAB.width;
        h = SI.ENEMY_TYPES.CRAB.height;
      } else {
        type = 'OCTOPUS';
        spriteName = 'OCTOPUS';
        color = SI.ENEMY_TYPES.OCTOPUS.color;
        points = SI.ENEMY_TYPES.OCTOPUS.points;
        w = SI.ENEMY_TYPES.OCTOPUS.width;
        h = SI.ENEMY_TYPES.OCTOPUS.height;
      }

      for (var c = 0; c < config.cols; c++) {
        enemies.push({
          row: r,
          col: c,
          type: type,
          spriteName: spriteName,
          color: color,
          points: points,
          x: startX + c * SI.ENEMY_GRID.H_SPACING - w / 2,
          y: config.startY + r * SI.ENEMY_GRID.V_SPACING,
          width: w,
          height: h,
          pixelSize: 2,
          active: true,
        });
      }
    }

    return {
      enemies: enemies,
      direction: 1,
      speed: config.speed,
      baseSpeed: config.speed,
      fireInterval: config.fireInterval,
      fireTimer: config.fireInterval,
      animFrame: 0,
      animTimer: 0,
      totalEnemies: enemies.length,
      killCount: 0,
    };
  },

  updateEnemyGrid: function(grid, dt) {
    if (!grid || !grid.enemies || grid.enemies.length === 0) return [];

    // Animation toggle
    grid.animTimer += dt;
    if (grid.animTimer > 0.5) {
      grid.animTimer = 0;
      grid.animFrame = grid.animFrame ? 0 : 1;
    }

    // Speed boost based on kills
    var effectiveSpeed = grid.baseSpeed * (1 + SI.ENEMY_GRID.SPEED_BOOST_PER_KILL * grid.killCount);

    // Move horizontally
    var dx = grid.direction * effectiveSpeed * dt;

    for (var i = 0; i < grid.enemies.length; i++) {
      var e = grid.enemies[i];
      if (!e.active) continue;
      e.x += dx;
    }

    // Check if any enemy hit the edge
    var minX = SI.GAME_WIDTH, maxX = 0;
    for (var i = 0; i < grid.enemies.length; i++) {
      var e = grid.enemies[i];
      if (!e.active) continue;
      if (e.x < minX) minX = e.x;
      if (e.x + e.width > maxX) maxX = e.x + e.width;
    }

    var hitEdge = minX <= SI.ENEMY_GRID.MARGIN_X || maxX >= SI.GAME_WIDTH - SI.ENEMY_GRID.MARGIN_X;

    // Drop and reverse — clamp enemies back within bounds to prevent cascading drops
    if (hitEdge) {
      var pushBack = 0;
      if (minX <= SI.ENEMY_GRID.MARGIN_X) {
        pushBack = SI.ENEMY_GRID.MARGIN_X - minX;
      } else {
        pushBack = (SI.GAME_WIDTH - SI.ENEMY_GRID.MARGIN_X) - maxX;
      }
      grid.direction *= -1;
      for (var j = 0; j < grid.enemies.length; j++) {
        if (grid.enemies[j].active) {
          grid.enemies[j].x += pushBack;
          grid.enemies[j].y += SI.ENEMY_GRID.DROP_DISTANCE;
        }
      }
    }

    // Enemy firing
    var newBullets = [];
    grid.fireTimer -= dt;
    if (grid.fireTimer <= 0) {
      grid.fireTimer = grid.fireInterval;
      // Find bottom-most active enemies per column
      var bottomEnemies = this._getBottomEnemies(grid);
      if (bottomEnemies.length > 0) {
        var shooter = bottomEnemies[Math.floor(Math.random() * bottomEnemies.length)];
        newBullets.push(this.createBullet(
          shooter.x + shooter.width / 2 - SI.BULLET.WIDTH / 2,
          shooter.y + shooter.height,
          SI.BULLET.ENEMY_SPEED,
          false
        ));
      }
    }

    return newBullets;
  },

  _getBottomEnemies: function(grid) {
    var colBottom = {};
    for (var i = 0; i < grid.enemies.length; i++) {
      var e = grid.enemies[i];
      if (!e.active) continue;
      if (!colBottom[e.col] || e.row > colBottom[e.col].row) {
        colBottom[e.col] = e;
      }
    }
    var result = [];
    var cols = Object.keys(colBottom);
    for (var c = 0; c < cols.length; c++) {
      result.push(colBottom[cols[c]]);
    }
    return result;
  },

  // --- Boss ---
  createBoss: function(waveNum) {
    var hp = SI.BOSS.BASE_HP + Math.floor(waveNum / SI.BOSS.APPEARS_EVERY) * SI.BOSS.HP_PER_CYCLE;
    return {
      x: SI.GAME_WIDTH / 2 - SI.BOSS.WIDTH * 2.5 / 2,
      y: -SI.BOSS.HEIGHT * 3,
      width: SI.BOSS.WIDTH * 2.5,
      height: SI.BOSS.HEIGHT * 2.5,
      hp: hp,
      maxHp: hp,
      speed: SI.BOSS.SPEED,
      direction: 1,
      fireTimer: SI.BOSS.FIRE_INTERVAL,
      active: true,
      entering: true,
      targetY: 40,
      moveTimer: 0,
    };
  },

  updateBoss: function(boss, dt) {
    if (!boss || !boss.active) return [];

    // Entry animation
    if (boss.entering) {
      boss.y += 60 * dt;
      if (boss.y >= boss.targetY) {
        boss.y = boss.targetY;
        boss.entering = false;
      }
      return [];
    }

    // Side-to-side movement with sine wave
    boss.moveTimer += dt;
    boss.x += Math.cos(boss.moveTimer * 1.5) * boss.speed * dt;

    // Clamp
    if (boss.x < 10) boss.x = 10;
    if (boss.x + boss.width > SI.GAME_WIDTH - 10) boss.x = SI.GAME_WIDTH - 10 - boss.width;

    // Firing
    var newBullets = [];
    boss.fireTimer -= dt;
    if (boss.fireTimer <= 0) {
      boss.fireTimer = SI.BOSS.FIRE_INTERVAL;
      var cx = boss.x + boss.width / 2;
      var by = boss.y + boss.height;
      // 3-spread shot
      newBullets.push(this.createBullet(cx - 1, by, SI.BULLET.BOSS_SPEED, false));
      newBullets.push(this.createBullet(cx - 20, by, SI.BULLET.BOSS_SPEED, false));
      newBullets.push(this.createBullet(cx + 18, by, SI.BULLET.BOSS_SPEED, false));
    }

    return newBullets;
  },

  // --- Bullets ---
  createBullet: function(x, y, speed, isPlayer) {
    return {
      x: x,
      y: y,
      width: SI.BULLET.WIDTH,
      height: SI.BULLET.HEIGHT,
      speed: speed,
      isPlayer: isPlayer,
      active: true,
    };
  },

  updateBullets: function(bullets, dt) {
    for (var i = 0; i < bullets.length; i++) {
      var b = bullets[i];
      if (!b.active) continue;
      b.y += b.speed * dt;
      if (b.y < -20 || b.y > SI.GAME_HEIGHT + 20) {
        b.active = false;
      }
    }
  },

  // --- Shields ---
  createShields: function() {
    var shields = [];
    var totalWidth = SI.SHIELD.COUNT * SI.SHIELD.WIDTH;
    var gap = (SI.GAME_WIDTH - totalWidth) / (SI.SHIELD.COUNT + 1);

    for (var s = 0; s < SI.SHIELD.COUNT; s++) {
      var sx = gap + s * (SI.SHIELD.WIDTH + gap);
      var cells = [];
      for (var r = 0; r < SI.SHIELD_SHAPE.length; r++) {
        var row = [];
        for (var c = 0; c < SI.SHIELD_SHAPE[r].length; c++) {
          row.push(SI.SHIELD_SHAPE[r][c] === '1' ? SI.SHIELD.MAX_HP : 0);
        }
        cells.push(row);
      }
      shields.push({
        x: sx,
        y: SI.SHIELD.Y_POSITION,
        width: SI.SHIELD_SHAPE[0].length * SI.SHIELD.CELL_SIZE,
        height: SI.SHIELD_SHAPE.length * SI.SHIELD.CELL_SIZE,
        cells: cells,
      });
    }
    return shields;
  },

  damageShieldAt: function(shield, hitX, hitY) {
    var cs = SI.SHIELD.CELL_SIZE;
    var col = Math.floor((hitX - shield.x) / cs);
    var row = Math.floor((hitY - shield.y) / cs);
    if (row < 0 || row >= shield.cells.length) return false;
    if (col < 0 || col >= shield.cells[row].length) return false;
    if (shield.cells[row][col] <= 0) return false;
    shield.cells[row][col]--;
    return true;
  },

  // --- Power-ups ---
  createPowerUp: function(x, y) {
    var types = SI.POWERUP.TYPES;
    return {
      x: x,
      y: y,
      width: SI.POWERUP.WIDTH,
      height: SI.POWERUP.HEIGHT,
      type: Math.random() < SI.POWERUP.OZAN_BOMB_CHANCE ? 'ozan_bomb' : types[Math.floor(Math.random() * (types.length - 1))],
      speed: SI.POWERUP.FALL_SPEED,
      active: true,
      pulseTimer: 0,
    };
  },

  updatePowerUps: function(powerUps, dt) {
    for (var i = 0; i < powerUps.length; i++) {
      var pu = powerUps[i];
      if (!pu.active) continue;
      pu.y += pu.speed * dt;
      pu.pulseTimer += dt;
      if (pu.y > SI.GAME_HEIGHT + 20) {
        pu.active = false;
      }
    }
  },

  applyPowerUp: function(player, type, shields) {
    // Remove previous power-up effects
    player.fireRate = SI.PLAYER.FIRE_RATE;
    player.doubleShot = false;

    switch (type) {
      case 'rapid_fire':
        player.fireRate = SI.PLAYER.RAPID_FIRE_RATE;
        player.activePowerUp = { type: type, timeRemaining: SI.POWERUP.DURATION };
        break;
      case 'double_shot':
        player.doubleShot = true;
        player.activePowerUp = { type: type, timeRemaining: SI.POWERUP.DURATION };
        break;
      case 'shield_restore':
        // Restore one random damaged shield cell
        if (shields && shields.length > 0) {
          var damaged = [];
          for (var s = 0; s < shields.length; s++) {
            for (var r = 0; r < shields[s].cells.length; r++) {
              for (var c = 0; c < shields[s].cells[r].length; c++) {
                var maxHp = SI.SHIELD_SHAPE[r] && SI.SHIELD_SHAPE[r][c] === '1' ? SI.SHIELD.MAX_HP : 0;
                if (maxHp > 0 && shields[s].cells[r][c] < maxHp) {
                  damaged.push({ shield: s, row: r, col: c });
                }
              }
            }
          }
          // Restore up to 20 random cells
          for (var i = 0; i < Math.min(20, damaged.length); i++) {
            var idx = Math.floor(Math.random() * damaged.length);
            var d = damaged[idx];
            shields[d.shield].cells[d.row][d.col] = SI.SHIELD.MAX_HP;
            damaged.splice(idx, 1);
          }
        }
        // No timed effect for shield restore
        break;
      case 'ozan_bomb':
        // Handled in game.js — clears all enemies on screen
        break;
    }
  },

  // --- UFO (Mystery Ship) ---
  createUFO: function() {
    var goingRight = Math.random() > 0.5;
    return {
      x: goingRight ? -SI.UFO.WIDTH : SI.GAME_WIDTH,
      y: 38,
      width: SI.UFO.WIDTH,
      height: SI.UFO.HEIGHT,
      speed: goingRight ? SI.UFO.SPEED : -SI.UFO.SPEED,
      points: SI.UFO.POINTS,
      active: true,
    };
  },

  updateUFO: function(ufo, dt) {
    if (!ufo || !ufo.active) return;
    ufo.x += ufo.speed * dt;
    if (ufo.x < -SI.UFO.WIDTH * 2 || ufo.x > SI.GAME_WIDTH + SI.UFO.WIDTH) {
      ufo.active = false;
    }
  },
};
