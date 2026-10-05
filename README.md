# matthiaspeterlini.tech

Personal site, served by a Cloudflare Worker with static assets.

- `public/` — the site (`index.html`, images, `robots.txt`, `sitemap.xml`)
- `src/index.js` — Worker: serves `public/` and `/api/contributions` (GitHub contribution calendar, cached 4 h)
- `wrangler.jsonc` — Worker config

```sh
npm install
npm run dev      # local preview at http://localhost:8787
npm run deploy   # publish to Cloudflare
```
