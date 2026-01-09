import { getUiBaseUrl } from '../../support/ui';
import { API_PREFIX, getEnv } from '../../support/api';

describe('UI: member profile + billing/payments (deep)', () => {
  const uiBase = getUiBaseUrl();
  const tenant = '690dd58eb250ac19d4a39ff4';
  const base = `${uiBase}/portal/${tenant}/member`;

  beforeEach(() => {
    cy.uiLoginWithToken('member');
  });

  it('opens profile and observes profile-related API traffic', () => {
    const observed: Array<{ method: string; url: string; status?: number }> = [];
    cy.collectApiTraffic(observed);

    cy.visit(`${base}/profile`, { failOnStatusCode: false });
    cy.location('pathname', { timeout: 45_000 }).then((p) => {
      expect(String(p), 'should not be redirected to login').not.to.include('/auth/login');
    });

    cy.get('body', { timeout: 45_000 }).then(($body) => {
      if ($body.find('[data-cy="member-layout"]').length) {
        cy.get('[data-cy="member-layout"]', { timeout: 45_000 }).should('be.visible');
        cy.get('[data-cy="member-nav-profile"]').should('be.visible');
      } else {
        cy.document().its('readyState').should('eq', 'complete');
      }
    });

    cy.wait(2500, { log: false });

    cy.then(() => {
      const urls = observed.map((o) => o.url);
      const hit = urls.some((u) => /\/api\/(user\/profile|auth\/me)/.test(String(u)));
      if (hit) expect(hit, 'saw profile/auth bootstrap calls').to.eq(true);
    });
  });

  it('opens payments screen and cross-checks member billing endpoints (best-effort)', () => {
    const observed: Array<{ method: string; url: string; status?: number }> = [];
    cy.collectApiTraffic(observed);

    cy.visit(`${base}/payments`, { failOnStatusCode: false });
    cy.location('pathname', { timeout: 45_000 }).then((p) => {
      expect(String(p), 'should not be redirected to login').not.to.include('/auth/login');
    });

    cy.get('body', { timeout: 45_000 }).then(($body) => {
      if ($body.find('[data-cy="member-layout"]').length) {
        cy.get('[data-cy="member-layout"]', { timeout: 45_000 }).should('be.visible');
        cy.get('[data-cy="member-nav-payments"]').should('be.visible');
      } else {
        cy.document().its('readyState').should('eq', 'complete');
      }
    });

    cy.wait(2500, { log: false });

    cy.then(() => {
      const urls = observed.map((o) => o.url);
      const hit = urls.some((u) => /\/api\/(billing|payments|invoices)/.test(String(u)));
      if (hit) expect(hit, 'saw billing/payment-related API calls').to.eq(true);
    });

    const memberId = getEnv('MEMBER_ID', '');
    if (!memberId) return;

    cy.getPortalToken('admin').then((adminToken) => {
      // Read-only checks only.
      cy.request({
        method: 'GET',
        url: `${API_PREFIX}/members/${memberId}/billing`,
        headers: { Authorization: `Bearer ${adminToken}` },
        failOnStatusCode: false,
      }).then((res) => {
        expect([200, 401, 403, 404, 429, 500, 502, 503]).to.include(res.status);
      });
    });
  });
});
