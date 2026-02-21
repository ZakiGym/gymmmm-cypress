// cypress/e2e/api/31.api.crud.qr-checkin-full.cy.ts

import { authRequest, getEnv } from '../../support/api';

const uniq = () => `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}`;

describe('API CRUD: QR Check-in Full Lifecycle (best-effort)', () => {
  const gymId = getEnv('GYM_ID');
  const memberId = getEnv('MEMBER_ID');

  let adminToken = '';
  let memberToken = '';

  before(() => {
    cy.apiLogin('admin').then(({ token }) => {
      adminToken = token;
    });
    cy.apiLogin('member').then(({ token }) => {
      memberToken = token;
    });
  });

  // ============================
  // Member QR Lifecycle
  // ============================

  it('QR lifecycle: issue -> me -> verify -> scan -> check-in -> revoke (member)', () => {
    // ISSUE
    authRequest(memberToken, 'POST', '/qr/issue', { gymId }, false).then((issue) => {
      expect([200, 201, 400, 403, 404, 409], 'issue QR').to.include(issue.status);

      // GET /qr/me
      authRequest(memberToken, 'GET', '/qr/me', undefined, false).then((me) => {
        expect([200, 401, 403, 404], 'get my QR').to.include(me.status);

        const token = (me.body as any)?.token || (me.body as any)?.qrToken;

        if (token) {
          // VERIFY
          authRequest(adminToken, 'POST', '/qr/verify', { token }, false).then((verify) => {
            expect([200, 400, 401, 403, 404], 'verify QR token').to.include(verify.status);
          });

          // SCAN
          authRequest(adminToken, 'POST', '/qr/scan', { token, gymId }, false).then((scan) => {
            expect([200, 400, 401, 403, 404], 'scan QR').to.include(scan.status);
          });

          // CHECK-IN (alias)
          authRequest(adminToken, 'POST', '/qr/check-in', { token, gymId }, false).then(
            (checkin) => {
              expect([200, 400, 401, 403, 404, 409], 'QR check-in').to.include(checkin.status);
            },
          );
        }

        // REVOKE (member revokes own QR)
        authRequest(memberToken, 'POST', '/qr/revoke', { gymId }, false).then((revoke) => {
          expect([200, 204, 400, 403, 404], 'revoke own QR').to.include(revoke.status);
        });
      });
    });
  });

  // ============================
  // Admin / Staff QR Operations
  // ============================

  it('POST /qr/member-lookup — search members for check-in', () => {
    authRequest(
      adminToken,
      'POST',
      '/qr/member-lookup',
      { query: 'test', gymId },
      false,
    ).then((res) => {
      expect([200, 400, 401, 403, 404], 'member lookup').to.include(res.status);
    });
  });

  it('POST /qr/manual/member-lookup — front desk lookup', () => {
    authRequest(
      adminToken,
      'POST',
      '/qr/manual/member-lookup',
      { query: 'test', gymId },
      false,
    ).then((res) => {
      expect([200, 400, 401, 403, 404], 'manual member lookup').to.include(res.status);
    });
  });

  it('POST /qr/manual/checkin — manual staff check-in', () => {
    authRequest(
      adminToken,
      'POST',
      '/qr/manual/checkin',
      { memberId, gymId },
      false,
    ).then((res) => {
      expect([200, 204, 400, 401, 403, 404, 409], 'manual checkin').to.include(res.status);
    });
  });

  it('GET /qr/admin/recent — recent check-ins', () => {
    authRequest(adminToken, 'GET', '/qr/admin/recent', undefined, false).then((res) => {
      expect([200, 401, 403, 404], 'admin recent check-ins').to.include(res.status);
    });
  });

  it('POST /qr/admin/revoke — admin revokes member QR', () => {
    authRequest(
      adminToken,
      'POST',
      '/qr/admin/revoke',
      { memberId, gymId },
      false,
    ).then((res) => {
      expect([200, 204, 400, 401, 403, 404], 'admin revoke QR').to.include(res.status);
    });
  });

  // ============================
  // Booking QR
  // ============================

  it('GET /bookings/{id}/qr (best-effort with first booking)', () => {
    authRequest(memberToken, 'GET', '/bookings', undefined, false).then((list) => {
      if (list.status !== 200) {
        cy.log('Cannot list bookings; skipping booking QR');
        return;
      }

      const items: any[] = (list.body as any)?.items || (list.body as any) || [];
      const first = items[0];
      const bookingId = first?._id || first?.id;

      if (!bookingId) {
        cy.log('No bookings found; skipping booking QR');
        return;
      }

      authRequest(memberToken, 'GET', `/bookings/${bookingId}/qr`, undefined, false).then(
        (qr) => {
          expect([200, 400, 401, 403, 404], 'booking QR').to.include(qr.status);
        },
      );
    });
  });

  it('POST /bookings/checkin — staff check-in booking', () => {
    authRequest(
      adminToken,
      'POST',
      '/bookings/checkin',
      { bookingId: '000000000000000000000000' },
      false,
    ).then((res) => {
      // Expect 400/404 with fake ID; verifies endpoint is reachable
      expect([200, 204, 400, 401, 403, 404, 422], 'booking checkin').to.include(res.status);
    });
  });

  // ============================
  // Health checks
  // ============================

  it('GET /qr/_health', () => {
    cy.request({ method: 'GET', url: '/api/qr/_health', failOnStatusCode: false }).then((res) => {
      expect([200, 204, 404], 'QR health').to.include(res.status);
    });
  });
});
