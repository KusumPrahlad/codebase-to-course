#!/usr/bin/env node
/**
 * Course build + validation.  Works on Windows, macOS and Linux (Node 16+).
 *
 *   node build.mjs                  assemble index.html, print warnings
 *   node build.mjs --strict         treat warnings as errors
 *   node build.mjs --allow-secrets  do not fail on suspected secrets (use only after review)
 *
 * ERRORS stop the build (no index.html is written). WARNINGS are printed but
 * the build still succeeds (unless --strict).
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
const STRICT = args.has('--strict');
const ALLOW_SECRETS = args.has('--allow-secrets');

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

/* ── helpers ─────────────────────────────────────────────────── */
const read = (f) => readFileSync(join(DIR, f), 'utf8');
const stripComments = (h) => h.replace(/<!--[\s\S]*?-->/g, '');
const decode = (s) => s
  .replace(/&quot;/g, '"').replace(/&apos;|&#39;|&#x27;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const textOf = (h) => decode(h.replace(/<[^>]*>/g, ''));
const count = (h, re) => (h.match(re) || []).length;
const hasClass = (cls) => new RegExp(`class="[^"]*\\b${cls}\\b[^"]*"`);

/* ── load files ──────────────────────────────────────────────── */
for (const f of ['_base.html', '_footer.html', 'styles.css', 'main.js']) {
  if (!existsSync(join(DIR, f))) err(f, 'missing (copy it from the skill references/ folder)');
}
const modulesDir = join(DIR, 'modules');
const moduleFiles = existsSync(modulesDir)
  ? readdirSync(modulesDir).filter((f) => f.endsWith('.html'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  : [];
if (!moduleFiles.length) err('modules/', 'no module files found (expected modules/01-*.html ...)');
if (errors.length) finish();

const baseRaw = read('_base.html');
const base = stripComments(baseRaw);
const footer = read('_footer.html');
const modules = moduleFiles.map((f) => ({ file: `modules/${f}`, html: readFileSync(join(modulesDir, f), 'utf8') }));

/* ── 1. leftover template placeholders ───────────────────────── */
for (const m of base.matchAll(/\b(COURSE_TITLE|ACCENT_COLOR|ACCENT_HOVER|ACCENT_LIGHT|ACCENT_MUTED|NAV_DOTS|MODULE_\d+_NAME)\b/g)) {
  err('_base.html', `placeholder "${m[1]}" was never replaced`);
}

/* ── 2. module structure ─────────────────────────────────────── */
const moduleIds = [];
for (const m of modules) {
  const h = stripComments(m.html);
  m.clean = h;

  for (const t of h.matchAll(/<\/?(html|head|body|script|style)\b/gi)) {
    err(m.file, `contains <${t[1]}> — module files may only contain the <section class="module"> block`);
  }
  const sections = [...h.matchAll(/<section\b[^>]*>/g)].filter((s) => hasClass('module').test(s[0]));
  if (sections.length !== 1) {
    err(m.file, `must contain exactly one <section class="module"> (found ${sections.length})`);
    continue;
  }
  const id = (sections[0][0].match(/\bid="([^"]+)"/) || [])[1];
  if (!id) { err(m.file, '<section class="module"> has no id'); continue; }
  m.id = id;
  moduleIds.push(id);

  // balanced tags (a stray/missing </div> silently wrecks the layout)
  for (const tag of ['div', 'section', 'span', 'pre', 'code', 'button']) {
    const opens = count(h, new RegExp(`<${tag}\\b[^>]*(?<!/)>`, 'g'));
    const closes = count(h, new RegExp(`</${tag}>`, 'g'));
    if (opens !== closes) err(m.file, `unbalanced <${tag}>: ${opens} opening vs ${closes} closing`);
  }
}
const dupMods = moduleIds.filter((id, i) => moduleIds.indexOf(id) !== i);
for (const id of new Set(dupMods)) err('modules/', `duplicate module id "${id}"`);

/* ── 3. nav dots vs modules (main.js pairs them by position) ─── */
const dotTargets = [...base.matchAll(/<button\b[^>]*>/g)]
  .filter((b) => hasClass('nav-dot').test(b[0]))
  .map((b) => (b[0].match(/data-target="([^"]+)"/) || [])[1]);
if (dotTargets.length !== moduleIds.length) {
  err('_base.html', `${dotTargets.length} nav dot(s) but ${moduleIds.length} module(s) — they must match one-to-one`);
} else {
  dotTargets.forEach((t, i) => {
    if (t !== moduleIds[i]) err('_base.html', `nav dot ${i + 1} targets "${t}" but module ${i + 1} is "${moduleIds[i]}"`);
  });
}

/* ── 4. ids, onclick targets, data-steps ─────────────────────── */
const all = stripComments(base) + modules.map((m) => m.clean || '').join('\n') + stripComments(footer);
const idCounts = {};
for (const m of all.matchAll(/\bid="([^"]+)"/g)) idCounts[m[1]] = (idCounts[m[1]] || 0) + 1;

for (const m of modules) {
  const h = m.clean || '';
  for (const c of h.matchAll(/\b(checkQuiz|resetQuiz|checkDnD|resetDnD)\(\s*'([^']+)'\s*\)/g)) {
    if (!idCounts[c[2]]) err(m.file, `${c[1]}('${c[2]}') points to an id that does not exist`);
  }

  for (const s of h.matchAll(/data-steps=(?:'([^']*)'|"([^"]*)")/g)) {
    const raw = decode(s[1] ?? s[2] ?? '');
    let steps;
    try {
      steps = JSON.parse(raw);
      if (!Array.isArray(steps)) throw new Error('not a JSON array');
    } catch (e) {
      err(m.file, `invalid data-steps JSON (${e.message}). Most often an apostrophe inside single-quoted data-steps — use &apos; or avoid it.`);
      continue;
    }
    steps.forEach((st, i) => {
      if (typeof st.label !== 'string') warn(m.file, `data-steps step ${i + 1} has no "label"`);
      if (st.highlight && !idCounts[st.highlight] && !idCounts['flow-' + st.highlight]) {
        warn(m.file, `data-steps step ${i + 1}: highlight "${st.highlight}" matches no element id`);
      }
      if (st.packet) {
        for (const k of ['from', 'to']) {
          if (!st[k] || !idCounts['flow-' + st[k]]) warn(m.file, `data-steps step ${i + 1}: packet "${k}" ("${st[k]}") needs an element with id "flow-${st[k]}"`);
        }
      }
    });
  }
}
for (const [id, n] of Object.entries(idCounts)) {
  if (n < 2) continue;
  if (/^flow-actor/.test(id)) warn('course', `id "${id}" appears ${n} times — flow animations look actors up by global id, so packets can animate between the wrong elements; give each animation unique actor ids`);
  else if (!/^(flow-packet|flow-label|typing-avatar)/.test(id)) warn('course', `id "${id}" appears ${n} times`);
}

/* ── 5. code blocks: must be HTML-escaped ────────────────────── */
for (const m of modules) {
  const h = m.clean || '';
  for (const blk of h.matchAll(/<pre\b[^>]*>([\s\S]*?)<\/pre>/g)) {
    const bad = new Set();
    for (const t of blk[1].matchAll(/<\/?([a-zA-Z][\w-]*)/g)) {
      if (!['span', 'code', 'br', 'wbr'].includes(t[1].toLowerCase())) bad.add(`<${t[1]}>`);
    }
    if (bad.size) err(m.file, `unescaped HTML inside a code block: ${[...bad].join(', ')} — write "&lt;" and "&amp;" in code so the learner sees the real source`);
  }
}

/* ── 6. suspected secrets (the course is meant to be shared) ─── */
const SECRET_PATTERNS = [
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})\b/],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
  ['Stripe live key', /\b[sr]k_live_[A-Za-z0-9]{16,}\b/],
  ['API secret key (sk-...)', /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{32,}\b/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['Private key block', /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/],
  ['JWT', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ['Hard-coded credential', /(?:api[_-]?key|secret|token|passw(?:or)?d)["']?\s*[:=]\s*["'][A-Za-z0-9/+_\-]{20,}["']/i],
];
if (!ALLOW_SECRETS) {
  for (const m of modules) {
    const text = textOf(m.clean || '');
    for (const [name, re] of SECRET_PATTERNS) {
      const hit = text.match(re);
      if (hit) err(m.file, `possible secret (${name}): "${hit[0].slice(0, 6)}…" — pick another snippet or redact it. Re-run with --allow-secrets only after confirming it is a placeholder`);
    }
  }
}

/* ── 7. content checks (warnings) ────────────────────────────── */
let chats = 0, flows = 0;
for (const m of modules) {
  const h = m.clean || '';
  const w = (msg) => warn(m.file, msg);
  chats += count(h, /class="[^"]*\bchat-window\b/g);
  flows += count(h, /class="[^"]*\bflow-animation\b/g);

  if (!/class="[^"]*\btranslation-block\b/.test(h)) w('no code ↔ English translation block (required once per module)');
  if (!/class="[^"]*\b(quiz-question-block|dnd-container|bug-challenge)\b/.test(h)) w('no quiz (required once per module)');
  if (!/class="[^"]*\b(quiz-question-block|dnd-container|bug-challenge|chat-window|flow-animation|arch-diagram|layer-demo)\b/.test(h)) w('no interactive element');
  const terms = count(h, /class="[^"]*\bterm\b[^"]*"/g);
  if (terms < 3) w(`only ${terms} glossary tooltip(s) — err heavily on the side of too many`);

  let walls = 0;
  for (const p of h.matchAll(/<p\b(?![^>]*\bclass="[^"]*\btl\b)[^>]*>([\s\S]*?)<\/p>/g)) {
    if (count(textOf(p[1]), /[.!?](?:\s|$)/g) > 4) walls++;
  }
  if (walls) w(`${walls} paragraph(s) with more than 4 sentences — turn into a visual (see "Walls of Text")`);
}
if (!chats) warn('course', 'no group chat animation anywhere (SKILL.md lists it as required)');
if (!flows) warn('course', 'no data/message flow animation anywhere (SKILL.md lists it as required)');

/* ── finish ──────────────────────────────────────────────────── */
function finish() {
  const failed = errors.length > 0 || (STRICT && warnings.length > 0);
  if (errors.length) {
    console.error(`\n✖ ${errors.length} error(s) — index.html NOT written:`);
    errors.forEach((e) => console.error('  • ' + e));
  }
  if (warnings.length) {
    (STRICT ? console.error : console.warn)(`\n⚠ ${warnings.length} warning(s)${STRICT ? ' (--strict: treated as errors)' : ''}:`);
    warnings.forEach((w) => (STRICT ? console.error : console.warn)('  • ' + w));
  }
  if (failed) process.exit(1);
}

const out = baseRaw + '\n' + modules.map((m) => m.html).join('\n') + '\n' + footer;
finish();
writeFileSync(join(DIR, 'index.html'), out);
console.log(`\n✔ Built index.html — ${modules.length} module(s), ${dotTargets.length} nav dot(s), ${warnings.length} warning(s). Open it in your browser.`);
