#!/usr/bin/env node
// Audit Lighthouse mobile, médiane de N passes, comparé au budget du plugin.
//
//   node lighthouse-budget.mjs <url> [<url>…] [--runs 3] [--desktop] [--out dossier]
//
// Nécessite Chrome installé (Lighthouse le pilote) ; Lighthouse est lancé par npx (rien à installer).
// Budget (mobile) : performance >= 90, accessibilité >= 90, bonnes pratiques >= 90, SEO >= 90,
// LCP < 2500 ms, TBT < 200 ms, CLS <= 0.01 (cible 0), poids total < 1600 Ko.
// Sur un site derrière la CloudFront Function du plugin : l'agent de Lighthouse (« Chrome-Lighthouse »)
// est dans la liste autorisée ; HeadlessChrome est bloqué, d'où --chrome-flags sans --headless=old.
// Sortie : tableau par URL (médiane), rapports JSON dans --out, code 1 si un budget est dépassé.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const runs = Number(flag('runs', 3));
const desktop = argv.includes('--desktop');
const out = flag('out', join(process.cwd(), 'lighthouse'));
const urls = argv.filter((a, i) => !a.startsWith('--') && !['--runs', '--out'].includes(argv[i - 1]));
if (!urls.length) {
  console.error('Usage : node lighthouse-budget.mjs <url> [<url>…] [--runs 3] [--desktop] [--out dossier]');
  process.exit(2);
}
mkdirSync(out, { recursive: true });

const BUDGET = {
  performance: { min: 90 },
  accessibility: { min: 90 },
  'best-practices': { min: 90 },
  seo: { min: 90 },
  lcp: { max: 2500, audit: 'largest-contentful-paint' },
  tbt: { max: 200, audit: 'total-blocking-time' },
  cls: { max: 0.01, audit: 'cumulative-layout-shift' },
  weightKb: { max: 1600, audit: 'total-byte-weight', scale: 1 / 1024 },
};
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

let failed = false;
for (const url of urls) {
  const results = [];
  for (let i = 0; i < runs; i++) {
    const file = join(out, `${new URL(url).pathname.replace(/\W+/g, '_') || 'root'}-${i + 1}.json`);
    execFileSync(
      'npx',
      [
        '-y', 'lighthouse@latest', url, '--quiet', '--output=json', `--output-path=${file}`,
        '--only-categories=performance,accessibility,best-practices,seo',
        ...(desktop ? ['--preset=desktop'] : []),
        '--chrome-flags=--headless=new --no-sandbox',
      ],
      { stdio: 'inherit', shell: process.platform === 'win32' },
    );
    results.push(JSON.parse(readFileSync(file, 'utf8')));
  }
  const row = {};
  for (const [key, rule] of Object.entries(BUDGET)) {
    const values = results.map((r) =>
      rule.audit ? r.audits[rule.audit].numericValue * (rule.scale ?? 1) : r.categories[key].score * 100,
    );
    const value = median(values);
    const ok = rule.min !== undefined ? value >= rule.min : value <= rule.max;
    if (!ok) failed = true;
    row[key] = `${Number.isInteger(value) ? value : value.toFixed(key === 'cls' ? 3 : 0)}${ok ? '' : ' ✗'}`;
  }
  const lcpElement = results[0].audits['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.snippet;
  console.log(`\n${url} (médiane de ${runs}, ${desktop ? 'ordinateur' : 'mobile'})`);
  console.table(row);
  if (lcpElement) console.log(`Élément LCP : ${lcpElement}`);
}
process.exit(failed ? 1 : 0);
