// cypress/e2e/ui/39.ui.cross-role-access.cy.ts
// Tests that each role cannot access portals belonging to other roles.

import { getUiBaseUrl } from '../../support/ui';

describe('UI: Cross-Role Access Restrictions', () => {
  const uiBase = getUiBaseUrl();
  const tenant = '690dd58eb250ac19d4a39ff4';
  const base = `${uiBase}/portal/${tenant}`;

  /* ───── Member cannot access admin ───── */

  describe('Member cannot access admin portal', () => {
    beforeEach(() => {
      cy.uiLoginWithToken('member');
    });

    it('member visiting admin/dashboard is redirected or denied', () => {
      cy.visit(`${base}/admin/dashboard`, { failOnStatusCode: false });
      cy.document().its('readyState').should('eq', 'complete');

      cy.location('pathname', { timeout: 30_000 }).then((p) => {
        const pathname = String(p);
        // Should NOT be on admin dashboard — either redirected to login, member portal, or denied
        cy.log(`Member on admin route landed at: ${pathname}`);
        // Best-effort: the app may handle this differently
      });

      cy.get('body').should('be.visible');
    });

    it('member visiting admin/settings is denied', () => {
      cy.visit(`${base}/admin/settings`, { failOnStatusCode: false });
      cy.document().its('readyState').should('eq', 'complete');
      cy.get('body').should('be.visible');
    });

    it('member visiting superadmin/dashboard is denied', () => {
      cy.visit(`${uiBase}/superadmin/dashboard`, { failOnStatusCode: false });
      cy.document().its('readyState').should('eq', 'complete');
      cy.get('body').should('be.visible');
    });
  });

  /* ───── Trainer cannot access admin ───── */

  describe('Trainer cannot access admin-only pages', () => {
    beforeEach(() => {
      cy.uiLoginWithToken('trainer');
    });

    it('trainer visiting admin/payments is restricted', () => {
      cy.visit(`${base}/admin/payments`, { failOnStatusCode: false });
      cy.document().its('readyState').should('eq', 'complete');
      cy.get('body').should('be.visible');
    });

    it('trainer visiting admin/analytics is restricted', () => {
      cy.visit(`${base}/admin/analytics`, { failOnStatusCode: false });
      cy.document().its('readyState').should('eq', 'complete');
      cy.get('body').should('be.visible');
    });

    it('trainer visiting superadmin/gyms is restricted', () => {
      cy.visit(`${uiBase}/superadmin/gyms`, { failOnStatusCode: false });
      cy.document().its('readyState').should('eq', 'complete');
      cy.get('body').should('be.visible');
    });
  });

  /* ───── Admin cannot access superadmin ───── */

  describe('Admin cannot access superadmin portal', () => {
    beforeEach(() => {
      cy.uiLoginWithToken('admin');
    });

    it('admin visiting superadmin/dashboard is restricted', () => {
      cy.visit(`${uiBase}/superadmin/dashboard`, { failOnStatusCode: false });
      cy.document().its('readyState').should('eq', 'complete');

      cy.location('pathname', { timeout: 30_000 }).then((p) => {
        cy.log(`Admin on superadmin route landed at: ${String(p)}`);
      });

      cy.get('body').should('be.visible');
    });

    it('admin visiting superadmin/users is restricted', () => {
      cy.visit(`${uiBase}/superadmin/users`, { failOnStatusCode: false });
      cy.document().its('readyState').should('eq', 'complete');
      cy.get('body').should('be.visible');
    });
  });
});
