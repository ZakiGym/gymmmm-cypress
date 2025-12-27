// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    // Default to production, but allow overrides:
    // - CLI/env: CYPRESS_baseUrl=http://localhost:10000
    // - config: cypress.env.json can still provide creds/ids
    baseUrl: process.env.CYPRESS_baseUrl || 'https://api-gymmm.onrender.com',
    specPattern: 'cypress/e2e/**/*.cy.{js,ts}',
    supportFile: 'cypress/support/e2e.ts',
    defaultCommandTimeout: 15000,
    video: false,
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