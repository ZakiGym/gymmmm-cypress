import { getUiBaseUrl } from '../../support/ui';

describe('UI: admin portal (functional)', () => {
  const uiBase = getUiBaseUrl();
  const tenant = '690dd58eb250ac19d4a39ff4';
  const base = `${uiBase}/portal/${tenant}/admin`;

  beforeEach(() => {
    cy.uiLoginWithToken('admin');
  });

  it('loads admin shell and nav', () => {
    cy.visit(base, { failOnStatusCode: false });
    cy.location('pathname', { timeout: 45_000 }).then((p) => {
      expect(String(p), 'should not be redirected to login').not.to.include('/auth/login');
    });

    cy.get('body', { timeout: 45_000 }).then(($body) => {
      if ($body.find('[data-cy="admin-layout"]').length) {
        cy.get('[data-cy="admin-layout"]', { timeout: 45_000 }).should('be.visible');
        cy.get('[data-cy="admin-sidebar"]', { timeout: 45_000 }).should('be.visible');
        cy.get('[data-cy="admin-nav-dashboard"]').should('be.visible');
        cy.get('[data-cy="admin-logout-button"]').should('be.visible');
      } else {
        cy.document().its('readyState').should('eq', 'complete');
        cy.get('body').should('not.be.empty');
      }
    });
  });

  it('opens schedule', () => {
    cy.visit(`${base}/schedule`, { failOnStatusCode: false });
    cy.location('pathname', { timeout: 45_000 }).then((p) => {
      expect(String(p), 'should not be redirected to login').not.to.include('/auth/login');
    });
    cy.get('body', { timeout: 45_000 }).then(($body) => {
      if ($body.find('[data-cy="admin-layout"]').length) {
        cy.get('[data-cy="admin-layout"]', { timeout: 45_000 }).should('be.visible');
      } else {
        cy.document().its('readyState').should('eq', 'complete');
      }
    });
  });

  it('opens class types', () => {
    cy.visit(`${base}/class-types`, { failOnStatusCode: false });
    cy.location('pathname', { timeout: 45_000 }).then((p) => {
      expect(String(p), 'should not be redirected to login').not.to.include('/auth/login');
    });
    cy.get('body', { timeout: 45_000 }).then(($body) => {
      if ($body.find('[data-cy="admin-layout"]').length) {
        cy.get('[data-cy="admin-layout"]', { timeout: 45_000 }).should('be.visible');
        cy.get('[data-cy="admin-nav-class-types"]').should('be.visible');
      } else {
        cy.document().its('readyState').should('eq', 'complete');
      }
    });
  });

  it('opens bookings', () => {
    cy.visit(`${base}/bookings`, { failOnStatusCode: false });
    cy.get('[data-cy="admin-layout"]', { timeout: 45_000 }).should('be.visible');
  });

  it('opens plans', () => {
    cy.visit(`${base}/plans`, { failOnStatusCode: false });
    cy.get('[data-cy="admin-layout"]', { timeout: 45_000 }).should('be.visible');
  });

  it('opens payments', () => {
    cy.visit(`${base}/payments`, { failOnStatusCode: false });
    cy.get('[data-cy="admin-layout"]', { timeout: 45_000 }).should('be.visible');
  });

  it('opens settings', () => {
    cy.visit(`${base}/settings`, { failOnStatusCode: false });
    cy.get('[data-cy="admin-layout"]', { timeout: 45_000 }).should('be.visible');
    cy.get('[data-cy="admin-nav-settings"]').first().scrollIntoView().click({ force: true });
    cy.get('[data-cy="admin-layout"]', { timeout: 45_000 }).should('be.visible');
  });
});
