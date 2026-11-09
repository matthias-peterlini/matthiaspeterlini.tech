// The hero portrait: my Minecraft skin (El_Matthiass), rendered in 3D off-screen by skinview3d and
// redrawn as a field of small square particles. They fly in to assemble the figure, scatter away from
// the pointer, drift apart as the hero scrolls out, and the head follows the pointer. Drag to turn it.
(() => {
  const cv = document.getElementById('portrait'), hero = cv?.closest('.hero');
  if (!cv) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/skinview3d@3.4.2/bundles/skinview3d.bundle.js';
  s.async = true;
  s.onload = start;
  document.head.append(s);

  function start() {
    const GW = 68, GH = 112;                          // particle grid (columns × rows)
    const src = document.createElement('canvas');     // where skinview3d draws, never shown
    let v;
    try {
      v = new skinview3d.SkinViewer({ canvas: src, width: GW * 2, height: GH * 2, skin: '/skin.png', model: 'default', pixelRatio: 1, preserveDrawingBuffer: true });
    } catch { return; }                               // no WebGL: the hero just has no portrait
    v.background = null;
    v.fov = 30;
    v.zoom = .9;
    v.controls.enabled = false;
    v.renderPaused = true;                            // its own loop stops for an off-screen canvas, so frame() drives it
    let last = performance.now();
    const body = v.playerObject, head = body.skin.head;
    if (!still) v.animation = new skinview3d.IdleAnimation();
    window.portraitWave = () => {                     // intro.js calls this when the name lands
      if (still) return;
      v.animation = new skinview3d.WaveAnimation();
      setTimeout(() => { v.animation = new skinview3d.IdleAnimation(); }, 2400);
    };

    const small = document.createElement('canvas'); small.width = GW; small.height = GH;
    const sx = small.getContext('2d', { willReadFrequently: true });
    const ctx = cv.getContext('2d');

    // one particle per grid cell: offset from its home cell, velocity, how visible it is, and a drift direction
    const N = GW * GH, ox = new Float32Array(N), oy = new Float32Array(N), vx = new Float32Array(N), vy = new Float32Array(N);
    const vis = new Float32Array(N), ang = new Float32Array(N), spd = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      ang[i] = Math.random() * Math.PI * 2; spd[i] = .4 + Math.random() * .9;
      if (!still) { const r = 300 + Math.random() * 900; ox[i] = Math.cos(ang[i]) * r; oy[i] = Math.sin(ang[i]) * r; }
    }

    let W = 0, H = 0, cell = 0, x0 = 0, y0 = 0, dpr = 1, px = -1e4, py = -1e4, visible = true, running = false;
    let yaw = 0, pitch = 0, ty = 0, tp = 0, spin = 0, spinV = 0, drag = null;
    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      cell = Math.min(H * (W < 700 ? .74 : .86) / GH, W * .9 / GW);
      x0 = (W - GW * cell) / 2; y0 = H * (W < 700 ? .1 : .05);
    }
    new ResizeObserver(resize).observe(cv);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !running) { running = true; requestAnimationFrame(frame); } }).observe(cv);

    addEventListener('pointermove', e => {
      const b = cv.getBoundingClientRect();
      px = e.clientX - b.left; py = e.clientY - b.top;
      ty = Math.max(-1, Math.min(1, (px - W / 2) / (W / 2))) * .9;
      tp = Math.max(-1, Math.min(1, (py - (y0 + GH * cell * .15)) / (H / 2))) * .5;
      if (drag) { spinV = (e.clientX - drag) * .012; spin += spinV; drag = e.clientX; }
    }, { passive: true });
    cv.addEventListener('pointerdown', e => { drag = e.clientX; cv.classList.add('dragging'); });
    addEventListener('pointerup', () => { drag = null; cv.classList.remove('dragging'); });
    document.addEventListener('pointerleave', () => { px = py = -1e4; });

    const colors = new Map();
    const col = (r, g, b, up = 0) => {               // the skin's own colours, more saturated and lifted out of the black
      const k = (r >> 3) << 11 | (g >> 3) << 6 | (b >> 3) << 1 | up;
      let c = colors.get(k);
      if (!c) {
        const m = (r + g + b) / 3, f = v => Math.max(0, Math.min(255, (m + (v - m) * 1.7) * (up ? 1.3 : 1.2) + (up ? 150 : 62))) | 0;
        c = `rgb(${f(r)},${f(g)},${f(b)})`;
        colors.set(k, c);
      }
      return c;
    };

    function frame() {
      if (!visible) { running = false; return; }
      if (!W || document.documentElement.classList.contains('intro-on')) return requestAnimationFrame(frame);   // wait for the intro
      yaw += (ty - yaw) * .07; pitch += (tp - pitch) * .07;
      if (!drag) { spinV *= .94; spin += spinV; spin *= .985; }   // let go: it coasts, then turns back to face you
      body.rotation.y = -.3 + yaw * .35 + spin;
      head.rotation.y = yaw * .6; head.rotation.x = pitch;

      const now = performance.now(), steps = Math.max(1, Math.min(30, Math.round((now - last) / 16.7)));   // physics runs at 60 Hz whatever the frame rate
      v.animation?.update(body, Math.min(now - last, 50) / 1000); last = now;
      v.render();
      sx.clearRect(0, 0, GW, GH);
      sx.drawImage(src, 0, 0, GW, GH);
      const px_ = sx.getImageData(0, 0, GW, GH).data;

      const out = Math.max(0, Math.min(1, -hero.getBoundingClientRect().top / (H * .8)));   // 0 in view → 1 scrolled past
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const R = 40 + cell * 2, R2 = R * R;
      for (let i = 0; i < N; i++) {
        const a = px_[i * 4 + 3];
        vis[i] += ((a > 60 ? 1 : 0) - vis[i]) * Math.min(1, .25 * steps);
        const hx = x0 + (i % GW) * cell, hy = y0 + (i / GW | 0) * cell;
        // spring home, plus the scroll-out drift; every particle moves, so cells that light up later are already home
        const tx = Math.cos(ang[i]) * out * 420 * spd[i], tyy = Math.sin(ang[i]) * out * 260 * spd[i] - out * 160;
        for (let s = 0; s < steps; s++) {
          vx[i] += (tx - ox[i]) * .045; vy[i] += (tyy - oy[i]) * .045;
          const dx = hx + ox[i] - px, dy = hy + oy[i] - py, d2 = dx * dx + dy * dy;
          if (d2 < R2) { const f = (1 - d2 / R2) * 1.2 / Math.sqrt(d2 + 1); vx[i] += dx * f; vy[i] += dy * f; }
          vx[i] *= .82; vy[i] *= .82; ox[i] += vx[i]; oy[i] += vy[i];
        }
        if (vis[i] < .03) continue;
        const r = px_[i * 4], g = px_[i * 4 + 1], b = px_[i * 4 + 2], l = (r + g + b) / 765;
        // rim light: cells on the silhouette's edge glow, as if lit from behind
        const c = i % GW, edge = c === 0 || c === GW - 1 || px_[i * 4 - 1] <= 60 || px_[i * 4 + 7] <= 60 || px_[i * 4 - GW * 4 + 3] <= 60 || px_[i * 4 + GW * 4 + 3] <= 60;
        const sz = cell * (edge ? .74 : .55 + l * .3) * vis[i];
        ctx.globalAlpha = (1 - out * .85) * vis[i] * (1 - (i / GW | 0) / GH * .5);   // the spotlight fades towards the feet
        ctx.fillStyle = col(r, g, b, edge ? 1 : 0);
        ctx.fillRect(hx + ox[i] + (cell - sz) / 2, hy + oy[i] + (cell - sz) / 2, sz, sz);
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    }
    resize();
    if (!running) { running = true; requestAnimationFrame(frame); }
  }
})();
