import { getUiBaseUrl } from '../../../support/ui';

/**
 * Admin portal UI suite (token-auth, network-assertions).
 *
 * Why this design:
 * - avoids brittle selectors on a live production UI
 * - validates the portal is functional by asserting key API calls succeed
 * - keeps long-term maintainability: the UI can change layout/DOM without breaking tests
 */

describe('Admin - Portal - boot with token auth', () => {
  it('Admin - Portal - boot and validate auth/me', () => {
    const uiBase = getUiBaseUrl();
    cy.uiLoginWithToken('admin');

    cy.location('pathname', { timeout: 45_000 }).should('not.include', '/auth/login');
    cy.document().its('readyState').should('eq', 'complete');

    // Deterministic portal signal: we can hit auth/me with the token.
    cy.getPortalToken('admin').then((token) => {
      const apiHost = String(Cypress.config('baseUrl') || '').replace(/\/$/, '');
      const authMeUrl = `${apiHost}/api/auth/me`;
      cy.request({
        method: 'GET',
        url: authMeUrl,
        headers: { Authorization: `Bearer ${token}` },
      }).then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.have.property('id');
      });
    });

    // Basic smoke that UI loaded and ran.
    cy.window().then((win) => {
      expect(win.localStorage.getItem('token') || win.localStorage.getItem('accessToken')).to.be
        .a('string');
    });
  });
});
