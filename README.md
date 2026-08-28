# ad. — attention, engineered

A concept site for **ad.**, a fictional independent creative advertising
studio. Two parts, one repo:

1. **Marketing site** — dark editorial design, acid-lime accent, oversized
   Anton type, premium video-based scroll animations (GSAP + Lenis +
   ScrollTrigger, pinned scroll-scrubbed showreel), custom cursor, magnetics.
2. **Studio OS** — a full-stack SaaS creative-operations workspace
   (projects, kanban board, clients) that runs in **two data modes**:

   | Mode | Data layer | Who sees the data |
   |---|---|---|
   | **Simple — Local** | IndexedDB (fallback: localStorage) | This browser only |
   | **Multi-user SaaS** | Supabase Free (auth + Postgres RLS + Realtime) | Every signed-in user, isolated by RLS |

   Enter it from the marketing nav via **“Studio OS”** or by going to
   `#/app`.

> All clients, campaigns and numbers on the marketing site are fictional.
> Portfolio artwork is AI-generated. The SaaS demo data is seeded locally on
> first run.

---

## Run locally

```bash
python3 -m http.server 3000
# → http://localhost:3000
```

(Any static file server works — `npx serve`, `php -S`, etc.)

---

## Local mode (default, zero setup)

Open the site → **Studio OS** → you land on the dashboard with seeded demo
projects/tasks/clients. Everything is stored in **IndexedDB**
(`adstudio-db`), with an automatic localStorage fallback on old browsers.

- Create/edit/delete projects, clients and tasks.
- Drag cards across the 5-column kanban.
- Search + status filters, dashboard stats, JSON export.
- Switch data mode in **Settings → Data mode**.

## Supabase mode (multi-user SaaS)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run everything in `supabase/schema.sql`
   (creates `projects`, `clients`, `tasks` tables, owner-scoped RLS
   policies, `updated_at` trigger, and enables Realtime).
3. Get your **Project URL** and **anon public key**
   (Project Settings → API). Never use the `service_role` key.
4. Configure them **either**:
   - in-app: Settings → Supabase Cloud → **Connect cloud** (paste URL +
     anon key; stored in this browser only), **or**
   - in `js/app/config.js` → `supabaseUrl` / `supabaseAnonKey` (committed
     anon keys are public-safe for the free tier), or
   - via `localStorage` key `adstudio.supabase.credentials.v1`.
5. Switch to **Cloud** mode in Settings (or connect + it auto-switches).
   Sign up / sign in — each user only ever reads and writes their own rows
   (enforced by RLS), and changes sync to other browsers via Realtime.

> Auth flows: email + password, or magic link. Supabase email confirmation
> may be required depending on your project settings.

---

## Stack

- **Frontend** — one semantic HTML page, custom-property CSS, vanilla JS.
- **Motion** — GSAP 3.13 + ScrollTrigger + Lenis (vendored in
  `js/vendor/` so the site works offline / behind firewalls).
- **Video** — `video/showreel.mp4` (1280×720, 30 fps, all-intra H.264 for
  frame-accurate scroll scrubbing) generated from the campaign stills.
- **SaaS** — `@supabase/supabase-js` 2.49 (vendored UMD).
- **Type** — Anton (display) + Space Grotesk (body) via Google Fonts.

## Structure

```
├── index.html            # marketing page + saas shell + script load
├── css/styles.css        # design system, motion, full SaaS UI
├── js/
│   ├── main.js           # marketing scroll choreography (GSAP/Lenis)
│   ├── vendor/           # gsap, ScrollTrigger, lenis, supabase-js
│   └── app/
│       ├── config.js     # Supabase URL/anon key (optional build config)
│       ├── db-local.js   # IndexedDB first, localStorage fallback
│       ├── db-cloud.js   # Supabase auth + CRUD + realtime
│       ├── ui.js         # dom helpers, toast, modal, hash router
│       ├── store.js      # mode switch, seeding, auth state
│       ├── views.js      # dashboard, projects, board, clients, settings
│       └── app.js        # bootstrap, routes, auth gate, app/site switch
├── supabase/schema.sql   # tables + RLS + triggers + realtime
├── video/                # scroll-scrubbed showreel + poster
└── img/                  # AI-generated campaign visuals
```

## Notes

- Respects `prefers-reduced-motion` — all animation is disabled there and
  the showreel falls back to a looped video.
- `#/app`, `#/projects`, `#/board`, `#/clients`, `#/settings` are app
  routes; `#/top` returns to the marketing site.
- Preview servers must support HTTP byte ranges (`206`) for the smoothest
  video scrubbing (Python's `http.server` returns 200; most static hosts,
  e.g. Netlify/Vercel, send 206 correctly).
