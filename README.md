<a href="https://matthiaspeterlini.tech">
  <img src="public/og.png" alt="Matthias Peterlini — Developer & designer" width="100%">
</a>

<p align="center">
  <a href="https://matthiaspeterlini.tech"><b>matthiaspeterlini.tech</b></a> ·
  <a href="https://matthiaspeterlini.tech/it/">Versione italiana</a>
</p>

<p align="center">
  <img alt="Cloudflare Workers" src="https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white">
  <img alt="No build step" src="https://img.shields.io/badge/build_step-none-111111">
  <img alt="No frameworks" src="https://img.shields.io/badge/frameworks-none-111111">
</p>

---

My personal site: hand-written HTML, CSS and JavaScript served by a Cloudflare Worker. No framework and no bundler; the only library is [skinview3d](https://github.com/bs-community/skinview3d), loaded from a CDN for the hero portrait.

## Highlights

- **Black and chrome**: a monochrome page, wide *Archivo* display type with a chrome gradient, hairlines instead of cards.
- **Intro**: on the first visit of a session, under a spotlight the letters of my name tumble out of a single point and fly into place in the hero. Any click, key or scroll skips it.
- **Minecraft portrait**: my skin (El_Matthiass) is rendered in 3D off-screen by skinview3d and redrawn as thousands of square particles. They assemble after the intro and dodge the pointer; scroll down and they burst into dust that stays behind the whole page. The head follows the pointer. Drag to turn it.
- **Bending project strip**: scrolling slides the project covers sideways on a WebGL strip. They curl away at the edges and split into RGB while moving, with the details of the centred project underneath.
- **Live GitHub data**: profile stats, top languages, recently pushed repositories, and the contribution calendar as a **3D city** you can drag to rotate and tap for details (or flip back to the classic 2D grid). Drawn on a plain `<canvas>`, no WebGL or libraries.
- **English and Italian**: visitors in Italy (or with an Italian browser) land on `/it/` automatically. The language switch remembers their choice.
- **Considerate by default**: respects `prefers-reduced-motion`, semantic markup and alt text, JSON-LD profile data, Open Graph cards, `hreflang` and a sitemap.

## How it works

```
                    ┌──────────────────────────── Worker (src/index.js) ───────────────────────────┐
request ──────────▶ │ www.* ─────────────────────────────▶ 301 to the bare domain                  │
                    │ ?lang=en|it ───────────────────────▶ set cookie, 302 to the clean URL        │
                    │ /  + in Italy / Italian browser ───▶ 302 to /it/  (unless cookie says "en")  │
                    │ /api/contributions ────────────────▶ GitHub calendar → JSON, cached 1 h      │
                    │ anything else ─────────────────────▶ static file from public/                │
                    └──────────────────────────────────────────────────────────────────────────────┘
```

GitHub has no public API for the contribution calendar, so the Worker reads the same HTML fragment github.com renders on profiles, turns it into JSON, and caches it at the edge. Profile stats and repositories come straight from the public GitHub REST API in the browser.

## Project structure

```
public/
├── index.html          English page
├── site.css            styles shared by both languages
├── intro.js            first-visit intro
├── portrait.js         particle portrait of my Minecraft skin (skin.png)
├── strip.js            WebGL project strip
├── city.js             3D contribution map, shared by both languages
├── it/index.html       Italian page
├── covers/             project covers
├── og.png              social preview image
├── favicon.svg
├── robots.txt
└── sitemap.xml
src/index.js            the Worker
wrangler.jsonc          Worker config: name, custom domains, static assets
```

## Run it locally

Requires Node.js 22 or newer.

```sh
npm install
npm run dev        # http://localhost:8787
```

To preview the Italian redirect, send an Italian `Accept-Language` header, or open `/?lang=it` (and `/?lang=en` to switch back).

## Deploy

```sh
npx wrangler login     # or set CLOUDFLARE_API_TOKEN
npm run deploy
```

> [!NOTE]
> The two languages are separate files. When you change copy in `public/index.html`, update `public/it/index.html` too.

## Built with

HTML · CSS · vanilla JavaScript · [Cloudflare Workers](https://developers.cloudflare.com/workers/) with [static assets](https://developers.cloudflare.com/workers/static-assets/) · [Roboto Flex](https://fonts.google.com/specimen/Roboto+Flex)

## License

The code is [MIT](LICENSE): feel free to borrow the Worker, the wavy line or anything else. The text, images, project names and logos are mine, so please don't republish them as your own.

## Contact

[matthias.peterlini@gmail.com](mailto:matthias.peterlini@gmail.com) · [GitHub](https://github.com/matthias-peterlini)
