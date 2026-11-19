# Leonida Trophy Guide — GTA VI

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/Nestaa404/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/Nestaa404/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

Entry for make.fun bounty `gta6-trophy-guide-01` — build the best GTA 6 trophy guide:
https://make.fun/bounty/gta6-trophy-guide-01

An offline web app (`app/`, plain static files, no build step) covering all 55
official PlayStation 5 trophies of Grand Theft Auto VI: official name,
description and grade for each, a guide in our own words with its sources
(Exophase and PSNProfiles, the official list as published), a six-stage
roadmap to the platinum, 16 missable trophies flagged, and a tracker — a
checklist saved in the browser (localStorage) with export/import, filters by
kind (story, missable, collectibles, activities, challenges, money, online)
and grade, and a spoiler setting that hides story trophy names and
descriptions until they are earned.

Run it:

```sh
node serve.ts   # then open http://localhost:8080
```

Hand it in (builds the dossier the judge reads):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots in `screenshots/` are real Chromium renders of the app
(`tools/shots.mjs`): the checklist with a guide open, the roadmap, the
missable list, and the spoiler setting at work.

Built by Brio and sub-agents for @anesta-s-kurniawansyah.
