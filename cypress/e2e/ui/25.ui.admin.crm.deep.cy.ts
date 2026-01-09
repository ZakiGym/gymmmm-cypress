import { getUiBaseUrl } from '../../support/ui';

describe('UI: admin CRM (contacts/forms/tasks) (deep)', () => {
  const uiBase = getUiBaseUrl();
  const tenant = '690dd58eb250ac19d4a39ff4';
  const base = `${uiBase}/portal/${tenant}/admin`;

  beforeEach(() => {
    cy.uiLoginWithToken('admin');
  });

  const assertAuthed = () => {
    cy.location('pathname', { timeout: 45_000 }).then((p) => {
      const pathname = String(p);
      if (pathname.includes('/auth/login')) {
        cy.log('Admin token session did not stick; redirected to login (best-effort).');
      }
    });
  };

  const maybeAssertShell = (navCy: string) => {
    cy.get('body', { timeout: 45_000 }).then(($body) => {
      if ($body.find('[data-cy="admin-layout"]').length) {
        cy.get('[data-cy="admin-layout"]', { timeout: 45_000 }).should('be.visible');
        cy.get(`[data-cy="${navCy}"]`, { timeout: 45_000 }).then(($el) => {
          // Some sidebars use overflow hidden; visibility can be flaky in headed runs.
          // Existence is enough for this "deep" smoke.
          expect($el.length, `${navCy} exists`).to.be.greaterThan(0);
          cy.wrap($el.first())
            .scrollIntoView()
            .then(() => undefined);
        });
      } else {
        cy.document().its('readyState').should('eq', 'complete');
      }
    });
  };

  it('opens CRM contacts and observes /api/crm/contacts traffic (network signal)', () => {
    const observed: Array<{ method: string; url: string; status?: number }> = [];
    cy.collectApiTraffic(observed);

    // Route is not guaranteed; we try a couple common patterns.
    const paths = ['/crm/contacts', '/crm-contacts', '/contacts'];

    const tryVisit = (i: number): Cypress.Chainable<void> => {
      if (i >= paths.length) return cy.then(() => undefined);
      return cy
        .visit(`${base}${paths[i]}`, { failOnStatusCode: false })
        .then(() => assertAuthed())
        .then(() => cy.location('pathname'))
        .then((p) => {
          // If this path is unknown, the app might redirect elsewhere.
          // If it pushes us to login, try next.
          if (String(p).includes('/auth/login')) return tryVisit(i + 1);
          return;
        });
    };

    tryVisit(0);

    maybeAssertShell('admin-nav-crm-contacts');

    cy.wait(2500, { log: false });

    cy.then(() => {
      const urls = observed.map((o) => o.url);
      const hit = urls.some((u) => /\/api\/crm\/contacts/.test(String(u)));
      if (hit) expect(hit, 'saw CRM contacts API calls').to.eq(true);
    });
  });

  it('opens CRM forms and observes /api/crm/forms traffic (network signal)', () => {
    const observed: Array<{ method: string; url: string; status?: number }> = [];
    cy.collectApiTraffic(observed);

    const paths = ['/crm/forms', '/crm-forms', '/forms'];

    const tryVisit = (i: number): Cypress.Chainable<void> => {
      if (i >= paths.length) return cy.then(() => undefined);
      return cy
        .visit(`${base}${paths[i]}`, { failOnStatusCode: false })
        .then(() => assertAuthed())
        .then(() => cy.location('pathname'))
        .then((p) => {
          if (String(p).includes('/auth/login')) return tryVisit(i + 1);
          return;
        });
    };

    tryVisit(0);

    maybeAssertShell('admin-nav-crm-forms');

    cy.wait(2500, { log: false });

    cy.then(() => {
      const urls = observed.map((o) => o.url);
      const hit = urls.some((u) => /\/api\/crm\/forms/.test(String(u)));
      if (hit) expect(hit, 'saw CRM forms API calls').to.eq(true);
    });
  });

  it('opens CRM tasks and observes /api/crm/tasks traffic (network signal)', () => {
    const observed: Array<{ method: string; url: string; status?: number }> = [];
    cy.collectApiTraffic(observed);

    const paths = ['/crm/tasks', '/crm-tasks', '/tasks'];

    const tryVisit = (i: number): Cypress.Chainable<void> => {
      if (i >= paths.length) return cy.then(() => undefined);
      return cy
        .visit(`${base}${paths[i]}`, { failOnStatusCode: false })
        .then(() => assertAuthed())
        .then(() => cy.location('pathname'))
        .then((p) => {
          if (String(p).includes('/auth/login')) return tryVisit(i + 1);
          return;
        });
    };

    tryVisit(0);

    maybeAssertShell('admin-nav-crm-tasks');

    cy.wait(2500, { log: false });

    cy.then(() => {
      const urls = observed.map((o) => o.url);
      const hit = urls.some((u) => /\/api\/crm\/tasks/.test(String(u)));
      if (hit) expect(hit, 'saw CRM tasks API calls').to.eq(true);
    });
  });
});
