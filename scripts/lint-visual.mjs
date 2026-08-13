#!/usr/bin/env node
/* Guarda da identidade visual.
 *
 * A regra do CLAUDE.md é uma só: nenhum valor visual literal fora de
 * src/styles/tokens.css. Este script prova isso — varre src/ e reclama, com
 * arquivo e linha, de cor crua, tamanho de fonte cravado e style={{}} de
 * aparência.
 *
 * Roda dentro do `npm run build`, então falhar aqui é falhar o build.
 *
 * Uso:
 *   node scripts/lint-visual.mjs                 verifica
 *   node scripts/lint-visual.mjs --update-baseline  aceita o que existe hoje
 *   node scripts/lint-visual.mjs --no-baseline   ignora o baseline e mostra tudo
 *
 * O baseline (scripts/visual-baseline.json) existe porque o repositório já
 * tinha violações quando o guarda nasceu. Ele congela essas, e só essas: uma
 * violação nova trava o build do mesmo jeito. A lista só encolhe.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const BASELINE_FILE = path.join(ROOT, 'scripts', 'visual-baseline.json');

/* O único arquivo onde valor visual literal é o certo. */
const TOKENS_FILE = path.join(SRC, 'styles', 'tokens.css');

const EXTENSIONS = new Set(['.js', '.jsx', '.css']);

/* Palavras que são valor, não cor: aparecem cruas e continuam certas. */
const ALLOWED_WORDS = new Set(['currentColor', 'transparent', 'inherit', 'none', 'unset', 'initial']);

/* Propriedades de aparência: dentro de style={{}} nenhuma delas é aceitável.
   Fora desta lista, style={{}} é valor calculado em runtime (transform,
   largura em porcentagem) e passa. */
const APPEARANCE_PROPS = [
  'color',
  'background',
  'fontSize',
  'fontWeight',
  'borderRadius',
  'padding',
  'margin',
  'boxShadow',
  'letterSpacing',
  'lineHeight',
];

const APPEARANCE_PROP_RE = new RegExp(
  `(^|[{,;\\s])(${APPEARANCE_PROPS.join('|')})[A-Za-z]*\\s*:`,
);

const COLOR_FN_RE = /\b(rgba?|hsla?|oklch|oklab|lch|lab)\s*\(/g;
const HEX_RE = /#[0-9a-fA-F]+/g;
const FONT_SIZE_RE = /(^|[;{\s])font-size\s*:([^;}]*)/g;

/* ------------------------------------------------------------------ leitura */

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      walk(full, out);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

/* Apaga comentários trocando cada caractere por espaço, para as linhas e as
   colunas continuarem valendo. Respeita string e template literal, senão um
   `//` dentro de uma URL viraria comentário. */
function maskComments(source, isCss) {
  const chars = [...source];
  let i = 0;
  const blank = (from, to) => {
    for (let k = from; k < to; k++) if (chars[k] !== '\n') chars[k] = ' ';
  };
  while (i < chars.length) {
    const c = chars[i];
    const next = chars[i + 1];
    if (c === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      const stop = end === -1 ? chars.length : end + 2;
      blank(i, stop);
      i = stop;
      continue;
    }
    if (!isCss && c === '/' && next === '/') {
      let end = source.indexOf('\n', i);
      if (end === -1) end = chars.length;
      blank(i, end);
      i = end;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      i++;
      while (i < chars.length && chars[i] !== c) {
        if (chars[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }
    i++;
  }
  return chars.join('');
}

function lineAt(source, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (source[i] === '\n') line++;
  return line;
}

function snippetAt(source, index) {
  const start = source.lastIndexOf('\n', index) + 1;
  let end = source.indexOf('\n', index);
  if (end === -1) end = source.length;
  return source.slice(start, end).trim().slice(0, 120);
}

/* ------------------------------------------------------------------- regras */

function findStyleBlocks(code) {
  /* Devolve cada `style={{ … }}` com o índice de onde começa, casando as chaves
     para não parar no primeiro `}` de um objeto aninhado. */
  const blocks = [];
  const re = /style\s*=\s*\{\{/g;
  let match;
  while ((match = re.exec(code)) !== null) {
    let depth = 2;
    let i = match.index + match[0].length;
    while (i < code.length && depth > 0) {
      if (code[i] === '{') depth++;
      else if (code[i] === '}') depth--;
      i++;
    }
    blocks.push({ index: match.index, text: code.slice(match.index, i) });
  }
  return blocks;
}

function checkFile(file) {
  const relative = path.relative(ROOT, file).split(path.sep).join('/');
  const raw = fs.readFileSync(file, 'utf8');
  const isCss = path.extname(file) === '.css';
  const code = maskComments(raw, isCss);
  const found = [];

  const report = (rule, index, message) => {
    found.push({
      file: relative,
      line: lineAt(code, index),
      rule,
      message,
      snippet: snippetAt(raw, index),
    });
  };

  /* cor em hexadecimal */
  for (const match of code.matchAll(HEX_RE)) {
    const digits = match[0].slice(1);
    if (![3, 4, 6, 8].includes(digits.length)) continue;
    const after = code[match.index + match[0].length];
    if (after && /[0-9a-zA-Z_-]/.test(after)) continue;
    report('hex', match.index, `cor crua ${match[0]} — use um token de tokens.css`);
  }

  /* cor por função */
  for (const match of code.matchAll(COLOR_FN_RE)) {
    report('color-fn', match.index, `cor crua ${match[1]}() — use um token de tokens.css`);
  }

  if (isCss) {
    /* tamanho de fonte cravado */
    for (const match of code.matchAll(FONT_SIZE_RE)) {
      const value = match[2].trim();
      if (!value) continue;
      if (value.includes('var(--t-')) continue;
      if (ALLOWED_WORDS.has(value)) continue;
      report(
        'font-size',
        match.index,
        `font-size: ${value} — use um dos seis degraus (var(--t-…))`,
      );
    }
  } else {
    /* style={{}} de aparência */
    for (const block of findStyleBlocks(code)) {
      const inner = block.text.replace(/^style\s*=\s*\{\{/, '');
      const hit = inner.match(APPEARANCE_PROP_RE);
      if (!hit) continue;
      report(
        'inline-style',
        block.index,
        `style={{ ${hit[2]}… }} é aparência — vai para uma classe`,
      );
    }
  }

  return found;
}

/* ----------------------------------------------------------------- baseline */

/* Impressão digital sem linha: mexer no arquivo em volta não reabre a
   violação, e corrigi-la de verdade tira a entrada da lista. */
const fingerprint = (v) => `${v.file}\t${v.rule}\t${v.snippet}`;

function readBaseline() {
  if (!fs.existsSync(BASELINE_FILE)) return new Set();
  try {
    const data = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
    return new Set(data.violations ?? []);
  } catch (error) {
    console.error(`lint:visual — baseline ilegível (${error.message}); tratando como vazio.`);
    return new Set();
  }
}

function writeBaseline(violations) {
  const body = {
    comentario:
      'Violações que já existiam quando o lint:visual nasceu. Esta lista só pode encolher — não acrescente nada à mão.',
    atualizadoEm: new Date().toISOString().slice(0, 10),
    violations: [...new Set(violations.map(fingerprint))].sort(),
  };
  fs.writeFileSync(BASELINE_FILE, `${JSON.stringify(body, null, 2)}\n`);
}

/* --------------------------------------------------------------------- main */

const args = new Set(process.argv.slice(2));
const files = walk(SRC).filter((f) => path.resolve(f) !== TOKENS_FILE);
const violations = files.flatMap(checkFile);
violations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

if (args.has('--update-baseline')) {
  writeBaseline(violations);
  console.log(`lint:visual — baseline gravado com ${violations.length} violação(ões) existentes.`);
  process.exit(0);
}

const baseline = args.has('--no-baseline') ? new Set() : readBaseline();
const fresh = violations.filter((v) => !baseline.has(fingerprint(v)));
const known = violations.length - fresh.length;

for (const v of fresh) {
  console.error(`${v.file}:${v.line}  ${v.message}`);
  console.error(`    ${v.snippet}`);
}

if (fresh.length > 0) {
  console.error(
    `\nlint:visual — ${fresh.length} violação(ões) nova(s). Nenhum valor visual literal fora de src/styles/tokens.css (docs/design-system.md).`,
  );
  process.exit(1);
}

/* O baseline encolheu? Bom — mas ele precisa ser regravado, senão a violação
   corrigida continua tolerada e pode voltar sem ninguém notar. */
const stale = [...baseline].filter((f) => !violations.some((v) => fingerprint(v) === f));
if (stale.length > 0) {
  console.log(
    `lint:visual — ${stale.length} violação(ões) do baseline já não existem. Rode "npm run lint:visual -- --update-baseline" para tirá-las da lista.`,
  );
}

console.log(
  known > 0
    ? `lint:visual — ok, sem violação nova (${known} antiga(s) ainda toleradas pelo baseline).`
    : 'lint:visual — ok, nenhuma violação.',
);
