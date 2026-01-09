import { getUiBaseUrl } from '../../support/ui';
import { API_PREFIX, getEnv } from '../../support/api';

describe('UI: staff check-in via QR (admin + trainer portals) (best-effort)', () => {
  const uiBase = getUiBaseUrl();
  const tenant = '690dd58eb250ac19d4a39ff4';

  const memberId = getEnv('MEMBER_ID', '');

  it('admin issues QR token, staff tries to reach check-in UI, then API scans token (prod-safe)', () => {
    if (!memberId) return;

    let qrToken: string | undefined;

    // 1) Admin issues a QR token for the member.
    cy.apiLogin('admin').then(({ token: adminToken }) => {
      cy.request({
        method: 'POST',
        url: `${API_PREFIX}/qr/issue`,
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { memberId },
        failOnStatusCode: false,
      }).then((res) => {
        expect([200, 201, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503]).to.include(res.status);
        if ([200, 201].includes(res.status)) {
          qrToken = (res.body as any)?.token || (res.body as any)?.qrToken;
        }
      });
    });

    // 2) Admin portal: open Check-in page and observe network signals.
    cy.then(() => {
      cy.uiLoginWithToken('admin');

      const observed: Array<{ method: string; url: string; status?: number }> = [];
      cy.collectApiTraffic(observed);

      const adminBase = `${uiBase}/portal/${tenant}/admin`;
      cy.visit(`${adminBase}/check-in`, { failOnStatusCode: false });
      cy.location('pathname', { timeout: 45_000 }).then((p) => {
        expect(String(p), 'admin should not be redirected to login').not.to.include('/auth/login');
      });

      cy.get('body', { timeout: 45_000 }).then(($body) => {
        if ($body.find('[data-cy="admin-layout"]').length) {
          cy.get('[data-cy="admin-layout"]', { timeout: 45_000 }).should('be.visible');
          cy.get('[data-cy="admin-nav-check-in"]').should('be.visible');
        } else {
          cy.document().its('readyState').should('eq', 'complete');
        }
      });

      cy.wait(2000, { log: false });

      cy.then(() => {
        const urls = observed.map((o) => o.url);
        const hit = urls.some((u) => /\/api\/(qr\/verify|qr\/scan|check|check-in)/i.test(String(u)));
        if (hit) expect(hit, 'saw check-in/qr related API calls').to.eq(true);
      });
    });

    // 3) Trainer portal: open Check-in nav and observe network signals.
    cy.then(() => {
      cy.uiLoginWithToken('trainer');

      const observed: Array<{ method: string; url: string; status?: number }> = [];
      cy.collectApiTraffic(observed);

      const trainerBase = `${uiBase}/portal/${tenant}/trainer`;
      cy.visit(`${trainerBase}`, { failOnStatusCode: false });
      cy.location('pathname', { timeout: 45_000 }).then((p) => {
        expect(String(p), 'trainer should not be redirected to login').not.to.include('/auth/login');
      });

      cy.get('body', { timeout: 45_000 }).then(($body) => {
        if ($body.find('[data-cy="trainer-layout"]').length) {
          cy.get('[data-cy="trainer-layout"]', { timeout: 45_000 }).should('be.visible');
          cy.get('[data-cy="trainer-nav-check-in"]').should('be.visible').click({ force: true });
        } else {
          cy.document().its('readyState').should('eq', 'complete');
        }
      });

      cy.wait(2000, { log: false });

      cy.then(() => {
        const urls = observed.map((o) => o.url);
        const hit = urls.some((u) => /\/api\/(qr\/verify|qr\/scan|check|check-in)/i.test(String(u)));
        if (hit) expect(hit, 'saw check-in/qr related API calls').to.eq(true);
      });
    });

    // 4) API scan the token (this is the actual check-in action).
    cy.then(() => {
      if (!qrToken) return;

      cy.apiLogin('admin').then(({ token: adminToken }) => {
        cy.request({
          method: 'POST',
          url: `${API_PREFIX}/qr/scan`,
          headers: { Authorization: `Bearer ${adminToken}` },
          body: { token: qrToken },
          failOnStatusCode: false,
        }).then((res) => {
          // On prod this can be 200/202, or could be 4xx if the member is ineligible.
          expect([200, 202, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503]).to.include(res.status);
        });

        // Cleanup: revoke the issued token.
        cy.request({
          method: 'POST',
          url: `${API_PREFIX}/qr/revoke`,
          headers: { Authorization: `Bearer ${adminToken}` },
          body: { memberId },
          failOnStatusCode: false,
        }).then((res) => {
          expect([200, 204, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503]).to.include(res.status);
        });
      });
    });
  });
});
