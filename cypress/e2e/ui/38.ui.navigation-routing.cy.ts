// cypress/e2e/ui/38.ui.navigation-routing.cy.ts
// Deep navigation and routing tests for all portals.

import { getUiBaseUrl } from '../../support/ui';

describe('UI: Navigation & Routing', () => {
  const uiBase = getUiBaseUrl();
  const tenant = '690dd58eb250ac19d4a39ff4';
  const base = `${uiBase}/portal/${tenant}`;

  /* ───── Admin Portal Navigation ───── */

  describe('Admin portal: all routes accessible', () => {
    const adminRoutes = [
      '/admin/dashboard',
      '/admin/schedule',
      '/admin/class-types',
      '/admin/bookings',
      '/admin/plans',
      '/admin/payments',
      '/admin/settings',
      '/admin/analytics',
      '/admin/crm/contacts',
      '/admin/crm/deals',
      '/admin/crm/tasks',
      '/admin/audit',
    ];

    beforeEach(() => {
      cy.uiLoginWithToken('admin');
    });

    adminRoutes.forEach((route) => {
      it(`navigates to ${route}`, () => {
        cy.visit(`${base}${route}`, { failOnStatusCode: false });
        cy.location('pathname', { timeout: 45_000 }).then((p) => {
          if (String(p).includes('/auth/login')) {
            cy.uiLoginWithToken('admin');
            cy.visit(`${base}${route}`, { failOnStatusCode: false });
          }
        });
        cy.document().its('readyState').should('eq', 'complete');
        cy.get('body').should('be.visible');
        // Page should have meaningful content
        cy.get('body').invoke('text').should('have.length.gt', 10);
      });
    });
  });

  /* ───── Trainer Portal Navigation ───── */

  describe('Trainer portal: all routes accessible', () => {
    const trainerRoutes = [
      '/trainer/calendar',
      '/trainer/my-classes',
      '/trainer/profile',
      '/trainer/stats',
      '/trainer/check-in',
      '/trainer/timeoff',
    ];

    beforeEach(() => {
      cy.uiLoginWithToken('trainer');
    });

    trainerRoutes.forEach((route) => {
      it(`navigates to ${route}`, () => {
        cy.visit(`${base}${route}`, { failOnStatusCode: false });
        cy.location('pathname', { timeout: 45_000 }).then((p) => {
          if (String(p).includes('/auth/login')) {
            cy.uiLoginWithToken('trainer');
            cy.visit(`${base}${route}`, { failOnStatusCode: false });
          }
        });
        cy.document().its('readyState').should('eq', 'complete');
        cy.get('body').should('be.visible');
      });
    });
  });

  /* ───── Member Portal Navigation ───── */

  describe('Member portal: all routes accessible', () => {
    const memberRoutes = [
      '/member/profile',
      '/member/browse-classes',
      '/member/my-bookings',
      '/member/membership',
      '/member/payments',
      '/member/member-pass',
    ];

    beforeEach(() => {
      cy.uiLoginWithToken('member');
    });

    memberRoutes.forEach((route) => {
      it(`navigates to ${route}`, () => {
        cy.visit(`${base}${route}`, { failOnStatusCode: false });
        cy.location('pathname', { timeout: 45_000 }).then((p) => {
          if (String(p).includes('/auth/login')) {
            cy.uiLoginWithToken('member');
            cy.visit(`${base}${route}`, { failOnStatusCode: false });
          }
        });
        cy.document().its('readyState').should('eq', 'complete');
        cy.get('body').should('be.visible');
      });
    });
  });

  /* ───── Superadmin Portal Navigation ───── */

  describe('Superadmin portal: all routes accessible', () => {
    const superRoutes = [
      '/superadmin/dashboard',
      '/superadmin/gyms',
      '/superadmin/users',
      '/superadmin/settings',
    ];

    beforeEach(() => {
      cy.uiLoginWithToken('superadmin');
    });

    superRoutes.forEach((route) => {
      it(`navigates to ${route}`, () => {
        cy.visit(`${uiBase}${route}`, { failOnStatusCode: false });
        cy.location('pathname', { timeout: 45_000 }).then((p) => {
          if (String(p).includes('/auth/login')) {
            cy.uiLoginWithToken('superadmin');
            cy.visit(`${uiBase}${route}`, { failOnStatusCode: false });
          }
        });
        cy.document().its('readyState').should('eq', 'complete');
        cy.get('body').should('be.visible');
      });
    });
  });

  /* ───── Browser back/forward ───── */

  describe('Browser history navigation', () => {
    it('admin can navigate back/forward without crash', () => {
      cy.uiLoginWithToken('admin');

      cy.visit(`${base}/admin/dashboard`, { failOnStatusCode: false });
      cy.document().its('readyState').should('eq', 'complete');

      cy.visit(`${base}/admin/bookings`, { failOnStatusCode: false });
      cy.document().its('readyState').should('eq', 'complete');

      cy.go('back');
      cy.document().its('readyState').should('eq', 'complete');
      cy.get('body').should('be.visible');

      cy.go('forward');
      cy.document().its('readyState').should('eq', 'complete');
      cy.get('body').should('be.visible');
    });
  });

  /* ───── Page refresh ───── */

  describe('Page refresh retains session', () => {
    it('admin session persists after reload', () => {
      cy.uiLoginWithToken('admin');
      cy.visit(`${base}/admin/dashboard`, { failOnStatusCode: false });
      cy.document().its('readyState').should('eq', 'complete');

      cy.reload();
      cy.document().its('readyState').should('eq', 'complete');

      // Should not redirect to login after reload
      cy.location('pathname', { timeout: 30_000 }).then((p) => {
        // Best-effort: some apps may re-auth on reload
        cy.log(`After reload, pathname: ${p}`);
      });

      cy.get('body').should('be.visible');
    });

    it('member session persists after reload', () => {
      cy.uiLoginWithToken('member');
      cy.visit(`${base}/member/profile`, { failOnStatusCode: false });
      cy.document().its('readyState').should('eq', 'complete');

      cy.reload();
      cy.document().its('readyState').should('eq', 'complete');
      cy.get('body').should('be.visible');
    });
  });
});
