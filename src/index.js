const USER = 'matthias-peterlini';
const ORG = 'TiclyMusic';
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

    if (url.pathname === '/api/github') return github(request, env, ctx);
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

// GET /api/github -> profile counts plus my public repos and the ticly organisation's.
// Visitors' browsers used to call api.github.com directly and hit its 60-requests-an-hour
// limit per IP; now the Worker asks once an hour and keeps the last good answer for a day,
// so a GitHub hiccup or rate limit never empties the section. An optional GITHUB_TOKEN
// secret (wrangler secret put GITHUB_TOKEN) raises GitHub's limit but is not required.
const HOUR = 60 * 60 * 1000;

async function github(request, env, ctx) {
  const cache = caches.default;
  const key = new Request(new URL('/api/github', request.url));
  const hit = await cache.match(key);
  const age = hit ? Date.now() - Number(hit.headers.get('X-Fetched')) : Infinity;
  if (hit && age < HOUR) return forBrowser(hit);

  try {
    const res = Response.json(await loadGitHub(env), {
      headers: { 'Cache-Control': 'public, max-age=86400', 'X-Fetched': String(Date.now()) },
    });
    ctx.waitUntil(cache.put(key, res.clone()));
    return forBrowser(res);
  } catch (err) {
    if (hit) return forBrowser(hit);   // stale beats empty
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

async function loadGitHub(env) {
  const headers = { 'User-Agent': 'matthiaspeterlini.tech', Accept: 'application/vnd.github+json' };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  const get = path => fetch(`https://api.github.com${path}`, { headers })
    .then(r => r.ok ? r.json() : Promise.reject(new Error(`GitHub ${r.status} on ${path}`)));

  const [user, mine, org] = await Promise.all([
    get(`/users/${USER}`),
    get(`/users/${USER}/repos?sort=pushed&per_page=100`),
    get(`/orgs/${ORG}/repos?sort=pushed&per_page=100`),
  ]);
  const repos = [...mine, ...org]
    .filter(r => !r.fork && !r.archived)
    .sort((a, b) => b.pushed_at.localeCompare(a.pushed_at))
    .map(r => ({
      name: r.name, owner: r.owner.login, url: r.html_url, description: r.description,
      language: r.language, stars: r.stargazers_count, pushed_at: r.pushed_at,
    }));
  return { followers: user.followers, following: user.following, org: ORG, repos };
}

// Browsers may reuse the answer for 10 minutes; the edge copy above lives longer.
function forBrowser(res) {
  const out = new Response(res.body, res);
  out.headers.set('Cache-Control', 'public, max-age=600');
  out.headers.delete('X-Fetched');
  return out;
}
