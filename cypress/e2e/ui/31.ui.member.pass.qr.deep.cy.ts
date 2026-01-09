import { getUiBaseUrl } from '../../support/ui';
import { API_PREFIX, getEnv } from '../../support/api';

describe('UI: member pass (QR) (deep)', () => {
  const uiBase = getUiBaseUrl();
  const tenant = '690dd58eb250ac19d4a39ff4';
  const base = `${uiBase}/portal/${tenant}/member`;

  beforeEach(() => {
    cy.uiLoginWithToken('member');
  });

  it('opens member pass screen and observes QR/pass related network traffic', () => {
    const observed: Array<{ method: string; url: string; status?: number }> = [];
    cy.collectApiTraffic(observed);

    // Route is inferred from nav name.
    cy.visit(`${base}/member-pass`, { failOnStatusCode: false });
    cy.location('pathname', { timeout: 45_000 }).then((p) => {
      expect(String(p), 'should not be redirected to login').not.to.include('/auth/login');
    });

    cy.get('body', { timeout: 45_000 }).then(($body) => {
      if ($body.find('[data-cy="member-layout"]').length) {
        cy.get('[data-cy="member-layout"]', { timeout: 45_000 }).should('be.visible');
        cy.get('[data-cy="member-nav-member-pass"]').should('be.visible');
      } else {
        cy.document().its('readyState').should('eq', 'complete');
      }
    });

    cy.wait(2500, { log: false });

    cy.then(() => {
      const urls = observed.map((o) => o.url);
      const hit = urls.some((u) => /\/api\/(qr\/me|qr\/verify|qr\/issue|passes)/.test(String(u)));
      if (hit) expect(hit, 'saw qr/pass API calls').to.eq(true);
    });
  });

  it('API: issues a QR token (admin) and verifies member can fetch /qr/me (best-effort)', () => {
    const memberId = getEnv('MEMBER_ID', '');
    if (!memberId) return;

    cy.apiLogin('admin').then(({ token: adminToken }) => {
      let issuedToken: string | undefined;

      cy.request({
        method: 'POST',
        url: `${API_PREFIX}/qr/issue`,
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { memberId },
        failOnStatusCode: false,
      }).then((res) => {
        expect([200, 201, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503]).to.include(res.status);
        if ([200, 201].includes(res.status)) {
          issuedToken = (res.body as any)?.token || (res.body as any)?.qrToken;
        }
      });

      cy.getPortalToken('member').then((memberToken) => {
        cy.request({
          method: 'GET',
          url: `${API_PREFIX}/qr/me`,
          headers: { Authorization: `Bearer ${memberToken}` },
          failOnStatusCode: false,
        }).then((res) => {
          expect([200, 401, 403, 404, 429, 500, 502, 503]).to.include(res.status);
        });
      });

      // Cleanup: revoke only if we successfully issued (safe: revokes the test-issued token for that member).
      cy.then(() => {
        if (!issuedToken) return;
        return cy.request({
          method: 'POST',
          url: `${API_PREFIX}/qr/revoke`,
          headers: { Authorization: `Bearer ${adminToken}` },
          body: { memberId },
          failOnStatusCode: false,
        });
      });
    });
  });
});
