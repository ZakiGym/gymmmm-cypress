describe('UI: portal tokens (API-backed)', () => {
  it('can fetch admin token', () => {
    cy.getPortalToken('admin').should('be.a', 'string').and('not.be.empty');
  });

  it('can fetch superadmin token', () => {
    cy.getPortalToken('superadmin').should('be.a', 'string').and('not.be.empty');
  });

  it('can fetch trainer token', () => {
    cy.getPortalToken('trainer').should('be.a', 'string').and('not.be.empty');
  });

  it('can fetch member token', () => {
    cy.getPortalToken('member').should('be.a', 'string').and('not.be.empty');
  });
});
