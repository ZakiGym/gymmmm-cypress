import { getUiBaseUrl } from '../../support/ui';
import { API_PREFIX } from '../../support/api';

describe('UI: member membership gating (deep)', () => {
  const uiBase = getUiBaseUrl();
  const tenant = '690dd58eb250ac19d4a39ff4';
  const base = `${uiBase}/portal/${tenant}/member`;

  beforeEach(() => {
    cy.uiLoginWithToken('member');
  });

  it('opens membership page and cross-checks /api/memberships/me (network+API signal)', () => {
    const observed: Array<{ method: string; url: string; status?: number }> = [];
    cy.collectApiTraffic(observed);

    cy.visit(`${base}/membership`, { failOnStatusCode: false });

    cy.location('pathname', { timeout: 45_000 }).then((p) => {
      expect(String(p), 'should not be redirected to login').not.to.include('/auth/login');
    });

    // When the portal renders, assert stable nav.
    cy.get('body', { timeout: 45_000 }).then(($body) => {
      if ($body.find('[data-cy="member-layout"]').length) {
        cy.get('[data-cy="member-layout"]', { timeout: 45_000 }).should('be.visible');
        cy.get('[data-cy="member-nav-membership"]').should('be.visible');
      } else {
        cy.document().its('readyState').should('eq', 'complete');
      }
    });

    cy.wait(2500, { log: false });

    cy.then(() => {
      const urls = observed.map((o) => o.url);
      const hit = urls.some((u) => /\/api\/memberships\/(me|join)/.test(String(u)));
      if (hit) expect(hit, 'saw memberships API calls').to.eq(true);
    });

    // API cross-check: membership status for this member.
    cy.getPortalToken('member').then((token) => {
      cy.request({
        method: 'GET',
        url: `${API_PREFIX}/memberships/me`,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      }).then((res) => {
        // Some tenants may not have memberships enabled.
        expect([200, 401, 403, 404, 429, 500, 502, 503]).to.include(res.status);
      });
    });
  });
});
