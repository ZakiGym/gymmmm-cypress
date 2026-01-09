import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

const OPENAPI_PATH = path.join(repoRoot, 'openapi', 'gymmm.openapi.json');
const RUNTIME_PATH = path.join(repoRoot, 'reports', 'runtime-endpoints.json');

const OUT_JSON = path.join(repoRoot, 'reports', 'endpoint-coverage.runtime.json');
const OUT_MD = path.join(repoRoot, 'reports', 'ENDPOINT_COVERAGE_RUNTIME.md');

function normalizeTpl(s) {
  return String(s)
    .replace(/\{[^}]+\}/g, '{id}')
    .replace(/\b[0-9a-f]{24}\b/gi, '{id}')
    .replace(/\b\d+\b/g, '{id}');
}

function extractOpenapiEndpoints(openapi) {
  const endpoints = [];
  const pathsObj = openapi.paths || {};

  for (const [p, methods] of Object.entries(pathsObj)) {
    // OpenAPI spec uses paths without the server prefix. Ensure /api prefix.
    const apiPath = p.startsWith('/api/') ? p : `/api${p.startsWith('/') ? '' : '/'}${p}`;

    for (const [m] of Object.entries(methods || {})) {
      const method = String(m).toUpperCase();
      if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) continue;
      endpoints.push(`${method} ${normalizeTpl(apiPath)}`);
    }
  }

  return Array.from(new Set(endpoints)).sort();
}

function main() {
  if (!fs.existsSync(OPENAPI_PATH)) throw new Error(`Missing OpenAPI file: ${OPENAPI_PATH}`);
  if (!fs.existsSync(RUNTIME_PATH)) {
    throw new Error(
      `Missing runtime endpoint capture file: ${RUNTIME_PATH}\n` +
        `Run Cypress once to generate it (it is written automatically at the end of a run).`,
    );
  }

  const openapi = JSON.parse(fs.readFileSync(OPENAPI_PATH, 'utf8'));
  const openapiEndpoints = extractOpenapiEndpoints(openapi);

  const runtime = JSON.parse(fs.readFileSync(RUNTIME_PATH, 'utf8'));
  const runtimeEndpoints = new Set(
    (runtime.endpoints || []).map((e) => normalizeTpl(String(e.endpoint || ''))),
  );

  const covered = [];
  const missing = [];

  for (const ep of openapiEndpoints) {
    if (runtimeEndpoints.has(ep)) covered.push(ep);
    else missing.push(ep);
  }

  const result = {
    generatedAt: new Date().toISOString(),
    openapiEndpoints: openapiEndpoints.length,
    runtimeUniqueEndpoints: runtimeEndpoints.size,
    coveredEndpoints: covered.length,
    missingEndpoints: missing.length,
    covered,
    missing,
    note:
      'This compares OpenAPI endpoints to runtime-captured HTTP calls made during Cypress runs (method + normalized path). Run more specs to increase coverage.',
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(result, null, 2));

  const pct = result.openapiEndpoints ? Math.round((result.coveredEndpoints / result.openapiEndpoints) * 1000) / 10 : 0;

  const md = [
    '# Endpoint Coverage vs OpenAPI (Runtime)',
    '',
    `Generated at: ${result.generatedAt}`,
    '',
    'This compares OpenAPI endpoints to **runtime-captured HTTP calls** made during Cypress runs.',
    '',
    `- OpenAPI endpoints: **${result.openapiEndpoints}**`,
    `- Unique runtime endpoints captured: **${result.runtimeUniqueEndpoints}**`,
    `- Covered (OpenAPI ∩ runtime): **${result.coveredEndpoints}**`,
    `- Missing: **${result.missingEndpoints}**`,
    `- Coverage: **${pct}%**`,
    '',
    '## Missing endpoints',
    '',
    ...missing.map((m) => `- ${m}`),
    '',
  ].join('\n');

  fs.writeFileSync(OUT_MD, md);
  // eslint-disable-next-line no-console
  console.log(`openapi ${result.openapiEndpoints} covered ${result.coveredEndpoints} missing ${result.missingEndpoints} (${pct}%)`);
}

main();
