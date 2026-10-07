// 3D view of the GitHub contribution calendar: one column per day, drawn on a canvas.
// Shared by the English and Italian pages; the page calls renderCity(days) once the data arrives.
(() => {
  const cv = document.getElementById('city');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const tip = document.getElementById('city-tip');
  const wrap = document.getElementById('city-wrap');
  const flat = document.querySelector('.cal-scroll');
  const lang = document.documentElement.lang;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HINT = tip.textContent;
  const PITCH = .48, SIN = Math.sin(PITCH), COS = Math.cos(PITCH);   // camera elevation
  const RANGE = .35;                            // how far a drag may turn the city either way

  const label = (n, date) => {
    const d = new Date(date + 'T00:00:00Z').toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    return lang === 'it' ? `${n} contribut${n === 1 ? 'o' : 'i'} il ${d}` : `${n} contribution${n === 1 ? '' : 's'} on ${d}`;
  };

  // Colours follow the theme: the same five levels as the 2D legend, mixed from --surface-hi to --primary.
  const hex = v => { v = v.trim().slice(1); if (v.length === 3) v = [...v].map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16)); };
  let levels = [];
  function readColors() {
    const css = getComputedStyle(document.documentElement);
    const a = hex(css.getPropertyValue('--surface-hi')), b = hex(css.getPropertyValue('--primary'));
    levels = [0, .3, .55, .78, 1].map(t => a.map((v, i) => v + (b[i] - v) * t));
  }
  const rgb = (c, f) => `rgb(${c.map(v => Math.min(255, v * f) | 0)})`;

  let boxes = [], weeks = 0, w = 0, h = 0, scale = 1, hmax = 6, YAW = -.3;
  let yaw = YAW, dragYaw = null, grow = still ? 1 : 0, born = 0, hot = null, polys = [];
  let visible = false, running = false;

  function layout() {
    if (!cv.clientWidth) return;
    const r = devicePixelRatio || 1;
    w = cv.clientWidth; h = cv.clientHeight;
    cv.width = w * r; cv.height = h * r; ctx.setTransform(r, 0, 0, r, 0, 0);
    // Narrow screens look along the city diagonally so it fills more of the canvas.
    YAW = w < 640 ? -.95 : -.3;
    yaw = YAW;
    // Column height (in tile units) is set once from the default view; the zoom then follows the angle.
    const [width, depth] = extent(YAW);
    const s = Math.min(w * .94 / width, h * .9 / (depth * SIN + 4 * COS));
    hmax = Math.min(12, Math.max(4, (h * .9 / s - depth * SIN) / COS));
    scale = fit(YAW);
  }

  // Width and depth of the footprint seen from angle a, and the zoom that fits it plus the tallest column.
  function extent(a) {
    const c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
    return [weeks * c + 7 * s, weeks * s + 7 * c];
  }
  function fit(a) {
    const [width, depth] = extent(a);
    return Math.min(w * .94 / width, h * .9 / (depth * SIN + hmax * COS));
  }

  function draw(now) {
    if (!still && dragYaw === null) yaw += (YAW + Math.sin(now / 2600) * .14 - yaw) * .03;
    if (dragYaw !== null) yaw = dragYaw;
    if (grow < 1 && born) grow = Math.min(1, (now - born) / 1400);

    scale += (fit(yaw) - scale) * (still ? 1 : .25);
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const rot = (x, z) => [x * cy - z * sy, x * sy + z * cy];
    const ox = w / 2, oy = h / 2 + hmax * COS * scale / 2;   // centre footprint + tallest column
    const P = (x, y, z) => { const [xr, zr] = rot(x, z); return [ox + xr * scale, oy + zr * SIN * scale - y * COS * scale]; };

    ctx.clearRect(0, 0, w, h);
    polys = [];
    const order = boxes.map(b => ({ b, depth: rot(b.x, b.z)[1] })).sort((p, q) => p.depth - q.depth);
    const g = .42;                                  // half footprint: leaves a small gap between columns
    for (const { b } of order) {
      const t = Math.max(0, Math.min(1, grow * 1.6 - b.wk / weeks * .6));
      const e = 1 - (1 - t) ** 3;
      const y = b.c ? (.2 + (hmax - .2) * (b.c / boxes.max) ** .6) * e : .08;
      const col = levels[b.l], lit = b === hot ? 1.25 : 1;
      const c = [[-g, -g], [g, -g], [g, g], [-g, g]].map(([dx, dz]) => [b.x + dx, b.z + dz]);
      const shapes = [];
      // side faces whose outward normal points at the viewer
      for (let i = 0; i < 4; i++) {
        const [x1, z1] = c[i], [x2, z2] = c[(i + 1) % 4];
        const [nxr, nzr] = rot((z2 - z1) / (2 * g), (x1 - x2) / (2 * g));   // unit outward normal
        if (nzr <= 1e-6) continue;
        const f = (.62 - .2 * nxr) * lit;                                     // light from the left
        shapes.push([[P(x1, 0, z1), P(x2, 0, z2), P(x2, y, z2), P(x1, y, z1)], rgb(col, f)]);
      }
      shapes.push([c.map(([x, z]) => P(x, y, z)), rgb(col, lit)]);
      for (const [pts, fill] of shapes) {
        ctx.beginPath(); pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath();
        ctx.fillStyle = fill; ctx.fill();
        polys.push([pts, b]);
      }
    }
  }

  function loop(now) {
    draw(now);
    if (visible && !wrap.hidden && (!still || grow < 1 || dragYaw !== null)) requestAnimationFrame(loop);
    else running = false;
  }
  function kick() { if (!running && boxes.length) { running = true; requestAnimationFrame(loop); } }

  // Hit-testing: last drawn polygon on top wins.
  const inside = ([x, y], pts) => {
    let ok = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ok = !ok;
    }
    return ok;
  };
  function pick(e) {
    const r = cv.getBoundingClientRect(), p = [e.clientX - r.left, e.clientY - r.top];
    for (let i = polys.length - 1; i >= 0; i--) if (inside(p, polys[i][0])) return polys[i][1];
    return null;
  }
  function show(b) {
    hot = b;
    tip.textContent = b ? label(b.c, b.date) : HINT;
    if (still) draw(performance.now());
  }

  let downX = 0, downYaw = 0, moved = false;
  cv.addEventListener('pointerdown', e => {
    downX = e.clientX; downYaw = yaw; moved = false;
    dragYaw = yaw; cv.setPointerCapture(e.pointerId); cv.classList.add('dragging'); kick();
  });
  cv.addEventListener('pointermove', e => {
    if (dragYaw === null) { if (e.pointerType === 'mouse') show(pick(e)); return; }
    if (Math.abs(e.clientX - downX) > 4) moved = true;
    dragYaw = Math.max(YAW - RANGE, Math.min(YAW + RANGE, downYaw + (e.clientX - downX) * .006));
  });
  const release = (e, tap) => {
    if (dragYaw === null) return;
    dragYaw = null; cv.classList.remove('dragging');
    if (tap && !moved) show(pick(e));
    if (still) draw(performance.now());
  };
  cv.addEventListener('pointerup', e => release(e, true));
  cv.addEventListener('pointercancel', e => release(e, false));   // e.g. the page scrolled instead
  cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && dragYaw === null) show(null); });

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !born && boxes.length) born = performance.now();
    kick();
  }).observe(cv);
  new ResizeObserver(() => { if (boxes.length) { layout(); draw(performance.now()); } }).observe(cv);
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { readColors(); draw(performance.now()); });

  // 3D / 2D switch
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    const three = btn.dataset.view === '3d';
    document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', b === btn));
    wrap.hidden = !three; flat.hidden = three;
    if (three) { layout(); kick(); } else flat.scrollLeft = flat.scrollWidth;
  }));

  window.renderCity = days => {
    const pad = new Date(days[0].date).getUTCDay();
    weeks = Math.ceil((days.length + pad) / 7);
    boxes = days.map((d, i) => {
      const wk = Math.floor((i + pad) / 7), dow = (i + pad) % 7;
      return { x: wk - (weeks - 1) / 2, z: dow - 3, wk, c: d.count, l: d.level, date: d.date };
    });
    boxes.max = Math.max(1, ...days.map(d => d.count));
    readColors(); layout();
    if (visible) born = performance.now();
    kick();
  };
})();
