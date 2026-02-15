window.SI = window.SI || {};

SI.VERSION = 'v8';

// Virtual game dimensions (all logic uses these coords)
SI.GAME_WIDTH = 390;
SI.GAME_HEIGHT = 700;

// Player config
SI.PLAYER = {
  WIDTH: 30,
  HEIGHT: 20,
  SPEED: 230,
  FIRE_RATE: 0.35,
  RAPID_FIRE_RATE: 0.12,
  MAX_LIVES: 3,
  INVINCIBLE_TIME: 2.0,
  Y_OFFSET: 50,
};

// Bullet config
SI.BULLET = {
  WIDTH: 3,
  HEIGHT: 12,
  PLAYER_SPEED: -480,
  ENEMY_SPEED: 220,
  BOSS_SPEED: 260,
};

// Enemy types
SI.ENEMY_TYPES = {
  SQUID:   { points: 30, width: 22, height: 16, color: '#ff0' },
  CRAB:    { points: 20, width: 24, height: 16, color: '#0f0' },
  OCTOPUS: { points: 10, width: 24, height: 16, color: '#f0f' },
};

// Enemy grid config
SI.ENEMY_GRID = {
  COLS: 8,
  ROWS: 5,
  H_SPACING: 36,
  V_SPACING: 32,
  BASE_SPEED: 28,
  SPEED_INCREASE_PER_WAVE: 5,
  SPEED_BOOST_PER_KILL: 0.025,
  DROP_DISTANCE: 10,
  FIRE_INTERVAL_BASE: 2.0,
  FIRE_INTERVAL_MIN: 0.3,
  START_Y_BASE: 55,
  START_Y_DROP_PER_WAVE: 6,
  START_Y_MAX: 180,
  MARGIN_X: 5,
};

// Boss config
SI.BOSS = {
  WIDTH: 56,
  HEIGHT: 36,
  BASE_HP: 10,
  HP_PER_CYCLE: 3,
  SPEED: 55,
  POINTS: 500,
  FIRE_INTERVAL: 1.2,
  APPEARS_EVERY: 5,
};

// UFO (mystery ship) config
SI.UFO = {
  WIDTH: 36,
  HEIGHT: 16,
  SPEED: 100,
  POINTS: 100,
  SPAWN_INTERVAL_MIN: 15,
  SPAWN_INTERVAL_MAX: 30,
};

// Shield config
SI.SHIELD = {
  COUNT: 4,
  WIDTH: 44,
  HEIGHT: 32,
  Y_POSITION: 560,
  CELL_SIZE: 4,
  MAX_HP: 3,
};

// Power-up config
SI.POWERUP = {
  DROP_CHANCE: 0.08,
  FALL_SPEED: 85,
  WIDTH: 18,
  HEIGHT: 18,
  DURATION: 8.0,
  TYPES: ['rapid_fire', 'double_shot', 'shield_restore', 'ozan_bomb'],
  OZAN_BOMB_CHANCE: 0.03,
};

// Particle config
SI.PARTICLES = {
  EXPLOSION_COUNT: 14,
  EXPLOSION_SPEED: 140,
  EXPLOSION_LIFE: 0.6,
  STAR_COUNT: 60,
  STAR_SPEED_MIN: 20,
  STAR_SPEED_MAX: 80,
};

// Colors
SI.COLORS = {
  BG: '#000',
  PLAYER: '#0ff',
  PLAYER_BULLET: '#0f0',
  ENEMY_BULLET: '#f44',
  BOSS_BULLET: '#fa0',
  SHIELD: '#0a0',
  SHIELD_MED: '#070',
  SHIELD_LOW: '#040',
  POWERUP_RAPID: '#ff0',
  POWERUP_DOUBLE: '#f0f',
  POWERUP_SHIELD: '#0f0',
  HUD_TEXT: '#fff',
  HUD_SCORE: '#fff',
  HUD_HIGH: '#ff0',
  WAVE_TEXT: '#0ff',
  UFO: '#f0f',
  OZAN_BOMB: '#0ff',
};

// Sprite pixel data (each row separated by |, 1=filled 0=empty)
// These get decoded and cached as offscreen canvases
SI.SPRITES = {
  PLAYER: [
    '000000010000000',
    '000000111000000',
    '000000111000000',
    '011111111111110',
    '111111111111111',
    '111111111111111',
    '111011111110111',
    '111000000000111',
  ],
  SQUID_A: [
    '00000110000',
    '00001111000',
    '00011111100',
    '01101111011',
    '11111111111',
    '00101001010',
    '01010000101',
    '10100000010',
  ],
  SQUID_B: [
    '00000110000',
    '00001111000',
    '00011111100',
    '01101111011',
    '11111111111',
    '00010110100',
    '00101001010',
    '01010000101',
  ],
  CRAB_A: [
    '010000000010',
    '001000000100',
    '001111111100',
    '011011011110',
    '111111111111',
    '101111111101',
    '101000000101',
    '000110011000',
  ],
  CRAB_B: [
    '010000000010',
    '101000000101',
    '101111111101',
    '111011011110',
    '111111111111',
    '001111111100',
    '001000000100',
    '010000000010',
  ],
  OCTOPUS_A: [
    '000011111100000',
    '001111111111000',
    '011111111111100',
    '111001111001110',
    '111111111111110',
    '000111000111000',
    '001100111001100',
    '110000000000011',
  ],
  OCTOPUS_B: [
    '000011111100000',
    '001111111111000',
    '011111111111100',
    '111001111001110',
    '111111111111110',
    '000111000111000',
    '001001111001000',
    '000100000010000',
  ],
  UFO: [
    '000001111111000000',
    '000111111111110000',
    '011111111111111100',
    '101101101101101010',
    '111111111111111110',
    '001111111111111000',
    '000011111111100000',
  ],
  BOSS: [
    '0000001111111100000000',
    '0000111111111111100000',
    '0011111111111111111000',
    '0111100111110011110100',
    '1111111111111111111110',
    '1111111111111111111110',
    '1111111111111111111110',
    '0110011001100110011000',
    '0011000000000000110000',
  ],
};

// Shield shape template (1=solid, 0=empty)
SI.SHIELD_SHAPE = [
  '00011111111100',
  '01111111111110',
  '11111111111111',
  '11111111111111',
  '11111111111111',
  '11111111111111',
  '11100000000111',
  '11000000000011',
];

// Wave config generator
SI.WAVES = {
  getConfig: function(waveNum) {
    return {
      rows: Math.min(5 + Math.floor((waveNum - 1) / 3), 7),
      cols: SI.ENEMY_GRID.COLS,
      speed: SI.ENEMY_GRID.BASE_SPEED + (waveNum - 1) * SI.ENEMY_GRID.SPEED_INCREASE_PER_WAVE,
      fireInterval: Math.max(
        SI.ENEMY_GRID.FIRE_INTERVAL_BASE - (waveNum - 1) * 0.15,
        SI.ENEMY_GRID.FIRE_INTERVAL_MIN
      ),
      startY: Math.min(
        SI.ENEMY_GRID.START_Y_BASE + (waveNum - 1) * SI.ENEMY_GRID.START_Y_DROP_PER_WAVE,
        SI.ENEMY_GRID.START_Y_MAX
      ),
      isBossWave: waveNum % SI.BOSS.APPEARS_EVERY === 0,
    };
  },
};
