// The GitHub repositories on a 3D ring, seen from a little above. The section pins while the ring
// turns with the scroll; drag it to spin it yourself, or Tab through the cards to bring each to the
// front. The page calls repoRing() once the repositories are in; with reduced motion the plain grid stays.
window.repoRing = () => {
  const host = document.getElementById('ring'), grid = document.getElementById('repos');
  const src = [...grid.querySelectorAll('.repo')];
  if (!host || src.length < 4 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ring = host.querySelector('.ring'), stage = host.querySelector('.ring-stage'), cap = host.querySelector('.ring-cap');
  host.querySelector('.ring-count').textContent = src.length;
  const cards = src.map(a => {
    const c = a.cloneNode(true);
    c.className = 'ring-card';
    c.dataset.k = (a.querySelector('b').lastChild.textContent.trim()[0] || '').toUpperCase();
    ring.append(c);
    return c;
  });
  grid.hidden = true;                                 // the ring has the same links
  host.hidden = false;

  const n = cards.length, step = 360 / n;
  let R = 0, a = 0, spin = 0, vel = 0, drag = null, raf = 0, front = -1;
  function layout() {
    const cw = Math.min(280, Math.max(150, innerWidth * .2));
    host.style.setProperty('--cw', cw + 'px');
    R = Math.max(n * (cw + 26) / (2 * Math.PI), cw * 1.25);
    cards.forEach((c, i) => c.style.transform = `rotateY(${i * step}deg) translateZ(${R}px)`);
    ask();
  }
  function frame() {
    raf = 0;
    const r = host.getBoundingClientRect(), p = Math.max(0, Math.min(1, -r.top / (host.offsetHeight - innerHeight)));
    if (drag === null) { spin += vel; vel *= .92; }
    a = -p * 360 * .85 + spin;
    ring.style.transform = `rotateX(-24deg) rotateY(${a}deg)`;
    ring.style.setProperty("--face", `rotateY(${-a}deg) rotateX(24deg)`);
    let best = 1e9, bi = 0;
    cards.forEach((c, i) => {
      let rel = ((i * step + a) % 360 + 540) % 360 - 180;   // -180 … 180, 0 = facing you
      const depth = Math.cos(rel * Math.PI / 180);
      c.style.opacity = (.1 + .9 * ((depth + 1) / 2) ** 2).toFixed(3);   // the far side shows through, faintly
      c.classList.toggle('front', Math.abs(rel) < step / 2);
      if (Math.abs(rel) < best) { best = Math.abs(rel); bi = i; }
    });
    if (bi !== front) {
      front = bi;
      const c = cards[bi];
      cap.innerHTML = `<b>${c.querySelector('b').innerHTML}</b>${c.querySelector('p') ? `<span>${c.querySelector('p').innerHTML}</span>` : ''}`;
    }
    if (Math.abs(vel) > .01) ask();
  }
  const ask = () => raf ||= requestAnimationFrame(frame);
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', layout);
  stage.addEventListener('pointerdown', e => { drag = e.clientX; vel = 0; stage.classList.add('dragging'); });
  addEventListener('pointermove', e => {
    if (drag === null) return;
    const d = (e.clientX - drag) * .25; drag = e.clientX;
    spin += d; vel = d; ask();
  }, { passive: true });
  addEventListener('pointerup', () => { if (drag !== null) { drag = null; stage.classList.remove('dragging'); ask(); } });
  // a drag shouldn't open the card it ends on
  let moved = 0;
  stage.addEventListener('pointerdown', e => moved = e.clientX);
  cards.forEach((c, i) => {
    c.addEventListener('click', e => { if (Math.abs(moved - e.clientX) > 6) e.preventDefault(); });
    c.addEventListener('focus', () => {                // keyboard: turn the focused card to the front
      let rel = ((i * step + a) % 360 + 540) % 360 - 180;
      spin -= rel; ask();
    });
  });
  layout();
};
