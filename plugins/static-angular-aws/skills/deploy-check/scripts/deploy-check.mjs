#!/usr/bin/env node
// Vérifie la configuration de déploiement d'un projet static-angular-aws. LECTURE SEULE.
//
//   node deploy-check.mjs [--root <projet>] [--aws] [--github]
//
// Sans option : contrôles locaux (placeholders, policies, Function générée à jour, workflows).
// --aws    : appels AWS en lecture seule et gratuits (sts, s3api get-*, cloudfront get-*/describe-*).
//            Jamais de commande qui crée, modifie ou facture (ni Cost Explorer).
// --github : variables de l'environnement GitHub « production » (gh CLI connecté).
// Code de sortie 1 si une erreur est trouvée ; les avertissements n'échouent pas.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const root = resolve(argv.includes('--root') ? argv[argv.indexOf('--root') + 1] : process.cwd());
const errors = [];
const warnings = [];
const ok = [];
const read = (p) => (existsSync(join(root, p)) ? readFileSync(join(root, p), 'utf8') : null);
const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

// ---------- local ----------
for (const file of [
  'infra/github-oidc/trust-policy.json',
  'infra/github-oidc/deploy-policy.json',
  'web/src/environments/environment.ts',
  'site.config.mjs',
]) {
  const content = read(file);
  if (content === null) {
    warnings.push(`${file} absent`);
    continue;
  }
  const left = content.match(/<[A-Z_]+>|\{\{[A-Z_]+\}\}/g);
  if (left) errors.push(`${file} : placeholder restant ${[...new Set(left)].join(', ')}`);
  else ok.push(`${file} : aucun placeholder`);
}

const trust = read('infra/github-oidc/trust-policy.json');
if (trust) {
  const sub = /"token\.actions\.githubusercontent\.com:sub":\s*"([^"]+)"/.exec(trust)?.[1];
  if (!sub) errors.push('trust-policy : condition :sub absente (tout dépôt pourrait assumer le rôle)');
  else if (!/:environment:production$/.test(sub)) warnings.push(`trust-policy : sub « ${sub} » non limité à l'environnement production`);
  else ok.push(`trust-policy : sub ${sub}`);
  if (/StringLike/.test(trust) && /\*/.test(sub ?? '')) warnings.push('trust-policy : joker dans le sub (StringLike) : préférer StringEquals');
}

const deployPolicy = read('infra/github-oidc/deploy-policy.json');
if (deployPolicy && /"Resource":\s*"\*"|"Action":\s*"(s3|cloudfront):\*"/.test(deployPolicy)) {
  errors.push('deploy-policy : droits trop larges (Resource "*" ou action "*")');
}

const deployYml = read('.github/workflows/deploy.yml');
if (!deployYml) errors.push('.github/workflows/deploy.yml absent');
else {
  if (!/id-token:\s*write/.test(deployYml)) errors.push('deploy.yml : permission id-token: write manquante (OIDC)');
  if (/aws-access-key-id|AWS_SECRET_ACCESS_KEY/.test(deployYml)) errors.push('deploy.yml : clés AWS statiques : utiliser OIDC');
  if (!/environment:\s*\n\s*name:\s*production|environment:\s*production/.test(deployYml)) warnings.push("deploy.yml : pas d'environnement production (le sub OIDC ne correspondra pas)");
  if (/branches:\s*\[main\]/.test(deployYml)) ok.push('deploy.yml : déclenché sur main');
}

const fn = read('infra/cloudfront/viewer-request.js');
if (fn !== null) {
  if (Buffer.byteLength(fn) > 10240) errors.push('viewer-request.js > 10 Ko');
  try {
    run('node', [join(root, 'scripts', 'build-cloudfront-function.mjs')]);
    if (read('infra/cloudfront/viewer-request.js') !== fn) errors.push('viewer-request.js n\'était pas à jour (régénéré : le commiter et republier la fonction)');
    run('node', [join(root, 'scripts', 'check-cloudfront-function.mjs'), '--root', root]);
    ok.push('CloudFront Function à jour et contrôlée');
  } catch (e) {
    errors.push(`CloudFront Function : ${(e.stderr || e.message).toString().trim().split('\n').slice(0, 4).join(' | ')}`);
  }
} else warnings.push('infra/cloudfront/viewer-request.js absent (node scripts/build-cloudfront-function.mjs)');

if (/(AKIA|ASIA)[A-Z0-9]{16}/.test([read('.mcp.json'), deployYml, read('web/src/environments/environment.ts')].join('\n'))) {
  errors.push('clé AWS en clair dans le dépôt');
}

// ---------- GitHub ----------
let vars = {};
if (argv.includes('--github')) {
  try {
    vars = Object.fromEntries(
      JSON.parse(run('gh', ['variable', 'list', '--env', 'production', '--json', 'name,value'])).map((v) => [v.name, v.value]),
    );
    for (const name of ['AWS_ROLE_ARN', 'AWS_REGION', 'S3_BUCKET', 'CLOUDFRONT_DISTRIBUTION_ID']) {
      if (!vars[name]) errors.push(`variable GitHub ${name} manquante (environnement production)`);
    }
    if (/^(arn:|s3:\/\/)/.test(vars.S3_BUCKET ?? '')) errors.push('S3_BUCKET doit être le nom seul du bucket (sans arn: ni s3://)');
    if (vars.AWS_ROLE_ARN && !/^arn:aws:iam::\d{12}:role\//.test(vars.AWS_ROLE_ARN)) errors.push('AWS_ROLE_ARN mal formé');
    ok.push(`GitHub : ${Object.keys(vars).length} variable(s) en production`);
  } catch (e) {
    warnings.push(`gh indisponible ou non connecté : ${e.message.split('\n')[0]}`);
  }
}

// ---------- AWS (lecture seule, gratuit) ----------
if (argv.includes('--aws')) {
  const bucket = vars.S3_BUCKET ?? process.env.S3_BUCKET;
  const distribution = vars.CLOUDFRONT_DISTRIBUTION_ID ?? process.env.CLOUDFRONT_DISTRIBUTION_ID;
  try {
    ok.push(`AWS : connecté en ${run('aws', ['sts', 'get-caller-identity', '--query', 'Arn', '--output', 'text'])}`);
  } catch {
    errors.push('AWS : non connecté (aws login / aws sso login)');
  }
  if (bucket) {
    try {
      const pab = JSON.parse(run('aws', ['s3api', 'get-public-access-block', '--bucket', bucket]));
      const all = Object.values(pab.PublicAccessBlockConfiguration).every(Boolean);
      (all ? ok : errors).push(`bucket ${bucket} : blocage de l'accès public ${all ? 'complet' : 'INCOMPLET'}`);
    } catch (e) {
      errors.push(`bucket ${bucket} : ${e.stderr?.toString().trim() || e.message}`);
    }
  } else warnings.push('S3_BUCKET inconnu (--github ou variable d\'environnement)');
  if (distribution) {
    try {
      const cfg = JSON.parse(run('aws', ['cloudfront', 'get-distribution-config', '--id', distribution])).DistributionConfig;
      const assoc = cfg.DefaultCacheBehavior.FunctionAssociations?.Items ?? [];
      const viewerReq = assoc.find((a) => a.EventType === 'viewer-request');
      if (!viewerReq) errors.push('distribution : aucune Function viewer-request sur le comportement par défaut (→ AccessDenied XML sur /page)');
      else ok.push(`distribution : Function ${viewerReq.FunctionARN.split('/').pop()} associée`);
      const oac = cfg.Origins.Items.every((o) => !o.S3OriginConfig || o.OriginAccessControlId);
      (oac ? ok : errors).push(`origines S3 ${oac ? 'avec OAC' : 'SANS OAC (bucket public ou OAI ancien)'}`);
      const errorsPages = (cfg.CustomErrorResponses?.Items ?? []).map((r) => `${r.ErrorCode}->${r.ResponsePagePath}`);
      if (!errorsPages.some((r) => r.startsWith('404->/404.html'))) warnings.push('pas de page d\'erreur 404 -> /404.html');
      if (cfg.DefaultCacheBehavior.ViewerProtocolPolicy === 'allow-all') errors.push('HTTP non redirigé vers HTTPS');
      if (!cfg.DefaultCacheBehavior.Compress) warnings.push('compression automatique désactivée');
      if (cfg.Logging?.Enabled) warnings.push('journaux standard activés (stockage S3 facturé)');
      if (viewerReq) {
        const name = viewerReq.FunctionARN.split('/').pop();
        const live = run('aws', ['cloudfront', 'describe-function', '--name', name, '--stage', 'LIVE', '--query', 'FunctionSummary.FunctionMetadata.LastModifiedTime', '--output', 'text']);
        ok.push(`Function LIVE modifiée le ${live}`);
      }
    } catch (e) {
      errors.push(`distribution ${distribution} : ${e.stderr?.toString().trim() || e.message}`);
    }
  } else warnings.push('CLOUDFRONT_DISTRIBUTION_ID inconnu (--github ou variable d\'environnement)');
}

for (const line of ok) console.log(`✔ ${line}`);
for (const line of warnings) console.log(`! ${line}`);
for (const line of errors) console.log(`✘ ${line}`);
console.log(`\ndeploy-check : ${errors.length} erreur(s), ${warnings.length} avertissement(s)`);
process.exit(errors.length ? 1 : 0);
