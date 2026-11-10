<a href="https://matthiaspeterlini.tech">
  <img src="docs/hero.png" alt="The hero of matthiaspeterlini.tech: my name in chrome letters over my Minecraft skin drawn in particles" width="100%">
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
- **What I do**: the section pins and scrolling slides through my roles sideways (founder of ticly, developer, student), with glowing titles and huge ghost words drifting behind them.
- **Bending project strip**: scrolling slides the project covers sideways on a WebGL strip. They curl away at the edges and split into RGB while moving, with the details of the centred project underneath.
- **Projects**: ticly, NexusMC, Guess the Song, ArcBase, JustOS, Oxbeat and the Better for YouTube Music, YouTube and Spotify extensions, each with its cover and links.
- **Live GitHub data**: profile stats, top languages, every public repository (mine and the [ticly-it](https://github.com/ticly-it) organisation's) on a **3D ring** that turns as you scroll or drag, and the contribution calendar as a **3D city** you can drag to rotate and tap for details (or flip back to the classic 2D grid). Drawn on a plain `<canvas>`, no WebGL or libraries.
- **English and Italian**: visitors in Italy (or with an Italian browser) land on `/it/` automatically. The language switch remembers their choice.
- **Considerate by default**: respects `prefers-reduced-motion`, semantic markup and alt text, JSON-LD profile data, Open Graph cards, `hreflang` and a sitemap.

<p>
  <img src="docs/what-i-do.png" alt="The What I do section: the Founder panel with a glowing title and a huge ghost word behind it" width="49%">
  <img src="docs/work.png" alt="The projects strip: NexusMC in the middle, the neighbouring covers curling away" width="49%">
</p>

## How it works

```
                    ┌──────────────────────────── Worker (src/index.js) ───────────────────────────┐
request ──────────▶ │ www.* ─────────────────────────────▶ 301 to the bare domain                  │
                    │ ?lang=en|it ───────────────────────▶ set cookie, 302 to the clean URL        │
                    │ /  + in Italy / Italian browser ───▶ 302 to /it/  (unless cookie says "en")  │
                    │ /api/contributions ────────────────▶ GitHub calendar → JSON, cached 1 h      │
                    │ /api/github ───────────────────────▶ profile + repos, cached 1 h, kept 1 day │
                    │ anything else ─────────────────────▶ static file from public/                │
                    └──────────────────────────────────────────────────────────────────────────────┘
```

GitHub has no public API for the contribution calendar, so the Worker reads the same HTML fragment github.com renders on profiles, turns it into JSON, and caches it at the edge. Profile stats and repositories come from the GitHub REST API through `/api/github`, which keeps the last good answer for a day so a rate limit never empties the section; if the Worker can't reach GitHub at all, the page asks GitHub from the visitor's browser instead. An optional `GITHUB_TOKEN` secret raises GitHub's rate limit.

## Project structure

```
public/
├── index.html          English page
├── site.css            styles shared by both languages
├── intro.js            first-visit intro
├── portrait.js         particle portrait of my Minecraft skin (skin.png)
├── strip.js            WebGL project strip
├── path.js             the sideways "What I do" section
├── ring.js             the ring of GitHub repositories
├── city.js             3D contribution map, shared by both languages
├── skin.png            my Minecraft skin
├── it/index.html       Italian page
├── covers/             project covers
├── og.png              social preview image
├── favicon.svg
├── robots.txt
└── sitemap.xml
docs/                   README screenshots
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

There is no build step: `public/` is uploaded as it is.

> [!NOTE]
> The two languages are separate files. When you change copy in `public/index.html`, update `public/it/index.html` too.

## Built with

HTML · CSS · vanilla JavaScript · [Cloudflare Workers](https://developers.cloudflare.com/workers/) with [static assets](https://developers.cloudflare.com/workers/static-assets/) · WebGL · [skinview3d](https://github.com/bs-community/skinview3d) · [Archivo](https://fonts.google.com/specimen/Archivo)

## License

The code is [MIT](LICENSE): feel free to borrow the Worker, the particle portrait, the bending strip or anything else. The text, images, project names and logos are mine, so please don't republish them as your own.

## Contact

[matthias.peterlini@gmail.com](mailto:matthias.peterlini@gmail.com) · [GitHub](https://github.com/matthias-peterlini)
