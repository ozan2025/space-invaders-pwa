# Space Invaders PWA

## Project Overview
A retro-style Space Invaders game built as a Progressive Web App for iPhone.
Target user: 12-year-old playing on iPhone, primarily in portrait mode.

## Tech Stack
- Single-page PWA (HTML5 Canvas + vanilla JavaScript)
- Web Audio API for synthesized retro sounds
- Service Worker for offline play
- localStorage for game state persistence
- No frameworks, no build tools — keep it simple

## Game Features
- **Wave/level system** — progressively harder (faster enemies, more shooting, lower start, new enemy types)
- **Within-wave difficulty** — remaining enemies speed up as others are killed
- **Shield barriers** — degrade on hit
- **Boss enemies** — every few waves
- **Power-up drops** — rapid fire, double shot, shield
- **Score system** — with persistent high score
- **Lives system** — with ship icon indicators
- **Continue / New Game** — main menu with both options, game state saved to localStorage
- **Pause** — tap to pause mid-game
- **Game Over screen** — final score, wave reached, high score, play again
- **Wave announcements** — "WAVE 3" text between levels
- **Visual feedback** — screen shake on hit, flash on life lost
- **Touch controls** — left, right, fire (portrait optimized)

## PWA Requirements
- Service Worker caching all assets for offline play
- Web App Manifest with icons and splash screen config
- Full screen (no Safari address bar) when launched from home screen
- Portrait-optimized, still functional in landscape

## Deployment
- Local dev server + ngrok for HTTPS tunnel
- She loads once on iPhone via ngrok URL, installs to home screen
- Service worker caches everything, works offline after first load
- ngrok can be killed after installation

## Style
- Retro pixel art aesthetic (Canvas drawn sprites)
- Synthesized arcade sounds (Web Audio API)
- Starfield scrolling background
- Neon/bright colors on dark background
