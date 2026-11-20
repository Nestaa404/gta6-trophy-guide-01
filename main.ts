// Leonida Trophy Guide — entrypoint for make.fun bounty gta6-trophy-guide-01.
//
// The guide itself is plain static files under app/ (index.html + ES modules +
// CSS + data/trophies.json, no build step, nothing fetched over the network).
// This program is the hand-in: it copies app/ and screenshots/ from beside
// this file into the output directory and writes dossier.json there, using
// the kit's vendored buildDossier (vendor/makefun-frontend.ts, unchanged —
// the scorer rebuilds the dossier with its own copy and compares byte for
// byte, so the library must stay exactly as shipped).
//
// Run it locally to check the hand-in:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// In the grader, MAKEFUN_OUTPUT_DIR is unset and /output is used instead.
// The run is deterministic: the same input files always produce the same
// dossier.json bytes, so the grader's two runs match.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's caps, mirrored here so a bad entry fails loudly at build time
// instead of silently at scoring time (see the kit's RULES.txt, "The gate").
const DOSSIER_TEXT_MAX_BYTES = 163840;
const SCREENSHOT_MAX_COUNT = 4;
const SCREENSHOT_MAX_BYTES = 262144;
const APP_MAX_FILES = 993;
const APP_MAX_BYTES = 50331648;

function countAppEntries(directory) {
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      const sub = countAppEntries(path);
      files += sub.files;
      bytes += sub.bytes;
    } else if (entry.isFile()) {
      files += 1;
      bytes += statSync(path).size;
    }
  }
  return { files, bytes };
}

function fail(message) {
  throw new Error(`main.ts: ${message}`);
}

const appDir = join(repoRoot, 'app');
const shotsDir = join(repoRoot, 'screenshots');

if (!existsSync(join(appDir, 'index.html'))) fail('app/index.html is missing');
if (!existsSync(join(appDir, 'data', 'trophies.json'))) fail('app/data/trophies.json is missing');

const appTotals = countAppEntries(appDir);
if (appTotals.files > APP_MAX_FILES) fail(`app/ holds ${appTotals.files} files, over the ${APP_MAX_FILES} cap`);
if (appTotals.bytes > APP_MAX_BYTES) fail(`app/ is ${appTotals.bytes} bytes, over the ${APP_MAX_BYTES} cap`);

const shotNames = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((name) => !name.startsWith('.')).sort()
  : [];
if (shotNames.length < 3 || shotNames.length > SCREENSHOT_MAX_COUNT) {
  fail(`screenshots/ holds ${shotNames.length} images, need 3 or 4`);
}
for (const name of shotNames) {
  const size = statSync(join(shotsDir, name)).size;
  if (size > SCREENSHOT_MAX_BYTES) fail(`screenshots/${name} is ${size} bytes, over the ${SCREENSHOT_MAX_BYTES} cap`);
  if (!/\.(png|jpe?g)$/i.test(name)) fail(`screenshots/${name} is not a PNG or JPEG file`);
}

mkdirSync(outputDir, { recursive: true });
cpSync(appDir, join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (shotNames.length > 0) cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outputDir, {
  text_max_bytes: DOSSIER_TEXT_MAX_BYTES,
  screenshots: { max: SCREENSHOT_MAX_COUNT, max_bytes: SCREENSHOT_MAX_BYTES },
  app_max_files: APP_MAX_FILES,
  app_max_bytes: APP_MAX_BYTES,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);

console.log(`Leonida Trophy Guide handed in: ${appTotals.files} app files, ${shotNames.length} screenshots, dossier ${dossier.length} bytes -> ${outputDir}`);
