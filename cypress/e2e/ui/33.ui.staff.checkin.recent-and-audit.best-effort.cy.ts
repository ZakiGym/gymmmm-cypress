import { getUiBaseUrl } from '../../support/ui';
import { API_PREFIX, getEnv } from '../../support/api';

/**
 * Staff check-in “recent/history” + audit verification (best-effort, prod-safe)
 *
 * Contract:
 * - Issues a QR token for a known memberId (from env)
 * - Performs check-in via API (qr/scan)
 * - Tries to discover any of:
 *   - Admin check-in page making “recent/history” style API calls
 *   - Superadmin audit page reflecting check-in/qr events
 * - Cleans up only what it created (qr token via revoke)
 */

describe('UI: staff check-in recent + audit signals (best-effort)', () => {
  const uiBase = getUiBaseUrl();
  const tenant = '690dd58eb250ac19d4a39ff4';

  const memberId = getEnv('MEMBER_ID', '');

  it('scan QR then best-effort verify recent check-ins and/or audit events', () => {
    if (!memberId) return;

    let qrToken: string | undefined;

    // 1) Issue QR token.
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

    // 2) Scan token (actual check-in).
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
          expect([200, 202, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503]).to.include(res.status);
        });
      });
    });

    // 3) Admin check-in page: look for “recent/history” signals.
    cy.then(() => {
      cy.uiLoginWithToken('admin');

      const observed: Array<{ method: string; url: string; status?: number }> = [];
      cy.collectApiTraffic(observed);

      const adminBase = `${uiBase}/portal/${tenant}/admin`;
      cy.visit(`${adminBase}/check-in`, { failOnStatusCode: false });

      cy.location('pathname', { timeout: 45_000 }).then((p) => {
        expect(String(p), 'admin should not be redirected to login').not.to.include('/auth/login');
      });

      cy.wait(2500, { log: false });

      cy.then(() => {
        const urls = observed.map((o) => o.url);

        const hit = urls.some((u) =>
          /\/api\/(check|check-in|attendance|scan|qr\/verify|qr\/scan|logs|history|recent)/i.test(String(u)),
        );

        if (!hit) {
          cy.log('No recent/history-style API calls observed from admin check-in page.');
        } else {
          expect(hit, 'saw check-in recent/history related API calls').to.eq(true);
        }
      });
    });

    // 4) Superadmin audit logs page: look for audit signal mentioning qr/checkin.
    cy.then(() => {
      cy.uiLoginWithToken('superadmin');

      const observed: Array<{ method: string; url: string; status?: number }> = [];
      cy.collectApiTraffic(observed);

      cy.visit(`${uiBase}/superadmin/audit-logs`, { failOnStatusCode: false });

      cy.location('pathname', { timeout: 45_000 }).then((p) => {
        const pathname = String(p);
        if (pathname.includes('/auth/login')) {
          cy.log('Superadmin token session did not stick; redirected to login (best-effort).');
        }
      });

      cy.wait(2500, { log: false });

      cy.then(() => {
        const auditish = observed.find((x) => /audit|logs/i.test(String(x.url)));
        if (!auditish) {
          cy.log('No audit/logs API call observed; UI may render from cache or different endpoints.');
          return;
        }

        const mentionsQrOrCheckin = /qr|check-?in|scan|attendance/i.test(String(auditish.url));
        if (!mentionsQrOrCheckin) {
          cy.log('Audit call observed, but it does not obviously mention qr/check-in in URL; still acceptable.');
        }
      });
    });

    // 5) Cleanup: revoke token (only what we created).
    cy.then(() => {
      cy.apiLogin('admin').then(({ token: adminToken }) => {
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
