# quantai-site

The public site for **QUANTAI** — The Time Trading Fund for a New Time.
One continuous, immersive scene: golden threads of light that come into
coherence as the visitor scrolls — aligning, weaving a foundation, and finally
gathering into a single point of light.

Static. No frameworks, no build step, no external scripts.

```bash
python3 -m http.server 8000   # then http://localhost:8000
```

## Structure

| Path | What |
|---|---|
| `index.html` | The journey — eight scenes, scrubbed by scroll (`data-in` / `data-out`) |
| `css/main.css` | Design system per `docs/brand.html` — ivory/espresso/gold, Cinzel/Crimson Pro/Satoshi |
| `js/lattice.js` | The ether: bespoke WebGL. Ribbon threads with a chaos→order morph (uCoherence), a gather pass (uGather), horizon light, glow pass |
| `js/main.js` | Scene scrubbing (blur→sharp arrivals) + LP register form |
| `js/config.js` | Supabase URL + publishable key (client-safe; RLS is insert-only) |
| `docs/brand.html` | **The brand document** — essence, the mark, palette, type, motion, imagery, voice |
| `media/` | Film goes here — see below |

## The scene timeline

Scroll progress `p` drives everything:

- `p 0.00–0.12` — chaos: threads scattered across time; QUANTAI emerges
- `p 0.10–0.56` — `uCoherence` ramps: threads align and weave the golden foundation
- `p 0.56–0.88` — travel across the foundation; register scene
- `p 0.88–1.00` — `uGather`: all light draws toward a single point on the horizon

## Editing copy

All copy lives in `index.html`, one `<section class="scene">` per moment.
Grace's words are the primary record — the letter in `.scene-letter` is verbatim
and is edited only by Grace.

## Film

Drop footage at `media/science.mp4` — it breathes behind the science scene
automatically (soft radial mask, no frame). Nothing shows if the file is absent.

## LP register-interest

Inserts into `lp_interest` in the `quantet` Supabase project. The anon key can
**insert only** — read submissions in Supabase → Table Editor → `lp_interest`.

## Deploy

Vercel, static preset, no build command, output directory `.` — every push to
`main` deploys. Production domain: `quantai.quantumlightscience.org`.
