# matthiaspeterlini.tech

Personal site, served by a Cloudflare Worker with static assets.

- `public/` — the site (`index.html` in English, `it/index.html` in Italian, images, `robots.txt`, `sitemap.xml`)
- `src/index.js` — Worker: serves `public/` and `/api/contributions` (GitHub contribution calendar, cached 1 h), redirects `www.` to the bare domain, and sends visitors in Italy to `/it/` (the language switch overrides it with a `lang` cookie)
- `wrangler.jsonc` — Worker config (Worker `landing` on account `fdd8b534…`)

```sh
npm install
npm run dev      # local preview at http://localhost:8787
npm run deploy   # publish to Cloudflare
```
