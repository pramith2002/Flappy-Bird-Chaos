import Phaser from 'phaser';
import { Bird } from '../objects/Bird.js';
import { PipeManager } from '../objects/PipeManager.js';
import { ChaosManager } from '../systems/ChaosManager.js';
import { UI } from '../main.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.state = 'menu';
    this.score = 0;
    this.bestScore = parseInt(localStorage.getItem('arrow_best_score') || '0', 10);
    this.maxSpeed = parseInt(localStorage.getItem('arrow_max_speed') || '0', 10);
    this.currentSpeed = 0;
    this.pipesCleared = 0;

    // Background
    this.bg = this.add.graphics();
    this.stars = [];
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Phaser.Math.Between(0, this.scale.width),
        y: Phaser.Math.Between(0, this.scale.height * 0.8),
        r: Phaser.Math.FloatBetween(0.5, 2.2),
        t: Phaser.Math.FloatBetween(0, Math.PI * 2)
      });
    }

    this.chaosManager = new ChaosManager(this);
    this.bird = new Bird(this, this.scale.width * 0.22, this.scale.height * 0.45);
    this.pipeManager = new PipeManager(this);

    this.pipeTimer = 0;
    this.nextSpawn = 60;

    // Particles
    this.particles = this.add.graphics();
    this.particleList = [];

    // Score HUD (center top)
    this.scoreText = this.add.text(this.scale.width / 2, 74, '0', {
      fontFamily: 'Outfit, system-ui', fontSize: '64px', fontStyle: '900', color: '#ffffff',
      stroke: '#334155', strokeThickness: 8
    }).setOrigin(0.5).setDepth(20);
    this.scoreTextShadow = this.add.text(this.scale.width / 2 + 2, 76, '0', {
      fontFamily: 'Outfit, system-ui', fontSize: '56px', fontStyle: 'bold', color: 'rgba(0,0,0,0)'
    }).setOrigin(0.5).setDepth(19);

    // Speed text (top-left)
    this.speedText = this.add.text(16, 16, 'SPEED: 0 MPH', {
      fontFamily: 'Outfit, system-ui', fontSize: '20px', fontStyle: 'bold', color: '#38bdf8',
      stroke: '#0f172a', strokeThickness: 4
    }).setOrigin(0, 0).setDepth(20).setVisible(false);

    this.menuBirds = [];

    // Speed roulette corner indicator (top-right)
    this.rouletteLabel = this.add.text(this.scale.width - 14, 14, '', {
      fontFamily: 'Outfit, system-ui', fontSize: '13px', fontStyle: 'bold', color: '#fde68a',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(1, 0).setDepth(25).setVisible(false);

    // Floaty hint label
    this.floatyHint = this.add.text(this.scale.width / 2, this.scale.height - 100, '🎈 Hold & drag to steer', {
      fontFamily: 'Outfit, system-ui', fontSize: '14px', color: '#a5f3fc',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(25).setVisible(false);

    // Wind Arrow
    this.windArrow = this.add.text(this.scale.width / 2, 120, '➔', {
      fontFamily: 'Outfit, system-ui', fontSize: '48px', color: '#7dd3fc',
      stroke: '#0f172a', strokeThickness: 6
    }).setOrigin(0.5).setDepth(20).setVisible(false);

    // Chaos Progress (bottom center)
    this.chaosProgressContainer = this.add.container(this.scale.width / 2, this.scale.height - 30).setDepth(30).setVisible(false);
    this.chaosProgressBg = this.add.graphics();
    this.chaosProgressFill = this.add.graphics();
    this.chaosProgressText = this.add.text(0, -15, '', {
      fontFamily: 'Outfit, system-ui', fontSize: '18px', fontStyle: 'bold', color: '#ffffff', stroke: '#0f172a', strokeThickness: 4
    }).setOrigin(0.5, 1);
    this.chaosProgressContainer.add([this.chaosProgressBg, this.chaosProgressFill, this.chaosProgressText]);

    this.scale.on('resize', this.onResize, this);
    this.resetToMenu();
  }

  onResize(gameSize) {
    this.pipeManager.updateGround();
    this.scoreText.setPosition(gameSize.width / 2, 74);
    this.scoreTextShadow.setPosition(gameSize.width / 2 + 2, 76);
    this.rouletteLabel.setPosition(gameSize.width - 14, 14);
    this.floatyHint.setPosition(gameSize.width / 2, gameSize.height - 100);
    this.windArrow.setPosition(gameSize.width / 2, 120);
    this.chaosProgressContainer.setPosition(gameSize.width / 2, gameSize.height - 30);
  }

  resetToMenu() {
    this.state = 'menu';
    this.score = 0;
    this.pipesCleared = 0;
    this.updateHUD();
    this.bird.container.setPosition(this.scale.width * 0.22, this.scale.height * 0.45);
    this.bird.body.velocity.y = 0;
    this.bird.trail = [];
    this.pipeManager.reset();
    this.chaosManager.reset();
    this.particleList = [];
    window.floatyHeld = false;
    window.floatyDragVY = 0;
    UI.showStartScreen();
  }

  startGame() {
    this.state = 'playing';
    this.score = 0;
    this.pipesCleared = 0;
    this.pipeTimer = 0;
    this.nextSpawn = 0;
    this.updateHUD();
    this.bird.container.setPosition(this.scale.width * 0.22, this.scale.height * 0.45);
    this.bird.body.velocity.y = 0;
    this.bird.trail = [];
    this.pipeManager.reset();
    this.chaosManager.reset();
    this.particleList = [];
    
    // Cleanup menu birds
    if (this.menuBirds) {
      this.menuBirds.forEach(b => { if (b && b.container) b.container.destroy(); });
      this.menuBirds = [];
    }

    window.floatyHeld = false;
    window.floatyDragVY = 0;
    // First flap to kick off (skip for floaty — drag controls it)
    if (this.chaosManager.activeId !== 'floaty') this.doFlap();
  }

  die() {
    if (this.state === 'dead') return;
    this.state = 'dead';
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('arrow_best_score', this.bestScore.toString());
    }
    if (this.currentSpeed > this.maxSpeed) {
      this.maxSpeed = this.currentSpeed;
      localStorage.setItem('arrow_max_speed', this.maxSpeed.toString());
    }
    this.spawnBurst(this.bird.container.x, this.bird.container.y, 0xf87171, 18);
    window.floatyHeld = false;
    window.floatyDragVY = 0;
    UI.showDeathScreen(this.score, this.bestScore);
  }

  doFlap() {
    if (this.state !== 'playing') return;
    const chaos = this.chaosManager.activeId;

    // Floaty: handled by hold-drag, no tap flap
    if (chaos === 'floaty') return;

    if (chaos === 'dash') {
      if (this.chaosManager.dashCooldown <= 0) {
        this.chaosManager.dashVX = 18;
        this.chaosManager.dashCooldown = 28;
        this.bird.flap(this.getFlapStrength() * 0.9);
        this.spawnBurst(this.bird.container.x, this.bird.container.y, 0xfb923c, 10);
      }
      return;
    }

    const gf = chaos === 'gravity_flip';
    this.bird.flap(gf ? -this.getFlapStrength() : this.getFlapStrength());
    this.spawnBurst(this.bird.container.x, this.bird.container.y, 0xfacc15, 6);
  }

  getDiff() { return Math.min(this.score / 30, 1); }
  getFlapStrength() { return -(5.0 - this.getDiff() * 0.4) * 60; }

  getBaseGravity() {
    const chaos = this.chaosManager.activeId;
    if (chaos === 'slow_mo') return (0.07 + this.getDiff() * 0.07) * 60;
    if (chaos === 'floaty')  return (0.025) * 60; // very gentle downward drift when released
    return (0.14 + this.getDiff() * 0.14) * 60;
  }

  getBasePipeSpd() {
    const chaos = this.chaosManager.activeId;
    if (chaos === 'speed_boost')    return 1.4 + this.getDiff() * 2.4 + 1.6;
    if (chaos === 'slow_mo')        return 0.6 + this.getDiff() * 0.8;
    if (chaos === 'speed_roulette') return this.chaosManager.rouletteSpeed;
    return 1.4 + this.getDiff() * 2.4;
  }

  getGapSize() {
    const chaos = this.chaosManager.activeId;
    if (chaos === 'pipe_narrow') return 130 + (1 - this.getDiff()) * 30;
    if (chaos === 'double_gap')  return 270;
    if (chaos === 'floaty')      return 230; // slightly wider — floating is hard enough
    return 260 - this.getDiff() * 85;
  }

  getNextPipeInterval() {
    const chaos = this.chaosManager.activeId;
    let base = 130 + (1 - this.getDiff()) * 60;

    if (chaos === 'speed_boost') {
      base = 55 + (1 - this.getDiff()) * 30;
    } else if (chaos) {
      // Increase distance by 50% during any chaos mode
      base *= 1.5;
    }

    return base * (0.8 + Math.random() * 0.7);
  }

  onPipePassed(pipe) {
    this.score++;
    this.pipesCleared++;
    this.updateHUD();
    this.spawnBurst(this.bird.container.x + 30, this.bird.container.y, 0x4ade80, 8);
    if (window.GAME_MODE === 'normal' && this.pipesCleared % 5 === 0) {
      this.chaosManager.trigger();
    }
  }

  updateHUD() {
    const playing = this.state === 'playing';
    this.scoreText.setVisible(playing);
    this.scoreTextShadow.setVisible(playing);
    this.speedText.setVisible(playing);
    if (playing) {
      this.scoreText.setText(this.score);
      this.scoreTextShadow.setText(this.score);
      this.speedText.setText(`SPEED: ${this.currentSpeed} MPH`);
    }
  }

  spawnBurst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 / n) * i + Math.random() * 0.5;
      const spd = 2 + Math.random() * 4;
      this.particleList.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 1, color, r: 3 + Math.random() * 4 });
    }
  }

  spawnChaosParticles(colorStr) {
    const color = Phaser.Display.Color.HexStringToColor(colorStr).color;
    const W = this.scale.width, H = this.scale.height;
    for (let i = 0; i < 35; i++) {
      this.particleList.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: Phaser.Math.FloatBetween(-5, 5), vy: Phaser.Math.FloatBetween(-5, 5),
        life: 1, color, r: 4 + Math.random() * 6
      });
    }
  }

  drawBackground(time) {
    const W = this.scale.width, H = this.scale.height;
    const chaos = this.chaosManager.activeId;
    this.bg.clear();

    if (chaos === 'matrix') {
      this.bg.fillStyle(0x000000, 1);
      this.bg.fillRect(0, 0, W, H);
      this.bg.fillStyle(0x4ade80, 0.4);
      for (let i = 0; i < 50; i++) {
        const x = (i * 25) % W;
        const y = (time * 0.15 + i * 130) % (H + 100) - 50;
        this.bg.fillRect(x, y, 4, 30 + (i % 20) * 2);
      }
      return; // Skip stars
    }

    if (chaos === 'disco') {
      const c1 = Phaser.Display.Color.HSVToRGB((time * 0.0008) % 1, 0.8, 1).color;
      const c2 = Phaser.Display.Color.HSVToRGB((time * 0.0008 + 0.3) % 1, 0.8, 1).color;
      this.bg.fillGradientStyle(c1, c1, c2, c2, 1);
      this.bg.fillRect(0, 0, W, H);
    } else {
      this.bg.fillGradientStyle(0xbae6fd, 0xbae6fd, 0x38bdf8, 0x38bdf8, 1);
      this.bg.fillRect(0, 0, W, H);
    }

    if (this.chaosManager.activeId === 'earthquake' &&
        (Math.abs(this.chaosManager.shakeX) + Math.abs(this.chaosManager.shakeY)) > 4) {
      this.bg.fillStyle(0xf97316, 0.12);
      this.bg.fillRect(0, 0, W, H);
    }

    // Floaty: tint the sky cyan-ish
    if (this.chaosManager.activeId === 'floaty') {
      this.bg.fillStyle(0x0e3855, 0.55);
      this.bg.fillRect(0, 0, W, H);
    }

    this.stars.forEach(s => {
      s.t += 0.035;
      const alpha = (0.3 + 0.7 * Math.sin(s.t)) * 0.65;
      this.bg.fillStyle(0xffffff, alpha);
      this.bg.fillCircle(s.x, s.y, s.r);
    });
  }

  drawParticles() {
    this.particles.clear();
    this.particleList.forEach(p => {
      this.particles.fillStyle(p.color, p.life * 0.9);
      this.particles.fillCircle(p.x, p.y, p.r * p.life);
    });
  }

  update(time, delta) {
    this.drawBackground(time);
    this.pipeManager.updateGround();

    if (this.state !== 'playing') {
      this.chaosManager.update(delta);
      this.rouletteLabel.setVisible(false);
      this.floatyHint.setVisible(false);
      this.windArrow.setVisible(false);
      this.chaosProgressContainer.setVisible(false);
      
      // Menu screen birds animation
      if (this.state === 'menu') {
        if (Math.random() < 0.015) {
          const b = new Bird(this, -50, Phaser.Math.Between(100, this.scale.height - 200));
          b.body.setAllowGravity(false);
          b.vx = 2 + Math.random() * 3;
          b.vy = (Math.random() - 0.5) * 1.5;
          this.menuBirds.push(b);
        }
        this.menuBirds.forEach(b => {
          b.container.x += b.vx;
          b.container.y += b.vy;
          b.update(time, delta);
        });
        this.menuBirds = this.menuBirds.filter(b => {
          if (b.container.x > this.scale.width + 50) {
            b.container.destroy();
            return false;
          }
          return true;
        });
      }
      return;
    }

    this.chaosManager.update(delta, time);
    const chaos = this.chaosManager.activeId;

    // Calculate current speed
    this.currentSpeed = Math.floor(this.getBasePipeSpd() * 20);
    this.updateHUD();

    // ── Speed Roulette corner label ───────────────────────
    if (chaos === 'speed_roulette') {
      const fast = this.chaosManager.rouletteFast;
      this.rouletteLabel.setText(fast ? '🐇 TURBO' : '🐢 SLOW');
      this.rouletteLabel.setColor(fast ? '#f59e0b' : '#818cf8');
      this.rouletteLabel.setVisible(true);
    } else {
      this.rouletteLabel.setVisible(false);
    }

    // ── Chaos Progress ────────────────────────────────────
    if (window.GAME_MODE === 'normal' && chaos) {
      this.chaosProgressContainer.setVisible(true);
      const fx = this.chaosManager.activeObj;
      this.chaosProgressText.setText(`${fx.emoji} ${fx.label}`);
      const pct = this.chaosManager.timer / this.chaosManager.duration;
      
      this.chaosProgressBg.clear();
      this.chaosProgressBg.fillStyle(0x0f172a, 0.6);
      this.chaosProgressBg.fillRoundedRect(-100, -5, 200, 10, 5);
      
      this.chaosProgressFill.clear();
      const color = Phaser.Display.Color.HexStringToColor(fx.color).color;
      this.chaosProgressFill.fillStyle(color, 1);
      this.chaosProgressFill.fillRoundedRect(-100, -5, Math.max(0, 200 * pct), 10, 5);
    } else {
      this.chaosProgressContainer.setVisible(false);
    }

    // ── Floaty hint ───────────────────────────────────────
    this.floatyHint.setVisible(chaos === 'floaty');

    // ── Floaty Bird: drag-to-fly mechanic ─────────────────
    if (chaos === 'floaty') {
      if (window.floatyHeld && Math.abs(window.floatyDragVY) > 0.5) {
        // Held + dragging: override velocity directly with drag
        this.bird.body.velocity.y = Phaser.Math.Linear(
          this.bird.body.velocity.y,
          window.floatyDragVY * 12,  // drag sensitivity
          0.25
        );
        window.floatyDragVY = 0; // consume each frame
      } else {
        // Not held / not dragging: gentle gravity drift + friction
        const floatGrav = this.getBaseGravity();
        this.bird.body.velocity.y += floatGrav * (delta / 16.66);
        // Gentle damping so it floats, not accelerates forever
        this.bird.body.velocity.y *= 0.97;
      }
      this.bird.body.velocity.y = Phaser.Math.Clamp(this.bird.body.velocity.y, -8 * 60, 5 * 60);
    } else {
      // ── Normal gravity ────────────────────────────────────
      const grav = chaos === 'gravity_flip' ? -this.getBaseGravity() : this.getBaseGravity();
      this.bird.body.velocity.y += grav * (delta / 16.66);
      const maxFall = (8 + this.getDiff() * 3) * 60;
      this.bird.body.velocity.y = Math.max(-11 * 60, Math.min(maxFall, this.bird.body.velocity.y));
    }

    // ── Wind ──────────────────────────────────────────────
    if (chaos === 'wind') {
      const wx = this.chaosManager.windForceX;
      const wy = this.chaosManager.windForceY;
      this.bird.container.x += wx * (delta / 16.66);
      this.bird.container.y += wy * (delta / 16.66);
      this.windArrow.setVisible(true);
      this.windArrow.setRotation(Math.atan2(wy, wx));
    } else {
      this.windArrow.setVisible(false);
      const diffX = this.scale.width * 0.22 - this.bird.container.x;
      this.bird.container.x += diffX * 0.05;
    }

    // Clamp X
    this.bird.container.x = Phaser.Math.Clamp(this.bird.container.x, 20, this.scale.width - 20);

    this.bird.update(time, delta);

    // ── Floor collision ───────────────────────────────────
    const gh = 55;
    if (this.bird.container.y + this.bird.body.radius > this.scale.height - gh) {
      if (chaos === 'bouncy_walls') {
        this.bird.container.y = this.scale.height - gh - this.bird.body.radius;
        this.bird.body.velocity.y = -Math.abs(this.bird.body.velocity.y) * 1.5 - 250;
        this.spawnBurst(this.bird.container.x, this.bird.container.y, 0xf43f5e, 10);
      } else {
        this.die(); return;
      }
    }

    // ── Ceiling ───────────────────────────────────────────
    if (this.bird.container.y - this.bird.body.radius < 0) {
      if (chaos === 'bouncy_walls') {
        this.bird.container.y = this.bird.body.radius;
        this.bird.body.velocity.y = Math.abs(this.bird.body.velocity.y) * 1.5 + 250;
        this.spawnBurst(this.bird.container.x, this.bird.container.y, 0xf43f5e, 10);
      } else if (chaos === 'gravity_flip') { 
        this.die(); return; 
      } else {
        this.bird.container.y = this.bird.body.radius;
        this.bird.body.velocity.y = Math.abs(this.bird.body.velocity.y);
      }
    }

    // ── Pipes ─────────────────────────────────────────────
    this.pipeTimer += (delta / 16.66);
    if (this.pipeTimer >= this.nextSpawn) {
      const p = this.pipeManager.spawnPipe(this.getGapSize());
      if (this.pipesCleared === 0 && this.pipeManager.pipes.length === 1) {
        // bring the first pipe closer so it happens soon
        p.x = this.scale.width; 
        p.cx = p.x;
      }
      this.pipeTimer = 0;
      this.nextSpawn = this.getNextPipeInterval();
    }
    this.pipeManager.updatePipes(time, delta, this.getBasePipeSpd(), this.bird);

    // ── Particles ─────────────────────────────────────────
    this.particleList.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life -= 0.022;
    });
    this.particleList = this.particleList.filter(p => p.life > 0);
    this.drawParticles();
  }
}
