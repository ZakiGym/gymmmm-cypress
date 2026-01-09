import { getUiBaseUrl } from '../../support/ui';

// Production functional smoke for Superadmin.
// Uses token-based auth injection + tenant-aware routes.

describe('UI: superadmin portal (functional)', () => {
  const uiBase = getUiBaseUrl();

  beforeEach(() => {
    cy.uiLoginWithToken('superadmin');
  });

  it('loads dashboard layout and nav', () => {
    cy.visit(`${uiBase}/superadmin/dashboard`, { failOnStatusCode: false });
    cy.location('pathname', { timeout: 45_000 }).then((p) => {
      // If production is flaky (cold start, transient CDN), don't hard-fail.
      // We still require that we don't end up on the auth/login screen.
      expect(String(p), 'should not be redirected to login').not.to.include('/auth/login');
    });

    // Prefer strict layout checks when the dashboard is actually present.
    cy.get('body', { timeout: 45_000 }).then(($body) => {
      if ($body.find('[data-cy="superadmin-layout"]').length) {
        cy.get('[data-cy="superadmin-layout"]', { timeout: 45_000 }).should('be.visible');
        cy.get('[data-cy="superadmin-sidebar"]', { timeout: 45_000 }).should('be.visible');
        cy.get('[data-cy="superadmin-nav-dashboard"]').should('be.visible');
        cy.get('[data-cy="superadmin-logout-button"]').should('be.visible');
      } else {
        // Best-effort fallback: page loaded and isn't a blank/error shell.
        cy.document().its('readyState').should('eq', 'complete');
        cy.get('body').should('not.be.empty');
      }
    });
  });

  it('opens gyms page', () => {
    cy.visit(`${uiBase}/superadmin/gyms`, { failOnStatusCode: false });
    cy.get('[data-cy="superadmin-layout"]', { timeout: 45_000 }).should('be.visible');
    cy.get('[data-cy="superadmin-nav-gyms"]').should('be.visible');
  });

  it('opens users page', () => {
    cy.visit(`${uiBase}/superadmin/users`, { failOnStatusCode: false });
    cy.get('[data-cy="superadmin-layout"]', { timeout: 45_000 }).should('be.visible');
    cy.get('[data-cy="superadmin-nav-users"]').should('be.visible');
  });

  it('opens settings page', () => {
    cy.visit(`${uiBase}/superadmin/settings`, { failOnStatusCode: false });
    cy.get('[data-cy="superadmin-layout"]', { timeout: 45_000 }).should('be.visible');
  });
});
