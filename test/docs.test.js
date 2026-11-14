import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildDocs } from '../tools/gen-docs.mjs';
import { CATALOG } from '../src/catalog.js';
import { DEFS } from '../src/defs.js';
import { PATTERN_COST } from '../src/difficulty.js';

test('docs/JOGABILIDADE.md está em dia com o código (rode `npm run docs`)', () => {
  const current = readFileSync(new URL('../docs/JOGABILIDADE.md', import.meta.url), 'utf8');
  assert.equal(current, buildDocs(), 'a doc pública ficou desatualizada: rode `npm run docs` e commite');
});

test('todo elemento que aparece na praia está no bestiário', () => {
  const documented = new Set(CATALOG.map((c) => c.id));
  const ignore = new Set(['towel', 'squad', 'bombeiro', 'recruit']); // decoração / partes do pelotão
  for (const kind of Object.keys(DEFS)) {
    if (ignore.has(kind)) continue;
    assert.ok(documented.has(kind), `"${kind}" existe no jogo mas não está em src/catalog.js`);
  }
  assert.ok(documented.has('squad') && documented.has('recruit'));
  // todo padrão com custo tem alguém no bestiário usando ele
  const patterns = new Set(CATALOG.map((c) => c.pattern).filter(Boolean));
  for (const p of Object.keys(PATTERN_COST)) if (p !== 'combo') assert.ok(patterns.has(p), `padrão "${p}" sem entrada no bestiário`);
});
