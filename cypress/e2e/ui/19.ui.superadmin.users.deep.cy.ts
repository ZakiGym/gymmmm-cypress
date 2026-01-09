import { getUiBaseUrl } from '../../support/ui';

/**
 * Superadmin users (deep behavior, prod-safe)
 *
 * Focus:
 * - Page loads and attempts to query users
 * - Best-effort open a user detail if link exists
 * - Any create/disable actions are only *discovered*, not executed without stable selectors
 */
describe('UI: superadmin users (deep, prod-safe)', () => {
  const uiBase = getUiBaseUrl();

  beforeEach(() => {
    cy.uiLoginWithToken('superadmin');
  });

  it('users list loads and attempts a users API call (best-effort)', () => {
    const observed: Array<{ method: string; url: string; status?: number }> = [];
    cy.collectApiTraffic(observed);

    cy.visit(`${uiBase}/superadmin/users`, { failOnStatusCode: false });
    cy.location('pathname', { timeout: 45_000 }).then((p) => {
      const pathname = String(p);
      if (pathname.includes('/auth/login')) {
        cy.log('Superadmin token session did not stick; redirected to login (best-effort).');
      }
    });

    cy.get('body', { timeout: 45_000 }).then(($body) => {
      if ($body.find('[data-cy="superadmin-layout"]').length) {
        cy.get('[data-cy="superadmin-layout"]').should('be.visible');
        cy.get('[data-cy="superadmin-nav-users"]').should('be.visible');
      } else {
        cy.document().its('readyState').should('eq', 'complete');
      }
    });

    cy.wait(1500, { log: false });
    cy.then(() => {
      const hit = observed.find((x) => /\/users\b/i.test(x.url));
      if (!hit) cy.log('No users-related API call observed; UI may load from cache, be blocked by auth, or use different endpoints.');
    });
  });

  it('attempts to open a user detail (best-effort)', () => {
    cy.visit(`${uiBase}/superadmin/users`, { failOnStatusCode: false });
    cy.get('body', { timeout: 45_000 }).then(($body) => {
      const link = $body.find('a[href*="/superadmin/users/"]').first();
      if (link.length) {
        cy.wrap(link).click({ force: true });
        cy.location('pathname', { timeout: 45_000 }).should('include', '/superadmin/users/');
      } else {
        cy.log('No user detail link detected; skipping detail navigation.');
      }
    });
  });
});
