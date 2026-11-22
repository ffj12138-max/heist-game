// Midnight Vault — the entry program (Node 22, standard library only).
//
// Hands the game in: copies game/ and screenshots/ from beside this file
// into the output directory and writes /output/dossier.json with the
// vendored make.fun library. Runs twice, writes the same bytes twice.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Inside the grader MAKEFUN_OUTPUT_DIR is unset and /output is used.
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function fail(message) {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

function countEntries(dir) {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    total += 1;
    if (statSync(full).isDirectory()) total += countEntries(full);
  }
  return total;
}

function main() {
  const gameDir = join(REPO_ROOT, 'game');
  const shotsDir = join(REPO_ROOT, 'screenshots');
  if (!existsSync(join(gameDir, 'index.html'))) {
    fail('game/index.html is missing — nothing to hand in.');
  }
  if (!existsSync(shotsDir) || readdirSync(shotsDir).length === 0) {
    fail('screenshots/ is empty — the entry needs 3 or 4 screenshots.');
  }

  mkdirSync(OUT_DIR, { recursive: true });
  cpSync(gameDir, join(OUT_DIR, 'game'), { recursive: true });
  cpSync(shotsDir, join(OUT_DIR, 'screenshots'), { recursive: true });
  checkShots();

  const dossier = buildDossier(OUT_DIR, DOSSIER_CAPS);
  writeFileSync(join(OUT_DIR, 'dossier.json'), dossier);

  // buildDossier returns bytes, not a string: decode before reading it.
  const parsed = JSON.parse(new TextDecoder().decode(dossier));
  const gameEntries = countEntries(join(OUT_DIR, 'game'));
  const shotNames = readdirSync(join(OUT_DIR, 'screenshots')).sort();
  console.log(`Midnight Vault handed in to ${OUT_DIR}`);
  console.log(`  game files: ${gameEntries} entries`);
  console.log(`  screenshots: ${shotNames.join(', ')}`);
  console.log(`  dossier: ${parsed.schema ?? 'makefun/dossier/v1'}, ${dossier.length} bytes`);
}

main();

// One more guardrail before the hand-in: the dossier must stay under the
// gate's own byte cap, and the screenshots must all be JPEG or PNG. The
// library throws on those, so a second check here only names them early.
function checkShots() {
  for (const name of readdirSync(join(OUT_DIR, 'screenshots'))) {
    const lower = name.toLowerCase();
    if (!lower.endsWith('.jpg') && !lower.endsWith('.jpeg') && !lower.endsWith('.png')) {
      fail(`screenshots/${name} is not a JPEG or PNG.`);
    }
    const bytes = statSync(join(OUT_DIR, 'screenshots', name)).size;
    if (bytes > 262144) fail(`screenshots/${name} is ${bytes} bytes (cap 256 KiB).`);
  }
}
