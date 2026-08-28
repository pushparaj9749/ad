# ad. — attention, engineered

A concept landing page for **ad.**, a fictional independent creative
advertising studio. Built as a blank-canvas showcase: dark editorial design,
acid-lime accent, oversized display type, scroll-driven reveals, an infinite
marquee, count-up stats, a custom cursor and magnetic buttons.

> Everything on the site — clients, campaigns, numbers — is fictional.
> Portfolio artwork is AI-generated.

## Stack

Zero dependencies, zero build step:

- **HTML** — one semantic page (`index.html`)
- **CSS** — custom properties, grid, `clamp()` fluid type (`css/styles.css`)
- **JS** — IntersectionObserver, rAF, no libraries (`js/main.js`)
- **Type** — Anton (display) + Space Grotesk (body) via Google Fonts

## Run locally

```bash
python3 -m http.server 3000
# → http://localhost:3000
```

(Any static file server works — `npx serve`, `php -S`, etc.)

## Structure

```
├── index.html        # the whole page
├── css/styles.css    # design system + layout + motion
├── js/main.js        # nav state, reveals, stats, cursor, magnetics
└── img/              # AI-generated campaign visuals (concept work)
```

## Notes

- Respects `prefers-reduced-motion` — all animation is disabled there.
- Fully responsive: staggered work grid collapses to one column, services
  re-flow on small screens.
