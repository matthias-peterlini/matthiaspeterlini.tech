const USER = 'matthias-peterlini';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url, 301);
    }
    if (url.pathname !== '/api/contributions') return env.ASSETS.fetch(request);

    const cache = caches.default;
    const hit = await cache.match(request);
    if (hit) return hit;

    const gh = await fetch(`https://github.com/users/${USER}/contributions`, {
      headers: { 'User-Agent': 'matthiaspeterlini.tech' },
    });
    if (!gh.ok) return Response.json({ error: gh.status }, { status: 502 });
    const html = await gh.text();

    const counts = {};
    for (const [, id, text] of html.matchAll(/<tool-tip[^>]*for="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g))
      counts[id] = /^\d+/.test(text) ? parseInt(text, 10) : 0;

    const contributions = [];
    for (const [td] of html.matchAll(/<td[^>]*data-date="[^"]+"[^>]*>/g)) {
      const attr = name => td.match(new RegExp(`${name}="([^"]+)"`))?.[1];
      contributions.push({ date: attr('data-date'), count: counts[attr('id')] ?? 0, level: +attr('data-level') || 0 });
    }
    contributions.sort((a, b) => a.date.localeCompare(b.date));

    const heading = html.match(/([\d,]+)\s+contributions?\s+in the last year/);
    const lastYear = heading ? +heading[1].replace(/,/g, '') : contributions.reduce((n, c) => n + c.count, 0);

    const res = Response.json({ total: { lastYear }, contributions }, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
    ctx.waitUntil(cache.put(request, res.clone()));
    return res;
  },
};
