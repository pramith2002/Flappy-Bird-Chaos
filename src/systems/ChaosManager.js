import Phaser from 'phaser';
import { UI, CHAOS_EFFECTS } from '../main.js';
import { AudioManager } from './AudioManager.js';

export class ChaosManager {
  constructor(scene) {
    this.scene = scene;
    this.activeId  = null;
    this.activeObj = null;
    this.timer     = 0;
    this.duration  = 310;

    this.shakeX = 0; this.shakeY = 0;
    this.tilt = 0; this.tiltTarget = 0;
    this.drunkOffset = 0;
    this.windForceX = 0; this.windForceY = 0;
    this.windTargetX = 0; this.windTargetY = 0;
    this.dashVX = 0; this.dashCooldown = 0;

    // Speed roulette
    this.rouletteSpeed  = 1.4;
    this.rouletteTimer  = 0;
    this.rouletteFast   = false;
  }

  trigger(id) {
    if (id) {
      this.activeObj = CHAOS_EFFECTS.find(c => c.id === id);
    } else {
      const pool = CHAOS_EFFECTS.filter(c => c.id !== this.activeId);
      this.activeObj = Phaser.Math.RND.pick(pool);
    }
    this.activeId  = this.activeObj.id;
    this.timer     = this.duration;

    if (window.GAME_MODE === 'normal') {
      UI.showBanner(this.activeObj.emoji, this.activeObj.label, this.activeObj.color);
    }
    this.scene.spawnChaosParticles(this.activeObj.color);
    AudioManager.playChaosActivate();

    // Side-effects on trigger
    if (this.activeId === 'wind') {
      const angle    = Math.random() * Math.PI * 2;
      const strength = Phaser.Math.FloatBetween(2.5, 4.5);
      this.windTargetX = Math.cos(angle) * strength;
      this.windTargetY = Math.sin(angle) * strength;
      this.windForceX  = 0; this.windForceY = 0;
    }
    if (this.activeId === 'drunk') this.drunkOffset = 0;
    if (this.activeId === 'dash')  { this.dashVX = 0; this.dashCooldown = 0; }
    if (this.activeId === 'speed_roulette') {
      const baseMult = (window.STARTING_SPEED_MPH || 40) / 20;
      this.rouletteSpeed = baseMult; this.rouletteTimer = 0; this.rouletteFast = false;
    }
  }

  update(delta, time) {
    // Expire chaos in normal mode
    if (window.GAME_MODE === 'normal' && this.activeId) {
      this.timer -= (delta / 16.66);
      if (this.timer <= 0) {
        this.activeId  = null;
        this.activeObj = null;
        this.windForceX = 0; this.windForceY = 0;
        this.windTargetX = 0; this.windTargetY = 0;
      }
    }

    // Earthquake
    if (this.activeId === 'earthquake') {
      const intensity = 9 * (window.GAME_MODE === 'normal' ? this.timer / this.duration : 0.7);
      this.shakeX = Phaser.Math.FloatBetween(-intensity, intensity);
      this.shakeY = Phaser.Math.FloatBetween(-intensity, intensity);
    } else {
      this.shakeX = Phaser.Math.Linear(this.shakeX, 0, 0.2);
      this.shakeY = Phaser.Math.Linear(this.shakeY, 0, 0.2);
    }

    if (this.activeId === 'drunk') this.drunkOffset += 0.045;

    // Dash
    if (this.activeId === 'dash') {
      if (this.dashCooldown > 0) this.dashCooldown -= (delta / 16.66);
      if (this.dashVX > 0) {
        this.scene.pipeManager.pipes.forEach(p => { p.x -= this.dashVX; });
        this.dashVX = Phaser.Math.Linear(this.dashVX, 0, 0.22);
        if (this.dashVX < 0.5) this.dashVX = 0;
      }
    } else {
      this.dashVX = 0; this.dashCooldown = 0;
    }

    // Wind
    if (this.activeId === 'wind') {
      this.windForceX = Phaser.Math.Linear(this.windForceX, this.windTargetX, 0.018);
      this.windForceY = Phaser.Math.Linear(this.windForceY, this.windTargetY, 0.018);
      if (Math.random() < 0.015) {
        const angle = Math.random() * Math.PI * 2;
        const strength = Phaser.Math.FloatBetween(2.5, 4.5);
        this.windTargetX = Math.cos(angle) * strength;
        this.windTargetY = Math.sin(angle) * strength;
      }
    } else {
      this.windForceX = Phaser.Math.Linear(this.windForceX, 0, 0.1);
      this.windForceY = Phaser.Math.Linear(this.windForceY, 0, 0.1);
    }

    // Speed roulette — flip every ~60 frames, no center banner (corner label handles it)
    if (this.activeId === 'speed_roulette') {
      this.rouletteTimer += (delta / 16.66);
      if (this.rouletteTimer > 65) {
        this.rouletteTimer = 0;
        this.rouletteFast  = !this.rouletteFast;
        const diff = this.scene.getDiff();
        const baseMult = (window.STARTING_SPEED_MPH || 40) / 20;
        this.rouletteSpeed = this.rouletteFast
          ? baseMult + diff * 2.4 + 2.2   // turbo
          : baseMult * 0.3;               // crawl
        AudioManager.playSpeedChange(this.rouletteFast);
      }
    }

    // Camera Sway for Disco
    if (this.activeId === 'disco' && time) {
      this.tiltTarget = Math.sin(time * 0.004) * 12; // 12 degree sway
    } else {
      this.tiltTarget = 0;
    }
    this.tilt = Phaser.Math.Linear(this.tilt, this.tiltTarget, 0.08);

    // Camera
    this.scene.cameras.main.scrollX  = this.shakeX;
    this.scene.cameras.main.scrollY  = this.shakeY;
    this.scene.cameras.main.setRotation(this.tilt * Math.PI / 180);
  }

  reset() {
    this.activeId = null; this.activeObj = null; this.timer = 0;
    this.shakeX = 0; this.shakeY = 0;
    this.tilt = 0; this.tiltTarget = 0;
    this.drunkOffset = 0;
    this.windForceX = 0; this.windForceY = 0;
    this.windTargetX = 0; this.windTargetY = 0;
    this.dashVX = 0; this.dashCooldown = 0;
    const baseMult = (window.STARTING_SPEED_MPH || 40) / 20;
    this.rouletteSpeed = baseMult; this.rouletteTimer = 0; this.rouletteFast = false;

    this.scene.cameras.main.setZoom(1);
    this.scene.cameras.main.setRotation(0);
    this.scene.cameras.main.scrollX = 0;
    this.scene.cameras.main.scrollY = 0;

    if (window.GAME_MODE !== 'normal') {
      this.trigger(window.GAME_MODE);
    }
  }
}
