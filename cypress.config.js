// cypress.config.js
// Keep this file CJS-compatible (no top-level await) so Cypress can load it in
// all environments.
const { defineConfig } = require('cypress');
const fs = require('node:fs');
const path = require('node:path');

module.exports = defineConfig({
  e2e: {
    // Default to production, but allow overrides:
    // - CLI/env: CYPRESS_baseUrl=http://localhost:10000
    // - config: cypress.env.json can still provide creds/ids
    baseUrl: process.env.CYPRESS_baseUrl || 'https://api-gymmm.onrender.com',
    specPattern: 'cypress/e2e/**/*.cy.{js,ts}',
    supportFile: 'cypress/support/e2e.ts',
    defaultCommandTimeout: 15000,
    // Flakiness guardrails: retries only in `cypress run` (CI/runMode), not in interactive openMode.
    // Keep low to avoid masking real issues.
    retries: {
      runMode: Number(process.env.CYPRESS_RETRIES || 1),
      openMode: 0,
    },
    video: false,
    setupNodeEvents(on, config) {
      // Runtime endpoint capture (method + pathname) for OpenAPI coverage comparison.
      // This is intentionally minimal: we only track requests to /api/**.
      const repoRoot = config.projectRoot || process.cwd();
      const outPath = path.join(repoRoot, 'reports', 'runtime-endpoints.json');

      /** @type {Map<string, number>} */
      const counts = new Map();

      const normalize = (p) => String(p || '')
        .replace(/\?.*$/, '')
        .replace(/\/[0-9a-f]{24}(?=\/|$)/gi, '/{id}')
        .replace(/\/(\d+)(?=\/|$)/g, '/{id}');

      const record = (method, pathname) => {
        const m = String(method || '').toUpperCase();
        const p = normalize(pathname);
        if (!p.startsWith('/api/')) return;
        const key = `${m} ${p}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      };

      on('task', {
        'runtime:reset'() {
          // Load existing counts so results accumulate across specs.
          counts.clear();
          try {
            if (fs.existsSync(outPath)) {
              const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
              if (existing && Array.isArray(existing.endpoints)) {
                for (const e of existing.endpoints) {
                  if (e && typeof e.endpoint === 'string') {
                    counts.set(e.endpoint, Number(e.count || 0));
                  }
                }
              }
            }
          } catch {
            // ignore parse errors
          }
          return null;
        },
        'runtime:record'(payload) {
          if (payload && typeof payload === 'object') {
            if (Array.isArray(payload.batch)) {
              // eslint-disable-next-line no-console
              console.log(`[runtime] record batch size=${payload.batch.length}`);
              for (const item of payload.batch) {
                if (item && typeof item === 'object') record(item.method, item.pathname);
              }
            } else {
              // eslint-disable-next-line no-console
              console.log('[runtime] record single');
              record(payload.method, payload.pathname);
            }
          }
          return null;
        },
        'runtime:write'() {
          fs.mkdirSync(path.dirname(outPath), { recursive: true });
          const endpoints = Array.from(counts.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([endpoint, count]) => ({ endpoint, count }));

          fs.writeFileSync(
            outPath,
            JSON.stringify(
              {
                generatedAt: new Date().toISOString(),
                totalUnique: endpoints.length,
                endpoints,
              },
              null,
              2,
            ),
          );
          return outPath;
        },
      });

      return config;
    },
  },
  env: {
    // fill real values via cypress.env.json or CI env
    GYM_ID: '690dd58eb250ac19d4a39ff4',
    PRICE_ID: 'price_abc123',
    // ADMIN_EMAIL, ADMIN_PASSWORD, SUPER_EMAIL, SUPER_PASSWORD, MEMBER_ID

    // UI base URL (override in CI/local with: CYPRESS_UI_BASE_URL=https://www.gymmm.app)
    UI_BASE_URL: process.env.CYPRESS_UI_BASE_URL || 'https://www.gymmm.app',
  },
});