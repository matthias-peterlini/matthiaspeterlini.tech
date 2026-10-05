const USER = 'matthias-peterlini';
// Visitors from these countries (or with an Italian browser) land on /it/.
const ITALIAN = new Set(['IT', 'SM', 'VA']);
const YEAR = 60 * 60 * 24 * 365;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url, 301);
    }

    // The language switch links to ?lang=en|it: remember the choice, then drop the parameter.
    const pick = url.searchParams.get('lang');
    if (pick === 'en' || pick === 'it') {
      url.searchParams.delete('lang');
      return new Response(null, {
        status: 302,
        headers: {
          Location: url.href,
          'Set-Cookie': `lang=${pick}; Path=/; Max-Age=${YEAR}; SameSite=Lax; Secure`,
          'Cache-Control': 'no-store',
        },
      });
    }

    if (url.pathname === '/') {
      const saved = request.headers.get('Cookie')?.match(/(?:^|;\s*)lang=(en|it)\b/)?.[1];
      const italian = saved ? saved === 'it'
        : ITALIAN.has(request.cf?.country) || /^it\b/i.test(request.headers.get('Accept-Language') ?? '');
      if (italian) return new Response(null, { status: 302, headers: { Location: '/it/', 'Cache-Control': 'no-store' } });
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
