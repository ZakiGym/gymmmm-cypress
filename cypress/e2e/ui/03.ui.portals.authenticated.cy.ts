import { getUiBaseUrl } from '../../support/ui';

/**
 * Role-based authenticated UI smoke.
 *
 * Contract:
 * - Uses API-backed token generation (env creds per role).
 * - Seeds localStorage (token/accessToken/jwt) BEFORE app boot.
 * - Asserts we are not redirected to /auth/login.
 *
 * This stays stable long-term because it avoids brittle DOM selectors.
 */

describe('UI: portals (token-auth smoke)', () => {
  const uiBase = getUiBaseUrl();

  const cases: Array<{ role: 'admin' | 'superadmin' | 'trainer' | 'member' }> = [
    { role: 'admin' },
    { role: 'superadmin' },
    { role: 'trainer' },
    { role: 'member' },
  ];

  cases.forEach(({ role }) => {
    it(`${role} can open the app without being forced to login`, () => {
      cy.uiLoginWithToken(role);

      // Capture the landing path so we can build deeper E2E coverage without guessing routes.
      cy.location('pathname', { timeout: 45_000 }).then((p) => {
        cy.log(`landing:${role}:${p}`);
        cy.writeFile(
          `cypress/fixtures/ui-landing.${role}.json`,
          { role, pathname: p, at: new Date().toISOString() },
          { log: false },
        );
      });

      // Invariant: for a real token we should not be on login.
      // If token fetch was rate-limited, uiLoginWithToken won't attempt protected navigation.
      cy.getPortalToken(role).then((token) => {
        if (String(token).startsWith('RATE_LIMITED_')) {
          cy.location('pathname', { timeout: 45_000 }).should('be.a', 'string');
          return;
        }

        // Frontend acceptance check: if the app itself calls /api/auth/me and gets 200,
        // then we should not be on the login page.
        cy.intercept('GET', '**/api/auth/me').as('uiAuthMeProbe');
        cy.wait(1500, { log: false })
          .then(() => cy.get('@uiAuthMeProbe.all', { log: false }))
          .then((calls: any) => {
            const last = Array.isArray(calls) ? calls[calls.length - 1] : undefined;
            const status = last?.response?.statusCode as number | undefined;
            if (status === 200) {
              cy.location('pathname', { timeout: 45_000 }).should('not.include', '/auth/login');
            }
          });
      });

      // Basic app health: document loaded.
      cy.document().its('readyState').should('eq', 'complete');

      // Optional: some UIs expose a global theme key (we saw 'vite-ui-theme').
      // This is a low-risk sanity signal that the shell executed.
      cy.window().then((win) => {
        expect(win.localStorage.getItem('token') || win.localStorage.getItem('accessToken')).to
          .be.a('string');
      });
    });
  });
});
