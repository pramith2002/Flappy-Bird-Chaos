import Phaser from 'phaser';

export class PipeManager {
  constructor(scene) {
    this.scene = scene;
    this.chaosManager = scene.chaosManager;
    this.pipes = [];

    this.ground = scene.add.graphics();
    this.ground.setDepth(5);
  }

  updateGround() {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;
    const gh = 55;

    this.ground.clear();
    this.ground.fillStyle(0x713f12, 1);
    this.ground.fillRect(0, H - gh, W, gh);
    this.ground.fillStyle(0xa16207, 1);
    this.ground.fillRect(0, H - gh, W, 10);
    this.ground.fillStyle(0x15803d, 1);
    for (let i = 0; i < W; i += 18) {
      this.ground.fillRect(i, H - gh - 2, 3, 6);
      this.ground.fillRect(i + 18 * 0.4, H - gh - 4, 2, 8);
    }
  }

  spawnPipe(gapSize) {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;
    const gh = 55;
    const minY = 70;
    const maxY = H - gh - gapSize - 50;

    const gapY        = Phaser.Math.Between(minY, maxY);
    const waveOffset  = Math.random() * Math.PI * 2;
    const hue         = Math.floor(Math.random() * 360);
    const pipeGraphics = this.scene.add.graphics();

    const pipe = { x: W + 60, gapY, gap: gapSize, passed: false, waveOffset, hue, graphics: pipeGraphics, cx: W + 60 };
    this.pipes.push(pipe);
    return pipe;
  }

  updatePipes(time, delta, speed, bird) {
    const H = this.scene.scale.height;
    const gh = 55, pw = 60, hw = pw / 2;

    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const p = this.pipes[i];
      p.x -= speed * (delta / 16.66);

      const waving = this.chaosManager.activeId === 'moving_pipes';
      const wx = waving ? Math.sin(time * 0.002 + p.waveOffset) * 45 : 0;
      p.cx = p.x + wx;

      this.drawPipe(p, H, gh, pw, hw, time);

      if (!p.passed && p.x < bird.container.x) {
        p.passed = true;
        this.scene.onPipePassed(p);
      }

      // Collision
      const r = bird.body.radius * 0.74;
      if (Math.abs(bird.container.x - p.cx) < hw + r) {
        if (bird.container.y - r < p.gapY || bird.container.y + r > p.gapY + p.gap) {
          this.scene.die();
        }
      }

      if (p.x < -pw * 2) {
        p.graphics.destroy();
        this.pipes.splice(i, 1);
      }
    }
  }

  drawPipe(p, H, gh, pw, hw, time) {
    const g = p.graphics;
    g.clear();

    const chaos = this.chaosManager.activeId;
    const ghost = chaos === 'ghost_pipes';
    
    let fc = 0x22c55e;
    let dc = 0x15803d;

    if (chaos === 'disco') {
      fc = Phaser.Display.Color.HSVToRGB((time * 0.002 + p.hue / 360) % 1, 1, 1).color;
      dc = Phaser.Display.Color.HSVToRGB((time * 0.002 + p.hue / 360 + 0.1) % 1, 1, 0.8).color;
    } else if (chaos === 'matrix') {
      const ghostAlpha = ghost ? 0.13 + 0.22 * Math.abs(Math.sin(time * 0.003 + p.waveOffset)) : 1;
      g.setAlpha(ghostAlpha);
      
      const cap = 24;
      const drawOneMatrix = (py, ph, capTop) => {
        if (ph <= 0) return;
        g.lineStyle(2, 0x4ade80, 1);
        g.strokeRect(p.cx - hw, py, pw, ph);
        const capY = capTop ? py + ph - cap : py;
        g.strokeRect(p.cx - hw - 8, capY, pw + 16, cap);
      };
      drawOneMatrix(0, p.gapY, true);
      drawOneMatrix(p.gapY + p.gap, H - gh - (p.gapY + p.gap), false);
      return;
    }

    const ghostAlpha = ghost ? 0.13 + 0.22 * Math.abs(Math.sin(time * 0.003 + p.waveOffset)) : 1;
    g.setAlpha(ghostAlpha);

    const cap = 24;
    const drawOne = (py, ph, capTop) => {
      if (ph <= 0) return;
      g.fillStyle(fc, 1);
      g.fillRoundedRect(p.cx - hw, py, pw, ph, 4);
      g.fillStyle(0xffffff, 0.13);
      g.fillRect(p.cx - hw + 7, py + 4, 9, ph - 8);
      const capY = capTop ? py + ph - cap : py;
      g.fillStyle(dc, 1);
      g.fillRoundedRect(p.cx - hw - 8, capY, pw + 16, cap, 5);
      g.fillStyle(fc, 1);
      g.fillRect(p.cx - hw - 1, capY + 5, 11, cap - 10);
    };

    drawOne(0, p.gapY, true);
    drawOne(p.gapY + p.gap, H - gh - (p.gapY + p.gap), false);
  }

  reset() {
    this.pipes.forEach(p => p.graphics.destroy());
    this.pipes = [];
  }
}
