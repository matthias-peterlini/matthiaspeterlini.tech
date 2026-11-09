// Projects as a bending WebGL strip: page scroll slides the covers sideways, covers curl as they
// reach the edges and split into RGB while moving. The cards in #work stay the source of truth —
// without WebGL, or with reduced motion, the plain grid is shown instead.
(() => {
  const work = document.getElementById('work');
  if (!work || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cards = [...work.querySelectorAll('.card')];
  const cv = document.createElement('canvas');
  const gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true });
  if (!gl || cards.length < 2) return;

  const ita = document.documentElement.lang === 'it';
  const n = cards.length, h2 = work.querySelector('h2');
  const strip = document.createElement('div');
  strip.className = 'strip';
  strip.style.setProperty('--n', n - 1);
  strip.innerHTML = `<div class="strip-pin"><div class="strip-stage"></div>
    <div class="strip-bar"><div class="strip-cap"></div>
    <div class="strip-nav"><button type="button" data-d="-1" aria-label="${ita ? 'Progetto precedente' : 'Previous project'}">←</button>
    <span class="strip-count"></span>
    <button type="button" data-d="1" aria-label="${ita ? 'Progetto successivo' : 'Next project'}">→</button></div></div></div>`;
  const pin = strip.firstElementChild, cap = strip.querySelector('.strip-cap'), count = strip.querySelector('.strip-count');
  pin.prepend(h2);
  cv.setAttribute('aria-hidden', 'true');
  strip.querySelector('.strip-stage').append(cv);
  work.append(strip);
  work.classList.add('strip-on');

  // ---------- GL setup ----------
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, `
    attribute vec2 aPos;
    uniform vec2 uView;   // stage size, css px
    uniform vec4 uRect;   // centre x, centre y, width, height (css px, origin at stage centre)
    uniform float uVel, uHover, uFlat;
    varying vec2 vUv;
    void main() {
      vUv = aPos;
      vec2 p = (aPos - .5) * uRect.zw * (1. + .05 * uHover) + uRect.xy;
      float nx = p.x / (uView.x * .5);                 // -1 … 1 across the stage
      float ax = abs(nx);
      p.y += nx * ax * ax * uView.y * .13;             // the strip rises to the right, sinks to the left
      p.y += uVel * sin(aPos.x * 3.14159) * uRect.w * .22;  // bows while it moves
      float f = max(ax - uFlat, 0.);                   // flat in the middle (on phones, the whole centred card)
      float z = -f * f * uRect.z * 1.4 - abs(uVel) * 60.; // and folds away at the edges, the middle stays flat
      float d = uView.y * 1.207;                       // camera distance for a 45° vertical fov
      gl_Position = vec4(p.x / (uView.x * .5), p.y / (uView.y * .5), 0., (d - z) / d);
    }`));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, `
    precision mediump float;
    uniform sampler2D uTex;
    uniform vec2 uFit, uSize;
    uniform float uShift, uAlpha, uRadius;
    varying vec2 vUv;
    vec3 tex(vec2 uv) { return texture2D(uTex, (uv - .5) * uFit + .5).rgb; }
    void main() {
      vec2 o = vec2(uShift, 0.);
      vec3 c = vec3(tex(vUv + o).r, tex(vUv).g, tex(vUv - o).b);
      vec2 q = abs(vUv - .5) * uSize - (uSize * .5 - uRadius);
      float a = clamp(.5 - (length(max(q, 0.)) - uRadius), 0., 1.) * uAlpha;
      gl_FragColor = vec4(c * a, a);
    }`));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { undo(); return; }
  gl.useProgram(prog);
  const U = {};
  ['uView', 'uRect', 'uVel', 'uHover', 'uFlat', 'uTex', 'uFit', 'uSize', 'uShift', 'uAlpha', 'uRadius']
    .forEach(k => U[k] = gl.getUniformLocation(prog, k));

  // subdivided unit plane so the vertex shader can bend it
  const SX = 32, SY = 12, verts = [], idx = [];
  for (let y = 0; y <= SY; y++) for (let x = 0; x <= SX; x++) verts.push(x / SX, y / SY);
  for (let y = 0; y < SY; y++) for (let x = 0; x < SX; x++) {
    const a = y * (SX + 1) + x, b = a + 1, c = a + SX + 1, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  // ---------- one entry per project ----------
  const items = cards.map(card => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([40, 44, 48, 255]));
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(p => gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    const item = { card, tex: t, aspect: 1.6, hover: 0, href: card.querySelector('a.link')?.href };
    const cover = card.querySelector('img.cover'), art = card.querySelector('.cover.art img');
    const img = new Image();
    img.src = (cover || art).currentSrc || (cover || art).src;
    img.decode().then(() => {
      let src = img;
      if (!cover) {   // logo-only projects: paint the gradient cover the grid uses
        src = document.createElement('canvas'); src.width = 1120; src.height = 700;
        const x = src.getContext('2d'), g = x.createRadialGradient(560, 315, 0, 560, 315, 700);
        g.addColorStop(0, '#3a2a5c'); g.addColorStop(1, '#8b55f8');
        x.fillStyle = g; x.fillRect(0, 0, 1120, 700);
        x.save(); x.beginPath(); x.arc(560, 350, 150, 0, 7); x.shadowColor = '#0008'; x.shadowBlur = 60; x.shadowOffsetY = 18;
        x.fill(); x.clip(); x.drawImage(img, 410, 200, 300, 300); x.restore();
      }
      item.aspect = src.width / src.height;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      wake();
    }).catch(() => {});
    return item;
  });

  // ---------- layout, scroll and input ----------
  const PA = 1.9;   // cover shape, wide like the screenshots
  let W = 0, H = 0, flat = .3, cw = 0, ch = 0, step = 0, cur = 0, target = 0, vel = 0, active = -1, ptr = null, raf = 0, visible = false;
  function resize() {
    const r = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * r); cv.height = Math.round(H * r);
    gl.viewport(0, 0, cv.width, cv.height);
    const phone = W < 720;
    cw = Math.min(W * (phone ? .9 : .52), 760, H * 1.7); ch = cw / PA; step = cw * (phone ? 1.05 : 1.08);
    flat = phone ? cw / W : .3;
    wake();
  }
  const range = () => strip.offsetHeight - innerHeight;
  const top = () => strip.getBoundingClientRect().top + scrollY;
  function onScroll() {
    target = Math.min(Math.max(-strip.getBoundingClientRect().top / Math.max(range(), 1), 0), 1) * (n - 1);
    wake();
  }
  const go = i => scrollTo({ top: top() + Math.min(Math.max(i, 0), n - 1) / (n - 1) * range(), behavior: 'smooth' });
  strip.querySelector('.strip-nav').addEventListener('click', e => {
    const d = +e.target.closest('button')?.dataset.d;
    if (d) go(Math.round(target) + d);
  });

  function show(i) {
    active = i;
    const c = items[i].card;
    cap.style.setProperty('--t', c.style.getPropertyValue('--t'));
    cap.innerHTML = [...c.children].filter(el => !el.classList.contains('cover')).map(el => el.outerHTML).join('');
    cap.classList.remove('swap'); void cap.offsetWidth; cap.classList.add('swap');
    count.textContent = `${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
  }

  // dragging the strip scrolls the page, so both inputs stay in step
  const at = e => {   // which cover is under the pointer (ignoring the bend; good enough for the middle ones)
    const b = cv.getBoundingClientRect(), x = e.clientX - b.left - W / 2, y = e.clientY - b.top - H / 2;
    return items.findIndex((_, i) => Math.abs(x - (i - cur) * step) < cw / 2 && Math.abs(y) < ch / 2);
  };
  cv.addEventListener('pointerdown', e => { ptr = { x: e.clientX, y: e.clientY, moved: 0 }; });
  cv.addEventListener('pointermove', e => {
    const i = at(e);
    cv.style.cursor = ptr?.moved > 6 ? 'grabbing' : i >= 0 ? 'pointer' : 'grab';
    items.forEach((it, k) => it.over = k === i);
    if (ptr) {
      const dx = e.clientX - ptr.x;
      ptr.x = e.clientX; ptr.moved += Math.abs(dx);
      if (e.pointerType === 'mouse' || Math.abs(dx) > Math.abs(e.clientY - ptr.y)) scrollBy(0, -dx / step / (n - 1) * range());
      ptr.y = e.clientY;
    }
    wake();
  });
  cv.addEventListener('pointerleave', () => { items.forEach(it => it.over = false); ptr = null; wake(); });
  cv.addEventListener('pointerup', e => {
    const tap = ptr && ptr.moved < 6; ptr = null;
    if (!tap) return;
    const i = at(e);
    if (i < 0) return;
    if (i === Math.round(cur) && items[i].href) open(items[i].href, '_blank', 'noopener');
    else go(i);
  });

  // ---------- render ----------
  function frame() {
    raf = 0;
    const prev = cur;
    cur += (target - cur) * .085;
    vel += ((cur - prev) * 9 - vel) * .2;
    vel = Math.max(-1, Math.min(1, vel));
    const i = Math.round(cur);
    if (i !== active) show(i);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U.uView, W, H);
    gl.uniform1f(U.uVel, vel);
    gl.uniform1f(U.uFlat, flat);
    gl.uniform1f(U.uRadius, Math.min(28, cw * .06));
    let busy = Math.abs(target - cur) > .001 || Math.abs(vel) > .002;
    items.forEach((it, k) => {
      const x = (k - cur) * step, nx = Math.abs(x) / (W / 2);
      if (nx > 1.6) return;
      it.hover += ((it.over ? 1 : 0) - it.hover) * .15;
      if (Math.abs((it.over ? 1 : 0) - it.hover) > .01) busy = true;
      const pa = PA, ia = it.aspect;
      gl.uniform2f(U.uFit, ia > pa ? pa / ia : 1, ia > pa ? 1 : ia / pa);
      gl.uniform4f(U.uRect, x, 0, cw, ch);
      gl.uniform2f(U.uSize, cw, ch);
      gl.uniform1f(U.uHover, it.hover);
      gl.uniform1f(U.uShift, vel * .03 + Math.sign(x) * nx * nx * .006);
      gl.uniform1f(U.uAlpha, 1 - Math.min(Math.max((nx - 1) / .5, 0), 1));
      gl.bindTexture(gl.TEXTURE_2D, it.tex);
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
    });
    if (busy) wake();
  }
  function wake() { if (visible && !raf) raf = requestAnimationFrame(frame); }

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; wake(); }).observe(cv);
  new ResizeObserver(resize).observe(cv);
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll(); cur = target; show(Math.round(cur));

  function undo() { work.prepend(h2); strip.remove(); work.classList.remove('strip-on'); }
})();
