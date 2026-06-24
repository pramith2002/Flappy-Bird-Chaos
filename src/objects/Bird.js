import Phaser from 'phaser';

export class Bird {
  constructor(scene, x, y) {
    this.scene = scene;
    this.chaosManager = scene.chaosManager;
    
    this.container = scene.add.container(x, y);
    this.graphics = scene.add.graphics();
    this.container.add(this.graphics);
    
    // Physics
    scene.physics.add.existing(this.container);
    this.body = this.container.body;
    this.body.setCircle(20, -20, -20);
    
    this.flapTimer = 0;
    this.trail = [];
  }
  
  drawBird(r, alphaMult, time) {
    this.graphics.clear();
    this.graphics.setAlpha(alphaMult);
    
    const chaos = this.chaosManager.activeId;

    if (chaos === 'matrix') {
      this.graphics.lineStyle(2, 0x4ade80, 1);
      this.graphics.strokeEllipse(0, 0, r*2, r*1.76);
      const wy = Math.sin(time * 0.005) * r * 0.4 * (this.flapTimer > 0 ? 1.6 : 1);
      this.graphics.strokeEllipse(-r*0.3, wy, r*1.04, r*0.6);
      this.graphics.strokeCircle(r*0.35, -r*0.2, r*0.3);
      return;
    }

    let bodyColor = 0xf59e0b;
    let wingColor = 0xfbbf24;
    let beakColor = 0xf97316;

    if (chaos === 'disco') {
      bodyColor = Phaser.Display.Color.HSVToRGB((time * 0.001) % 1, 1, 1).color;
      wingColor = Phaser.Display.Color.HSVToRGB((time * 0.001 + 0.1) % 1, 1, 1).color;
      beakColor = Phaser.Display.Color.HSVToRGB((time * 0.001 + 0.2) % 1, 1, 1).color;
    }

    // Trail
    this.trail.forEach((t, i) => {
      const ta = alphaMult * (i / this.trail.length) * 0.28;
      this.graphics.fillStyle(wingColor, ta);
      this.graphics.fillCircle(t.x - this.container.x, t.y - this.container.y, r * 0.5);
    });
    
    // Body
    this.graphics.fillStyle(bodyColor, 1);
    this.graphics.fillEllipse(0, 0, r*2, r*1.76);
    
    // Wing
    const wy = Math.sin(time * 0.005) * r * 0.4 * (this.flapTimer > 0 ? 1.6 : 1);
    this.graphics.fillStyle(wingColor, 1);
    this.graphics.fillEllipse(-r*0.3, wy, r*1.04, r*0.6);
    
    // Eye
    this.graphics.fillStyle(0xffffff, 1);
    this.graphics.fillCircle(r*0.35, -r*0.2, r*0.3);

    let px = r*0.42;
    let py = -r*0.18;
    if (chaos === 'drunk' || chaos === 'earthquake') {
      px += Math.cos(time * 0.02) * r * 0.15;
      py += Math.sin(time * 0.02) * r * 0.15;
    }

    this.graphics.fillStyle(0x0a0a0f, 1);
    this.graphics.fillCircle(px, py, r*0.15);
    this.graphics.fillStyle(0xffffff, 1);
    this.graphics.fillCircle(px + r*0.05, py - r*0.04, r*0.06);
    
    // Beak
    this.graphics.fillStyle(beakColor, 1);
    this.graphics.fillTriangle(r*0.7, -r*0.05, r*1.22, r*0.04, r*0.7, r*0.16);
  }
  
  update(time, delta) {
    if (this.flapTimer > 0) this.flapTimer -= delta;
    
    this.trail.push({ x: this.container.x, y: this.container.y });
    if (this.trail.length > 9) this.trail.shift();
    
    let r = 20;
    if (this.chaosManager.activeId === 'bird_huge') r = 36;
    if (this.chaosManager.activeId === 'bird_tiny') r = 10;
    
    let alpha = 1;
    if (this.chaosManager.activeId === 'invisible_bird') {
      alpha = 0.02 + 0.05 * Math.abs(Math.sin(time * 0.005));
    }
    
    // Drunk effect offset applied visually
    if (this.chaosManager.activeId === 'drunk') {
       this.graphics.x = Math.sin(this.chaosManager.drunkOffset) * 18;
    } else {
       this.graphics.x = 0;
    }
    
    this.drawBird(r, alpha, time);
    this.body.setCircle(r, -r, -r);
    
    const targetAngle = Math.max(-0.5, Math.min(1.3, this.body.velocity.y * 0.005));
    const flip = this.chaosManager.activeId === 'gravity_flip' ? -1 : 1;
    this.container.rotation = Phaser.Math.Linear(this.container.rotation, targetAngle * flip, 0.18);
    
    if (this.container.y - r < 0) {
      this.container.y = r;
      this.body.velocity.y = Math.abs(this.body.velocity.y);
    }
  }

  flap(strength) {
    this.body.velocity.y = strength;
    this.flapTimer = 150;
  }
}
