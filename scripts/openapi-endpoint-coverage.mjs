import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

const OPENAPI_PATH = path.join(repoRoot, 'openapi', 'gymmm.openapi.json');
const OUT_JSON = path.join(repoRoot, 'reports', 'endpoint-coverage.openapi.json');
const OUT_MD = path.join(repoRoot, 'reports', 'ENDPOINT_COVERAGE_OPENAPI.md');

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function normalizeTpl(s) {
  return s
    .replace(/\{[^}]+\}/g, '{id}')
    .replace(/\b[0-9a-f]{24}\b/gi, '{id}')
    .replace(/\b\d+\b/g, '{id}');
}

function extractOpenapiEndpoints(openapi) {
  const endpoints = [];
  const pathsObj = openapi.paths || {};
  for (const [p, methods] of Object.entries(pathsObj)) {
    // OpenAPI paths are defined without the global "/api" prefix.
    // Our Cypress specs and runtime traffic hit "/api/...", so normalize here.
    const apiPath = p.startsWith('/api/') ? p : `/api${p.startsWith('/') ? '' : '/'}${p}`;
    for (const [m] of Object.entries(methods || {})) {
      const method = String(m).toUpperCase();
      if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) continue;
      endpoints.push(`${method} ${normalizeTpl(apiPath)}`);
    }
  }
  return Array.from(new Set(endpoints)).sort();
}

function extractCoveredFromSpecs(specPaths) {
  const covered = new Set();
  for (const file of specPaths) {
    const txt = fs.readFileSync(file, 'utf8');

    // Ultra-simple static matcher: look for occurrences of '/api/...' and also API_PREFIX + '/...'
    // We'll collect likely endpoint paths and later map them to OpenAPI templates.
    const hits = new Set();

    const apiAbs = txt.match(/['"`]\/api\/[^'"`\s)]+/g) || [];
    for (const h of apiAbs) hits.add(normalizeTpl(h.replace(/^['"`]/, '')));

    const apiRel = txt.match(/API_PREFIX\}\s*\+\s*['"`]\/?[^'"`\s)]+/g) || [];
    for (const h of apiRel) {
      const m = h.match(/['"`]\/?([^'"`\s)]+)/);
      if (m?.[1]) hits.add(normalizeTpl(`/api/${m[1].replace(/^\//, '')}`));
    }

    // Also collect explicit method+path mentions like "GET /api/foo"
    const explicit = txt.match(/\b(GET|POST|PUT|PATCH|DELETE)\s+\/api\/[^\s'"`]+/g) || [];
    for (const e of explicit) {
      const mm = e.match(/\b(GET|POST|PUT|PATCH|DELETE)\s+(\/api\/[^\s'"`]+)/);
      if (mm) covered.add(`${mm[1]} ${normalizeTpl(mm[2])}`);
    }

    // If we only saw paths, record as "ANY {path}". We'll later match these against OpenAPI as covered for all methods.
    for (const p of hits) covered.add(`ANY ${p}`);
  }
  return covered;
}

function main() {
  if (!fs.existsSync(OPENAPI_PATH)) {
    throw new Error(`Missing OpenAPI file at ${OPENAPI_PATH}`);
  }
  const openapi = JSON.parse(fs.readFileSync(OPENAPI_PATH, 'utf8'));
  const openapiEndpoints = extractOpenapiEndpoints(openapi);

  const specRoot = path.join(repoRoot, 'cypress', 'e2e');
  const specFiles = walk(specRoot).filter((p) => p.endsWith('.cy.ts') || p.endsWith('.cy.js'));
  const coveredRaw = extractCoveredFromSpecs(specFiles);

  const coveredEndpoints = new Set();

  for (const ep of openapiEndpoints) {
    const [method, p] = ep.split(' ');
    if (coveredRaw.has(ep)) {
      coveredEndpoints.add(ep);
      continue;
    }
    // any-path match
    if (coveredRaw.has(`ANY ${p}`)) {
      coveredEndpoints.add(ep);
    }
  }

  const missing = openapiEndpoints.filter((ep) => !coveredEndpoints.has(ep));

  const result = {
    generatedAt: new Date().toISOString(),
    openapiEndpoints: openapiEndpoints.length,
    coveredEndpoints: coveredEndpoints.size,
    missingEndpoints: missing.length,
    missing,
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(result, null, 2));

  const md = [
    '# Endpoint Coverage vs OpenAPI',
    '',
    `Generated at: ${new Date().toISOString()}`,
    '',
    'This compares **OpenAPI endpoints** (from `openapi/gymmm.openapi.json`) to **static string matches** inside Cypress specs under `cypress/e2e/**`.',
    '',
    `- OpenAPI endpoints: **${result.openapiEndpoints}**`,
    `- Covered by static match: **${result.coveredEndpoints}**`,
    `- Missing (not statically matched): **${result.missingEndpoints}**`,
    '',
    '> Note: This is a strict static matcher. If a spec builds URLs dynamically or only hits endpoints via browser UI traffic, it may be under-counted here.',
    '',
    '## Missing endpoints (left out)',
    '',
    ...missing.map((m) => `- ${m}`),
    '',
  ].join('\n');

  fs.writeFileSync(OUT_MD, md);

  // Print summary for terminal runs
  // eslint-disable-next-line no-console
  console.log(`openapi ${result.openapiEndpoints} covered ${result.coveredEndpoints} missing ${result.missingEndpoints}`);
}

main();
