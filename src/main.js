import './style.css';
import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import { AudioManager } from './systems/AudioManager.js';

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: '#0a0a0f',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [GameScene]
};

export const game = new Phaser.Game(config);

// UI refs
const modeSelect    = document.getElementById('mode-select');
const startOverlay  = document.getElementById('start-overlay');
const deathOverlay  = document.getElementById('death-overlay');
const chaosBanner   = document.getElementById('chaos-banner');
const chaosEmoji    = document.getElementById('chaos-emoji');
const chaosText     = document.getElementById('chaos-text');
const btnModesStart = document.getElementById('btn-modes-start');
const btnModesDeath = document.getElementById('btn-modes-death');
const splashScreen  = document.getElementById('splash-screen');
const btnEnter      = document.getElementById('btn-enter');
const btnPlay       = document.getElementById('btn-play');
const btnRestart    = document.getElementById('btn-restart');
const btnCloseModes = document.getElementById('btn-close-modes');
const btnMute       = document.getElementById('btn-mute');
const speedSlider   = document.getElementById('starting-speed-slider');
const speedDisplay  = document.getElementById('speed-display');

window.STARTING_SPEED_MPH = 40;

let splashDismissed = false;

const TAUNTS = [
  "Skill issue detected.",
  "My grandma plays better! (and she's blind)",
  "Did you even try?",
  "Oof, that was painful to watch.",
  "You're supposed to dodge the pipes, not eat them.",
  "Gravity: 1, You: 0.",
  "Were your eyes closed?",
  "Error 404: Skills not found.",
  "Even the bird is disappointed in you."
];

export const UI = {
  showModeSelect() {
    modeSelect.classList.remove('hidden');
  },
  hideModeSelect() {
    modeSelect.classList.add('hidden');
  },
  showStartScreen() {
    if (!splashDismissed) {
      splashScreen.classList.remove('hidden');
      return;
    }
    AudioManager.playMenuMusic();
    modeSelect.classList.add('hidden');
    startOverlay.classList.remove('hidden');
    deathOverlay.classList.add('hidden');
    if (window.GAME_MODE === 'normal') {
      document.getElementById('start-title').textContent = 'FLAPPY';
      document.getElementById('start-title').style.color = '';
      document.getElementById('start-subtitle').textContent = 'CHAOS';
      document.getElementById('start-subtitle').style.color = '';
      document.getElementById('start-desc').textContent = 'Every 5 pipes = random madness';
    } else {
      const fx = CHAOS_EFFECTS.find(c => c.id === window.GAME_MODE);
      if (fx) {
        document.getElementById('start-title').textContent = fx.emoji;
        document.getElementById('start-title').style.color = fx.color;
        document.getElementById('start-subtitle').textContent = fx.label + ' MODE';
        document.getElementById('start-subtitle').style.color = fx.color;
        document.getElementById('start-desc').textContent = fx.desc;
      }
    }
    document.getElementById('start-best-score').textContent = localStorage.getItem('arrow_best_score') || '0';
    document.getElementById('start-max-speed').textContent = (localStorage.getItem('arrow_max_speed') || '0') + ' MPH';
  },
  showDeathScreen(score, best) {
    modeSelect.classList.add('hidden');
    startOverlay.classList.add('hidden');
    deathOverlay.classList.remove('hidden');
    AudioManager.playDeathStinger();
    document.getElementById('death-score').textContent = score;
    document.getElementById('death-best').textContent = best;
    document.getElementById('death-taunt').textContent = Phaser.Math.RND.pick(TAUNTS);
  },
  hideAll() {
    modeSelect.classList.add('hidden');
    startOverlay.classList.add('hidden');
    deathOverlay.classList.add('hidden');
    splashScreen.classList.add('hidden');
  },
  showBanner(emoji, text, color) {
    chaosEmoji.textContent = emoji;
    chaosText.textContent = text;
    chaosBanner.style.borderColor = `${color}66`;
    chaosBanner.style.color = color;
    chaosBanner.classList.add('show');
    setTimeout(() => chaosBanner.classList.remove('show'), 1900);
  }
};

// ── Mute Button ────────────────────────────────────────────────────────
(function initMuteBtn() {
  const muted = localStorage.getItem('fbc_muted') === 'true';
  btnMute.textContent = muted ? '🔇' : '🔊';
  if (muted) btnMute.classList.add('muted');
})();

btnMute.addEventListener('click', () => {
  const nowMuted = AudioManager.toggleMute();
  btnMute.textContent = nowMuted ? '🔇' : '🔊';
  btnMute.classList.toggle('muted', nowMuted);
});

btnEnter.addEventListener('click', () => {
  AudioManager.unlock();
  splashDismissed = true;
  splashScreen.classList.add('hidden');
  UI.showStartScreen();
});

// Speed slider
speedSlider.addEventListener('input', (e) => {
  window.STARTING_SPEED_MPH = parseInt(e.target.value, 10);
  speedDisplay.textContent = window.STARTING_SPEED_MPH;
});

btnModesStart.addEventListener('click', UI.showModeSelect);
btnModesDeath.addEventListener('click', UI.showModeSelect);
btnCloseModes.addEventListener('click', UI.hideModeSelect);

btnPlay.addEventListener('click', () => {
  UI.hideAll();
  AudioManager.stopMusic();
  AudioManager.playGameMusic(0);
  game.scene.getScene('GameScene').startGame();
});

btnRestart.addEventListener('click', () => {
  UI.hideAll();
  AudioManager.stopMusic();
  AudioManager.playGameMusic(0);
  game.scene.getScene('GameScene').startGame();
});

export const CHAOS_EFFECTS = [
  { id:'gravity_flip',   emoji:'🔄', label:'GRAVITY FLIP',    color:'#a78bfa', desc:'Gravity flips upside down' },
  { id:'speed_boost',    emoji:'⚡', label:'TURBO PIPES',     color:'#f59e0b', desc:'Pipes fly at you super fast' },
  { id:'bird_huge',      emoji:'🐔', label:'BIG BIRD',        color:'#fb923c', desc:'You are now absolutely enormous' },
  { id:'bird_tiny',      emoji:'🐤', label:'TINY BIRD',       color:'#34d399', desc:'Shrink to a ridiculous speck' },
  { id:'moving_pipes',   emoji:'🌊', label:'WAVY PIPES',      color:'#38bdf8', desc:'Pipes sway chaotically' },
  { id:'pipe_narrow',    emoji:'😬', label:'NEEDLE GAPS',     color:'#f87171', desc:'Gaps get razor thin — good luck' },
  { id:'double_gap',     emoji:'🎉', label:'MEGA GAPS',       color:'#4ade80', desc:'Giant gaps — easy street' },
  { id:'earthquake',     emoji:'🌍', label:'EARTHQUAKE',      color:'#f97316', desc:'Screen violently shakes' },
  { id:'slow_mo',        emoji:'🐌', label:'SLOW MOTION',     color:'#818cf8', desc:'Everything slows to a crawl' },
  { id:'ghost_pipes',    emoji:'👻', label:'GHOST PIPES',     color:'#e2e8f0', desc:'Pipes flicker invisible — still deadly' },
  { id:'wind',           emoji:'💨', label:'WIND STORM',      color:'#7dd3fc', desc:'Wind pushes you off course' },
  { id:'drunk',          emoji:'🍺', label:'DRUNK BIRD',      color:'#fbbf24', desc:'Bird weaves side to side uncontrollably' },
  { id:'dash',           emoji:'💥', label:'DASH MODE',       color:'#fb923c', desc:'Tap to dash — no flapping!' },
  { id:'floaty',         emoji:'🎈', label:'FLOATY BIRD',     color:'#a5f3fc', desc:'Hold & drag up/down to steer. Release to float freely.' },
  { id:'speed_roulette', emoji:'🎰', label:'SPEED ROULETTE',  color:'#fde68a', desc:'Speed randomly flips between turbo and crawl' },
  { id:'disco',          emoji:'🪩', label:'DISCO MODE',      color:'#e879f9', desc:'Crazy flashing colors & camera swaying!' },
  { id:'matrix',         emoji:'💻', label:'MATRIX MODE',     color:'#4ade80', desc:'You are the one. Dodge the code.' },
  { id:'bouncy_walls',   emoji:'🪀', label:'BOUNCY WALLS',    color:'#f43f5e', desc:'Hitting floor/ceiling violently bounces you!' },
];

window.GAME_MODE = 'normal';

// Floaty drag state (shared between pointer events and GameScene)
window.floatyHeld = false;
window.floatyLastY = 0;
window.floatyDragVY = 0; // velocity to apply this frame based on drag

// Build Chaos Cards
const chaosGrid = document.getElementById('mode-grid-chaos');
CHAOS_EFFECTS.forEach(fx => {
  const card = document.createElement('div');
  card.className = 'mode-card';
  card.style.borderColor = fx.color + '55';
  card.innerHTML = `<span class="emoji">${fx.emoji}</span><div class="name" style="color:${fx.color}">${fx.label}</div><div class="desc">${fx.desc}</div>`;
  card.addEventListener('click', () => {
    window.GAME_MODE = fx.id;
    UI.hideModeSelect();
    game.scene.getScene('GameScene').resetToMenu();
  });
  chaosGrid.appendChild(card);
});

document.querySelector('.normal-card').addEventListener('click', () => {
  window.GAME_MODE = 'normal';
  UI.hideModeSelect();
  game.scene.getScene('GameScene').resetToMenu();
});

// ── Input ──────────────────────────────────────────────
function getScene() { return game.scene.getScene('GameScene'); }
function isOverlay() { return !startOverlay.classList.contains('hidden') || !deathOverlay.classList.contains('hidden'); }

function handleStart(e) {
  if (!splashScreen.classList.contains('hidden')) return;
  if (!modeSelect.classList.contains('hidden')) return;
  if (e.target.tagName === 'BUTTON' || e.target.closest?.('.mode-card')) return;
  const scene = getScene();
  if (!scene) return;
  if (isOverlay()) return; // Let buttons handle starting the game
  // Floaty: begin hold-drag
  if (window.GAME_MODE === 'floaty' || scene.chaosManager?.activeId === 'floaty') {
    window.floatyHeld = true;
    window.floatyLastY = (e.clientY ?? e.touches?.[0]?.clientY) ?? 0;
    return;
  }
  scene.doFlap();
}

function handleMove(e) {
  if (!window.floatyHeld) return;
  const currentY = (e.clientY ?? e.touches?.[0]?.clientY) ?? window.floatyLastY;
  // deltaY per frame — we set dragVY which GameScene reads each frame
  window.floatyDragVY = (currentY - window.floatyLastY) * 8; // sensitivity
  window.floatyLastY = currentY;
}

function handleEnd() {
  window.floatyHeld = false;
  window.floatyDragVY = 0;
}

document.addEventListener('pointerdown',  handleStart, { passive: false });
document.addEventListener('pointermove',  handleMove,  { passive: true });
document.addEventListener('pointerup',    handleEnd);
document.addEventListener('pointercancel',handleEnd);

// Keyboard
let spaceHeld = false;
document.addEventListener('keydown', e => {
  if (!splashScreen.classList.contains('hidden')) return;
  if (!modeSelect.classList.contains('hidden')) return;
  if (['Enter', ' '].includes(e.key) && isOverlay()) {
    e.preventDefault();
    UI.hideAll(); 
    getScene().startGame(); 
    return; 
  }
  if (![' ', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
  if (isOverlay()) return;
  e.preventDefault();
  const scene = getScene();
  if (!scene) return;

  const isFloaty = window.GAME_MODE === 'floaty' || scene.chaosManager?.activeId === 'floaty';
  if (isFloaty) {
    if (!spaceHeld) {
      window.floatyHeld = true;
      window.floatyLastY = 0;
    }
    spaceHeld = true;
    // ArrowUp = drag up (negative), ArrowDown = drag down (positive)
    if (e.key === 'ArrowUp' || e.key === ' ') window.floatyDragVY = -18;
    if (e.key === 'ArrowDown')                 window.floatyDragVY =  18;
    return;
  }
  scene.doFlap();
});
document.addEventListener('keyup', e => {
  if ([' ', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
    spaceHeld = false;
    window.floatyHeld = false;
    window.floatyDragVY = 0;
  }
});
