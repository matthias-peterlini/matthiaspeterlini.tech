// First-visit intro: a dot under a spotlight grows into "!", the letters of my name tumble out of it,
// then the word flies into its place in the hero. Once per session; any click, key or scroll skips it.
// The <head> decides whether to play it and adds .intro-on to <html> so the hero never flashes first.
(async () => {
  const root = document.documentElement, body = document.body;
  const h1 = document.querySelector('.hero h1'), big = h1?.querySelector('.big');
  if (!root.classList.contains('intro-on')) return;
  if (!big) return root.classList.remove('intro-on');
  await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]);
  const css = getComputedStyle(h1), r = big.getBoundingClientRect();
  const ov = document.createElement('div'); ov.className = 'intro'; ov.setAttribute('aria-hidden', 'true');
  const word = document.createElement('div'); word.className = 'intro-word';
  Object.assign(word.style, {
    left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px',
    font: css.font, letterSpacing: css.letterSpacing, lineHeight: css.lineHeight, textTransform: 'uppercase',
  });
  word.innerHTML = [...big.textContent.trim()].map(c => `<span class="chrome">${c}</span>`).join('');
  const s0 = Math.min(1, innerWidth * .62 / r.width);
  const dx = innerWidth / 2 - (r.left + r.width / 2), dy = innerHeight / 2 - (r.top + r.height / 2);
  const start = `translate(${dx}px, ${dy}px) scale(${s0})`;
  word.style.transform = start;
  const bang = document.createElement('div'); bang.className = 'intro-bang';
  const cap = parseFloat(css.fontSize) * .7 * s0;
  bang.innerHTML = `<i class="stem" style="height:${cap * .7}px;width:${cap * .16}px"></i><i class="dot" style="width:${cap * .17}px;height:${cap * .17}px;margin-top:${cap * .12}px"></i>`;
  ov.append(bang);
  body.append(ov, word);

  const letters = [...word.children];
  letters.forEach(l => l.style.opacity = 0);
  const timers = [], at = (ms, f) => timers.push(setTimeout(f, ms));
  const ease = 'cubic-bezier(.2, 1.25, .35, 1)';
  const stem = bang.querySelector('.stem'), dot = bang.querySelector('.dot');
  const anims = [];

  at(80, () => ov.classList.add('lit'));
  at(150, () => anims.push(dot.animate([{ scale: 0 }, { scale: 1 }], { duration: 380, easing: ease, fill: 'both' })));
  at(600, () => anims.push(stem.animate([{ scale: '1 0' }, { scale: '1 1' }], { duration: 320, easing: ease, fill: 'both' })));
  at(1000, () => {
    const b = bang.getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2;
    letters.forEach((l, i) => {
      const lr = l.getBoundingClientRect();
      const fx = (bx - (lr.left + lr.width / 2)) / s0, fy = (by - (lr.top + lr.height / 2)) / s0;
      const spin = (Math.random() * 2 - 1) * 200;
      anims.push(l.animate([
        { opacity: 0, transform: `translate(${fx}px, ${fy}px) rotate(${spin}deg) scale(.15)` },
        { opacity: 1, offset: .25 },
        { opacity: 1, transform: 'none' },
      ], { duration: 720, delay: i * 85, easing: ease, fill: 'both' }));
    });
    anims.push(bang.animate([{ opacity: 1, scale: 1 }, { opacity: 0, scale: .4 }], { duration: 500, delay: letters.length * 85 + 200, fill: 'both' }));
  });
  const landAt = 1000 + letters.length * 85 + 720 + 200;
  at(landAt, () => {
    ov.classList.add('out');
    root.classList.remove('intro-on');
    h1.style.transition = 'none'; h1.style.opacity = 0;
    anims.push(word.animate([{ transform: start }, { transform: 'none' }], { duration: 1000, easing: 'cubic-bezier(.75, 0, .2, 1)', fill: 'both' }));
  });
  at(landAt + 1020, finish);

  function finish() {
    timers.forEach(clearTimeout);
    anims.forEach(a => a.cancel());
    removeEventListener('pointerdown', finish); removeEventListener('keydown', finish); removeEventListener('wheel', finish); removeEventListener('touchmove', finish);
    root.classList.remove('intro-on');
    h1.style.opacity = '';
    requestAnimationFrame(() => h1.style.transition = '');
    ov.remove(); word.remove();
    window.portraitWave?.();
  }
  addEventListener('pointerdown', finish); addEventListener('keydown', finish);
  addEventListener('wheel', finish, { passive: true }); addEventListener('touchmove', finish, { passive: true });
})();
