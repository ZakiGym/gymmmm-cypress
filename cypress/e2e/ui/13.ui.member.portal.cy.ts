import { getUiBaseUrl } from '../../support/ui';

describe('UI: member portal (token-auth)', () => {
  it('boots successfully and loads member-facing API data', () => {
    const uiBase = getUiBaseUrl();
    cy.uiLoginWithToken('member');

    cy.location('pathname', { timeout: 45_000 }).should('not.include', '/auth/login');
    cy.document().its('readyState').should('eq', 'complete');

    cy.getPortalToken('member').then((token) => {
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

    cy.window().then((win) => {
      expect(win.localStorage.getItem('token') || win.localStorage.getItem('accessToken')).to
        .be.a('string');
    });
  });
});
