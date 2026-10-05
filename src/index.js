// Serves the static site from ./public and proxies the GitHub contribution
// calendar, which GitHub doesn't expose through its public REST API.
const GH = 'matthias-peterlini';
const UPSTREAM = `https://github-contributions-api.jogruber.de/v4/${GH}?y=last`;
const MAX_AGE = 60 * 60 * 4; // 4 h

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/contributions') {
      const cache = caches.default;
      const key = new Request(url.origin + url.pathname);
      let res = await cache.match(key);
      if (res) return res;

      const up = await fetch(UPSTREAM, { headers: { 'User-Agent': 'matthiaspeterlini.tech' } });
      if (!up.ok) return new Response('Upstream error', { status: 502 });

      res = new Response(up.body, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${MAX_AGE}`,
        },
      });
      ctx.waitUntil(cache.put(key, res.clone()));
      return res;
    }

    return env.ASSETS.fetch(request);
  },
};
