[![make.fun bounty](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![make.fun rank](https://make.fun/badge/gta6-trophy-guide-01/Nestaa404/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![make.fun reward](https://make.fun/badge/gta6-trophy-guide-01/Nestaa404/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01)

# Leonida Trophy Guide — GTA VI (PS5)

Entry for make.fun bounty [Build the best GTA 6 trophy guide](https://make.fun/bounty/gta6-trophy-guide-01).

An offline guide and tracker for all **55 Grand Theft Auto VI trophies** on PlayStation 5 — 1 platinum, 2 gold, 6 silver, 46 bronze. Every trophy has its official name, description and grade, plus a guide written for this entry, in its own words, with the sources each fact comes from.

## What it does

- **Checklist tracker** — tick trophies off; progress is saved in the browser (localStorage) and can be exported to a `.json` file and imported back.
- **Filters** — by kind (story, missable, collectibles, activities, stranger strands, combat, money, online), by grade, by earned/remaining, plus full-text search and sorting.
- **Spoiler setting** — hides the names and descriptions of story trophies until they are earned.
- **Roadmap to the platinum** — six stages in play order: story first (where every missable trophy lives), then stranger strands, collectibles & exploration, activities & skills, combat/chaos/money, and finally 100% completion, which pops the platinum.
- **Missable trophies** — 16 trophies flagged, with why each one can be missed and when to earn it.
- **Counters** — counted trophies (250 stunts, 42 shooting-range golds, 100 WAiNK locations, …) have a running counter in the tracker.

## How the guides were written

Names, descriptions and grades are the official PlayStation trophy list, as listed by Exophase and PSNProfiles. The guides, steps and roadmap stages are written for this entry from those official descriptions — each guide names its sources beside it. No Rockstar Games logo, artwork or game screenshot is used anywhere.

## Run it

Static files under `app/` — no build step, no network at run time:

```sh
node serve.ts
# open http://127.0.0.1:8080
```

Or open `app/index.html` directly from any static file server with `app/` at its root.

## Hand it in

`main.ts` copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the kit's vendored library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout

- `app/index.html` — page structure: header with progress, three views (checklist, roadmap, missable)
- `app/style.css` — the guide's own look
- `app/app.js` — state, storage, filters, search, spoiler setting, export/import, hash routing
- `app/views.js` — trophy card rendering (badges, counters, expandable guides)
- `app/roadmap.js` — roadmap stages and the missable list, built from the trophy data
- `app/data/trophies.json` — the 55 trophies: official data plus guides, steps, sources, kinds, missable flags and roadmap stages
- `screenshots/` — 4 screenshots of the running app (checklist with a guide open, roadmap, missable list, spoiler mode)
- `vendor/makefun-frontend.ts` — the kit's dossier library, unchanged

## License

MIT — see [LICENSE](LICENSE).
