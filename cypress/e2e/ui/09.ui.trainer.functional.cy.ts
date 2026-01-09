import { getUiBaseUrl } from '../../support/ui';

describe('UI: trainer portal (functional)', () => {
  const uiBase = getUiBaseUrl();
  const tenant = '690dd58eb250ac19d4a39ff4';
  const base = `${uiBase}/portal/${tenant}/trainer`;

  beforeEach(() => {
    cy.uiLoginWithToken('trainer');
  });

  it('loads trainer shell and nav', () => {
    cy.visit(base, { failOnStatusCode: false });
    cy.get('[data-cy="trainer-layout"]', { timeout: 45_000 }).should('be.visible');
    cy.get('[data-cy="trainer-sidebar"]', { timeout: 45_000 }).should('be.visible');
    cy.get('[data-cy="trainer-nav-calendar"]').should('be.visible');
    cy.get('[data-cy="trainer-nav-my-classes"]').should('be.visible');
    cy.get('[data-cy="trainer-nav-profile"]').should('be.visible');
    cy.get('[data-cy="trainer-nav-stats"]').should('be.visible');
    cy.get('[data-cy="trainer-logout-button"]').should('be.visible');
  });

  it('opens calendar', () => {
    cy.visit(`${base}/calendar`, { failOnStatusCode: false });
    cy.get('[data-cy="trainer-layout"]', { timeout: 45_000 }).should('be.visible');
  });

  it('opens my classes', () => {
    cy.visit(base, { failOnStatusCode: false });
    cy.get('[data-cy="trainer-layout"]', { timeout: 45_000 }).should('be.visible');
    cy.get('[data-cy="trainer-nav-my-classes"]').scrollIntoView().click({ force: true });
    cy.get('[data-cy="trainer-layout"]', { timeout: 45_000 }).should('be.visible');
  });

  it('opens profile', () => {
    cy.visit(`${base}/profile`, { failOnStatusCode: false });
    cy.get('[data-cy="trainer-layout"]', { timeout: 45_000 }).should('be.visible');
  });

  it('opens stats', () => {
    cy.visit(`${base}/stats`, { failOnStatusCode: false });
    cy.get('[data-cy="trainer-layout"]', { timeout: 45_000 }).should('be.visible');
  });
});
