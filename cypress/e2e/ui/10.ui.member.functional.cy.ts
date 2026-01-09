import { getUiBaseUrl } from '../../support/ui';

describe('UI: member portal (functional)', () => {
  const uiBase = getUiBaseUrl();
  const tenant = '690dd58eb250ac19d4a39ff4';
  const base = `${uiBase}/portal/${tenant}/member`;

  beforeEach(() => {
    cy.uiLoginWithToken('member');
  });

  it('loads member shell and nav', () => {
    cy.visit(base, { failOnStatusCode: false });
    cy.get('[data-cy="member-layout"]', { timeout: 45_000 }).should('be.visible');
    cy.get('[data-cy="member-sidebar"]', { timeout: 45_000 }).should('be.visible');
    cy.get('[data-cy="member-nav-browse-classes"]').should('be.visible');
    cy.get('[data-cy="member-nav-my-bookings"]').should('be.visible');
    cy.get('[data-cy="member-nav-membership"]').should('be.visible');
    cy.get('[data-cy="member-nav-profile"]').should('be.visible');
    cy.get('[data-cy="member-logout-button"]').should('be.visible');
  });

  it('opens browse classes', () => {
    cy.visit(base, { failOnStatusCode: false });
    cy.get('[data-cy="member-layout"]', { timeout: 45_000 }).should('be.visible');
    cy.get('[data-cy="member-nav-browse-classes"]').first().scrollIntoView().click({ force: true });
    cy.get('[data-cy="member-layout"]', { timeout: 45_000 }).should('be.visible');
    cy.get('[data-cy="member-browse-classes-page"], [data-cy="member-browse-classes-loading"]', {
      timeout: 45_000,
    }).should('exist');
  });

  it('opens my bookings', () => {
    cy.visit(base, { failOnStatusCode: false });
    cy.get('[data-cy="member-layout"]', { timeout: 45_000 }).should('be.visible');
    cy.get('[data-cy="member-nav-my-bookings"]').first().scrollIntoView().click({ force: true });
    cy.get('[data-cy="member-layout"]', { timeout: 45_000 }).should('be.visible');
  });

  it('opens membership', () => {
    cy.visit(`${base}/membership`, { failOnStatusCode: false });
    cy.get('[data-cy="member-layout"]', { timeout: 45_000 }).should('be.visible');
  });

  it('opens profile', () => {
    cy.visit(`${base}/profile`, { failOnStatusCode: false });
    cy.get('[data-cy="member-layout"]', { timeout: 45_000 }).should('be.visible');
  });
});
