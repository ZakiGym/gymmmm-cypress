import { getUiBaseUrl } from '../../support/ui';

/**
 * UI smoke tests (P0).
 *
 * Best practice notes:
 * - Requires stable selectors in the web app via `data-cy`.
 * - Requires Cypress env UI_BASE_URL (e.g. CYPRESS_UI_BASE_URL=https://your-frontend.app).
 * - These tests are designed to be expanded once routes/selectors are confirmed.
 */

describe('UI: smoke (P0)', () => {
  it('loads the UI home page', () => {
    const uiBase = getUiBaseUrl();
    cy.visit(uiBase);
    cy.location('href').should('include', uiBase);
    // Basic smoke: the document should load.
    cy.document().its('readyState').should('eq', 'complete');
  });

  it('admin can obtain a token (API-backed)', () => {
    cy.getPortalToken('admin').then((token) => {
      expect(token).to.be.a('string');
      expect(token.length, 'token length').to.be.greaterThan(0);
    });
  });
});
