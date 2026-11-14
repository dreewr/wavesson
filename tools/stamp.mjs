// Monta o site publicado em <saída> com uma versão carimbada em todo import
// (./x.js → ./x.js?v=VERSÃO), no main.js e no style.css do index.html, e grava
// version.json. Assim, uma publicação nova nunca mistura arquivos de cache
// velhos com novos (o GitHub Pages deixa tudo em cache por 10 min).
//
// uso: node tools/stamp.mjs _site <versão>

import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [out = '_site', version = Date.now().toString(36)] = process.argv.slice(2);
const v = encodeURIComponent(version);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const item of ['index.html', 'style.css', '.nojekyll', 'assets', 'src']) {
  cpSync(item, join(out, item), { recursive: true });
}

const IMPORT = /(from\s+|import\s*\(\s*)(['"])(\.\.?\/[^'"?]+\.js)(\?v=[^'"]*)?\2/g;
for (const f of readdirSync(join(out, 'src'))) {
  if (!f.endsWith('.js')) continue;
  const p = join(out, 'src', f);
  writeFileSync(p, readFileSync(p, 'utf8').replace(IMPORT, (_, kw, q, path) => `${kw}${q}${path}?v=${v}${q}`));
}

const html = join(out, 'index.html');
writeFileSync(
  html,
  readFileSync(html, 'utf8')
    .replace(/src="src\/main\.js(\?v=[^"]*)?"/, `src="src/main.js?v=${v}"`)
    .replace(/href="style\.css(\?v=[^"]*)?"/, `href="style.css?v=${v}"`),
);

writeFileSync(join(out, 'version.json'), JSON.stringify({ v: version }) + '\n');
console.log(`site em ${out}/ com versão ${version}`);
