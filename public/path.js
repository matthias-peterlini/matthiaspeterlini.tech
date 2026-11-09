// "What I do": the section pins and scrolling slides its panels sideways, one role at a time. Behind
// each panel a huge ghost word and its number drift the other way, and the pills below follow along.
// With reduced motion (or no JavaScript) the panels simply stack.
(() => {
  const sec = document.querySelector('.path');
  if (!sec || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const pin = sec.querySelector('.path-pin'), track = sec.querySelector('.path-track');
  const panels = [...sec.querySelectorAll('.path-panel')], links = [...sec.querySelectorAll('.path-nav a')];
  sec.classList.add('on');
  sec.style.setProperty('--n', panels.length);

  let raf = 0, x = -1, shown = -1;
  const range = () => sec.offsetHeight - innerHeight;
  function frame() {
    raf = 0;
    const nx = Math.max(0, Math.min(1, -sec.getBoundingClientRect().top / range())) * (panels.length - 1);
    if (nx === x) return;
    x = nx;
    track.style.transform = `translate3d(${-x * pin.clientWidth}px, 0, 0)`;
    panels.forEach((p, i) => {
      const d = i - x;
      if (Math.abs(d) > 1.5) return;
      p.style.setProperty('--p', d.toFixed(4));
      p.style.setProperty('--o', Math.max(0, 1 - Math.abs(d) * 1.4).toFixed(3));
    });
    const now = Math.round(x) - 1;                 // panel 0 is the heading
    if (now !== shown) { shown = now; links.forEach((a, i) => a.classList.toggle('on', i === now)); }
  }
  const ask = () => raf ||= requestAnimationFrame(frame);
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', () => { x = -1; ask(); });
  links.forEach((a, i) => a.addEventListener('click', e => {   // the pills jump to their panel
    e.preventDefault();
    scrollTo({ top: sec.getBoundingClientRect().top + scrollY + range() * (i + 1) / (panels.length - 1), behavior: 'smooth' });
  }));
  frame();
})();
