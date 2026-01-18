// ============= SNOW EFFECT =============
class SnowEffect {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.running = false;
    this.opacity = 0;
    this.targetOpacity = 0;
    this.lastTime = 0;
    
    // Resize handler
    this.resizeObserver = new ResizeObserver(() => {
      this.canvas.width = window.innerWidth * window.devicePixelRatio;
      this.canvas.height = window.innerHeight * window.devicePixelRatio;
      if (this.running) this.render();
    });
    this.resizeObserver.observe(document.body);
    
    // Create 2000 snowflakes
    for (let i = 0; i < 2000; i++) {
      this.particles.push({
        x: Math.random(),
        y: Math.random(),
        vx: Math.random() - 0.5,
        vy: (1 + Math.random() * 10) / 10,
        freqx: 1 + Math.random() * 5,
        freqy: 1 + Math.random() * 5,
        size: 0.1 + Math.random() * 1.4,
        phasex: Math.random() * 2 * Math.PI,
        phasey: Math.random() * 2 * Math.PI
      });
    }
  }
  
  start() {
    this.targetOpacity = 1;
    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      this.animate();
    }
  }
  
  stop() {
    this.targetOpacity = 0;
  }
  
  toggle() {
    if (this.targetOpacity === 0) {
      this.start();
    } else {
      this.stop();
    }
  }
  
  destroy() {
    this.resizeObserver.disconnect();
    this.running = false;
  }
  
  animate() {
    requestAnimationFrame(() => {
      this.render();
      if (this.running) this.animate();
    });
  }
  
  render() {
    const shouldRender = Math.abs(this.opacity) > 1e-6 || this.targetOpacity !== 0;
    if (!shouldRender) return;
    
    this.opacity += (this.targetOpacity - this.opacity) * 0.05;
    
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const now = performance.now();
    const deltaTime = (now - this.lastTime) / 16;
    
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = this.opacity;

    // Dark snow on light theme, light snow on dark theme
    const isDarkTheme = document.body.getAttribute('data-theme') === 'dark';
    ctx.fillStyle = isDarkTheme ? '#e0e0e0' : '#333333';
    
    for (const p of this.particles) {
      const x = p.x * width;
      const y = p.y * height;
      const vx = 2 * p.vx / p.size / width;
      const vy = 2 * p.vy / p.size / height;
      
      const drawX = x + (width / 200) * Math.sin(p.freqx * now * vy + p.phasex);
      const drawY = y + (height / 200) * Math.sin(p.freqy * now * vx + p.phasey);
      
      ctx.beginPath();
      ctx.arc(drawX, drawY, p.size * window.devicePixelRatio, 0, 2 * Math.PI);
      ctx.fill();
      
      p.x += vx * deltaTime;
      p.y += vy * deltaTime;
      
      p.x = p.x % 1;
      p.y = p.y % 1;
      if (p.x < 0) p.x += 1;
      if (p.y < 0) p.y += 1;
    }
    
    this.lastTime = now;
  }
}

// Initialize and export snow effect
function initSnowEffect() {
  const snowCanvas = document.getElementById('snow-canvas');
  const snow = new SnowEffect(snowCanvas);

  document.getElementById('snow-menu-item').addEventListener('click', (e) => {
    e.preventDefault();
    snow.toggle();
  });

  return snow;
}
