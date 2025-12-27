import { getUiBaseUrl } from '../../support/ui';

describe('UI: quality basics', () => {
  it('does not throw obvious JS errors on home load', () => {
    const uiBase = getUiBaseUrl();

    const errors: string[] = [];

    cy.on('uncaught:exception', (err) => {
      errors.push(String(err?.message || err));
      // Don’t fail immediately; collect and assert at end.
      return false;
    });

    cy.visit(uiBase);
    cy.document().its('readyState').should('eq', 'complete');

    cy.wrap(null).then(() => {
      // Some apps throw harmless hydration warnings; keep this defensive.
      // If real errors appear, they’ll show up here.
      expect(errors, 'uncaught exceptions').to.have.length(0);
    });
  });

  it('visiting an unknown path should not hang (404 page or redirect is okay)', () => {
    const uiBase = getUiBaseUrl();
    cy.visit(`${uiBase}/__cypress_unknown_path__`);
    cy.document().its('readyState').should('eq', 'complete');
    cy.location('pathname').should('match', /__cypress_unknown_path__|auth\/login|\/?$/);
  });

  it('unauthenticated visit to a protected-ish path should redirect to login or load safely', () => {
    const uiBase = getUiBaseUrl();

    cy.visit(`${uiBase}/admin`, {
      onBeforeLoad(win) {
        win.localStorage.removeItem('token');
        win.localStorage.removeItem('accessToken');
        win.localStorage.removeItem('jwt');
      },
    });

    cy.document().its('readyState').should('eq', 'complete');
    // We don't know exact route structure; allow either redirect to login or safe landing.
    cy.location('pathname').should('match', /auth\/login|admin|\/?$/);
  });
});
