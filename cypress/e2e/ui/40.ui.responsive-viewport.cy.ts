// cypress/e2e/ui/40.ui.responsive-viewport.cy.ts
// Responsive design / viewport testing for key pages.

import { getUiBaseUrl } from '../../support/ui';

describe('UI: Responsive & Viewport Tests', () => {
  const uiBase = getUiBaseUrl();
  const tenant = '690dd58eb250ac19d4a39ff4';
  const base = `${uiBase}/portal/${tenant}`;

  const viewports: Array<{ name: string; width: number; height: number }> = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPad', width: 768, height: 1024 },
    { name: 'Desktop', width: 1280, height: 800 },
    { name: 'Wide Desktop', width: 1920, height: 1080 },
  ];

  const pages = [
    { role: 'admin' as const, path: '/admin/dashboard', name: 'Admin Dashboard' },
    { role: 'member' as const, path: '/member/browse-classes', name: 'Member Classes' },
    { role: 'trainer' as const, path: '/trainer/calendar', name: 'Trainer Calendar' },
  ];

  pages.forEach(({ role, path, name }) => {
    describe(`${name}`, () => {
      viewports.forEach(({ name: vpName, width, height }) => {
        it(`renders at ${vpName} (${width}x${height})`, () => {
          cy.viewport(width, height);
          cy.uiLoginWithToken(role);

          const url = `${base}${path}`;
          cy.visit(url, { failOnStatusCode: false });

          cy.location('pathname', { timeout: 45_000 }).then((p) => {
            if (String(p).includes('/auth/login')) {
              cy.uiLoginWithToken(role);
              cy.visit(url, { failOnStatusCode: false });
            }
          });

          cy.document().its('readyState').should('eq', 'complete');
          cy.get('body').should('be.visible');

          // Verify no horizontal overflow
          cy.window().then((win) => {
            const docWidth = win.document.documentElement.scrollWidth;
            const viewportWidth = win.innerWidth;
            // Allow small tolerance for scrollbars
            expect(docWidth).to.be.lte(viewportWidth + 20);
          });
        });
      });
    });
  });

  /* ───── Login page responsive ───── */

  describe('Login page', () => {
    viewports.forEach(({ name: vpName, width, height }) => {
      it(`login page renders at ${vpName}`, () => {
        cy.viewport(width, height);
        cy.clearAllLocalStorage();
        cy.visit(`${uiBase}/auth/login`, { failOnStatusCode: false });
        cy.document().its('readyState').should('eq', 'complete');
        cy.get('body').should('be.visible');
      });
    });
  });

  /* ───── Superadmin responsive ───── */

  describe('Superadmin dashboard responsive', () => {
    viewports.forEach(({ name: vpName, width, height }) => {
      it(`superadmin dashboard at ${vpName}`, () => {
        cy.viewport(width, height);
        cy.uiLoginWithToken('superadmin');
        cy.visit(`${uiBase}/superadmin/dashboard`, { failOnStatusCode: false });

        cy.location('pathname', { timeout: 45_000 }).then((p) => {
          if (String(p).includes('/auth/login')) {
            cy.uiLoginWithToken('superadmin');
            cy.visit(`${uiBase}/superadmin/dashboard`, { failOnStatusCode: false });
          }
        });

        cy.document().its('readyState').should('eq', 'complete');
        cy.get('body').should('be.visible');
      });
    });
  });
});
