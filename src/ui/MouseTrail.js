
/**
 * MouseTrail.js
 * Creates a premium "fairy dust" particle effect following the mouse.
 */

class MouseTrail {
  constructor() {
    this.particles = [];
    this.mouse = { x: 0, y: 0 };
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    
    this.init();
  }

  init() {
    // Setup Canvas
    this.canvas.id = "mouse-trail-canvas";
    this.canvas.style.position = "fixed";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.pointerEvents = "none";
    this.canvas.style.zIndex = "9999";
    document.body.appendChild(this.canvas);

    this.resize();
    window.addEventListener("resize", () => this.resize());
    window.addEventListener("mousemove", (e) => this.onMouseMove(e));

    // Start Loop
    this.animate();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  onMouseMove(e) {
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;
    
    // Spawn particles on move
    this.spawnParticle(this.mouse.x, this.mouse.y);
  }

  spawnParticle(x, y) {
    const size = Math.random() * 3 + 1;
    this.particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      size: size,
      life: 1.0,
      color: `hsla(${Math.random() * 60 + 30}, 100%, 70%, 1)` // Gold/Yellow spectrum
    });
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        p.size *= 0.96;

        if (p.life <= 0) {
            this.particles.splice(i, 1);
            i--;
            continue;
        }

        this.ctx.fillStyle = p.color.replace('1)', p.life + ')');
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
    }

    requestAnimationFrame(() => this.animate());
  }
}

// Auto-init when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    new MouseTrail();
});
