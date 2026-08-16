# quantai-site

The public one-page site for **QUANTAI** — The Time Trading Fund for a New Time.
Live at `quantai.quantumlightscience.org` (Vercel).

A static site: no build step, no framework. Open `index.html` or serve the folder.

```bash
python3 -m http.server 8000   # then http://localhost:8000
```

## Structure

| Path | What |
|---|---|
| `index.html` | The whole journey — sections marked `I · Arrival` → `VI · The Record` |
| `css/main.css` | Design system. Tokens match the QUANTAI dashboard (ivory/espresso/gold, Cinzel/Crimson Pro/Satoshi — PRD D-8) |
| `js/lattice.js` | The 3D time lattice (Three.js via CDN import map). Four thread families, each carrying light in a different direction of time. Scroll travels the camera through the lattice |
| `js/main.js` | Panel reveals + LP register-interest form |
| `js/config.js` | Supabase URL + publishable key (safe client-side; RLS is insert-only) |
| `media/` | Video imagery goes here — see below |

## Editing copy

All copy lives in `index.html`, one section per `<section class="panel">`.
Grace's words are the primary record — the letter in `#record` is verbatim and
is edited only by Grace.

## Video imagery

Drop footage at `media/science.mp4`, set a poster image on the `<video>` tag,
and remove `data-empty="true"` from the `.film-frame` div. Duplicate the
`<figure class="film">` block for additional films.

## LP register-interest

Submissions insert into `lp_interest` in the `quantet` Supabase project
(EU-west-1). The anon key can **insert only** — reads happen in the Supabase
dashboard: Table Editor → `lp_interest`.

## Deploy

Vercel, static preset, no build command, output directory `.` — every push to
`main` deploys.
