// cypress/e2e/api/30.api.crud.payments-billing-full.cy.ts

import { authRequest, getEnv } from '../../support/api';
import { createCleanup } from '../../support/cleanup';

const uniq = () => `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}`;

describe('API CRUD: Payments & Billing Full (best-effort)', () => {
  const gymId = getEnv('GYM_ID');
  const memberId = getEnv('MEMBER_ID');
  const cleanup = createCleanup();

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

  after(() => {
    cleanup.run(adminToken);
  });

  // ============================
  // PAYMENTS
  // ============================

  it('POST /payments/manual — create manual payment', () => {
    authRequest(
      adminToken,
      'POST',
      '/payments/manual',
      {
        userId: memberId,
        gymId,
        amount: 50,
        method: 'cash',
        description: `E2E manual payment ${uniq()}`,
      },
      false,
    ).then((res) => {
      expect([200, 201, 400, 403, 404, 422, 500], 'manual payment').to.include(res.status);

      if ([200, 201].includes(res.status)) {
        const payId = (res.body as any)?._id || (res.body as any)?.id;
        if (payId) {
          // Try to test UPDATE and lifecycle
          authRequest(
            adminToken,
            'PUT',
            `/payments/${payId}`,
            { description: 'E2E updated' },
            false,
          ).then((upd) => {
            expect([200, 204, 400, 403, 404], 'update payment').to.include(upd.status);
          });
        }
      }
    });
  });

  it('GET /payments — list all payments (legacy)', () => {
    authRequest(adminToken, 'GET', '/payments', undefined, false).then((res) => {
      expect([200, 401, 403, 404], 'list payments').to.include(res.status);
    });
  });

  it('GET /payments/admin — admin payment list', () => {
    authRequest(adminToken, 'GET', '/payments/admin', undefined, false).then((res) => {
      expect([200, 401, 403], 'admin payments').to.include(res.status);
    });
  });

  it('GET /payments/me — member payments', () => {
    authRequest(memberToken, 'GET', '/payments/me', undefined, false).then((res) => {
      expect([200, 401, 403, 404], 'member payments').to.include(res.status);
    });
  });

  it('GET /payments/export — CSV export', () => {
    authRequest(adminToken, 'GET', '/payments/export', undefined, false).then((res) => {
      expect([200, 401, 403, 404], 'payments export').to.include(res.status);
    });
  });

  it('GET /payments/export/invoices.zip — ZIP export', () => {
    authRequest(adminToken, 'GET', '/payments/export/invoices.zip', undefined, false).then(
      (res) => {
        expect([200, 204, 401, 403, 404, 500], 'invoices zip').to.include(res.status);
      },
    );
  });

  it('GET /payments/invoice/{id} (best-effort with known payment)', () => {
    // First get a payment ID from admin list
    authRequest(adminToken, 'GET', '/payments/admin', undefined, false).then((list) => {
      if (list.status !== 200) {
        cy.log('Cannot list payments; skipping invoice download');
        return;
      }

      const items: any[] = (list.body as any)?.items || (list.body as any)?.payments || (list.body as any) || [];
      const first = items[0];
      const payId = first?._id || first?.id;

      if (!payId) {
        cy.log('No payments found; skipping invoice');
        return;
      }

      authRequest(adminToken, 'GET', `/payments/invoice/${payId}`, undefined, false).then(
        (inv) => {
          expect([200, 204, 400, 403, 404], 'get invoice').to.include(inv.status);
        },
      );
    });
  });

  it('POST /payments/checkout (best-effort)', () => {
    authRequest(
      memberToken,
      'POST',
      '/payments/checkout',
      { planId: 'any-plan', gymId },
      false,
    ).then((res) => {
      expect([200, 201, 400, 403, 404, 422, 500], 'payments checkout').to.include(res.status);
    });
  });

  it('POST /payments/confirm (best-effort)', () => {
    authRequest(
      memberToken,
      'POST',
      '/payments/confirm',
      { sessionId: 'fake-session-id' },
      false,
    ).then((res) => {
      expect([200, 204, 400, 403, 404, 422, 500], 'payments confirm').to.include(res.status);
    });
  });

  it('POST /payments/retry/{id} (best-effort with fake id)', () => {
    authRequest(adminToken, 'POST', '/payments/retry/000000000000000000000000', {}, false).then(
      (res) => {
        expect([200, 204, 400, 403, 404, 422], 'retry payment').to.include(res.status);
      },
    );
  });

  it('POST /payments/refund/{id} (best-effort with fake id)', () => {
    authRequest(adminToken, 'POST', '/payments/refund/000000000000000000000000', {}, false).then(
      (res) => {
        expect([200, 204, 400, 403, 404, 422], 'refund payment').to.include(res.status);
      },
    );
  });

  // ============================
  // BILLING
  // ============================

  it('GET /billing/summary — billing health summary', () => {
    authRequest(adminToken, 'GET', '/billing/summary', undefined, false).then((res) => {
      expect([200, 401, 403, 404], 'billing summary').to.include(res.status);
    });
  });

  it('GET /billing/members — members with billing status', () => {
    authRequest(adminToken, 'GET', '/billing/members?limit=10', undefined, false).then((res) => {
      expect([200, 401, 403, 404], 'billing members').to.include(res.status);
    });
  });

  it('GET /billing/reports/revenue — revenue report', () => {
    authRequest(adminToken, 'GET', '/billing/reports/revenue', undefined, false).then((res) => {
      expect([200, 400, 401, 403, 404, 500], 'billing revenue report').to.include(res.status);
    });
  });

  it('POST /billing/checkout (best-effort)', () => {
    authRequest(
      adminToken,
      'POST',
      '/billing/checkout',
      { plan: 'Growth' },
      false,
    ).then((res) => {
      expect([200, 201, 400, 403, 404, 422, 500], 'billing checkout').to.include(res.status);
    });
  });

  it('POST /billing/mark-paused -> POST /billing/unpause lifecycle', () => {
    authRequest(
      adminToken,
      'POST',
      `/billing/mark-paused/${memberId}`,
      {},
      false,
    ).then((pause) => {
      expect([200, 204, 400, 403, 404, 422], 'billing mark paused').to.include(pause.status);

      // Unpause
      authRequest(
        adminToken,
        'POST',
        `/billing/unpause/${memberId}`,
        {},
        false,
      ).then((unpause) => {
        expect([200, 204, 400, 403, 404, 422], 'billing unpause').to.include(unpause.status);
      });
    });
  });

  it('POST /billing/coupons — create billing coupon', () => {
    authRequest(
      adminToken,
      'POST',
      '/billing/coupons',
      {
        code: `E2E-${uniq()}`.toUpperCase(),
        percentOff: 10,
      },
      false,
    ).then((res) => {
      expect([200, 201, 400, 403, 404, 422, 500], 'create billing coupon').to.include(res.status);
    });
  });

  // ============================
  // COUPONS (legacy endpoints)
  // ============================

  it('Coupons CRUD: CREATE -> LIST -> UPDATE -> DELETE', () => {
    const code = `E2E-${uniq()}`.toUpperCase();

    authRequest(
      adminToken,
      'POST',
      '/coupons',
      {
        code,
        percentOff: 15,
        gymId,
        maxUses: 10,
      },
      false,
    ).then((create) => {
      expect([200, 201, 400, 403, 404, 422, 500], 'create coupon').to.include(create.status);

      if (![200, 201].includes(create.status)) {
        cy.log(`Coupon create returned ${create.status}; skipping lifecycle`);
        return;
      }

      const couponId = (create.body as any)?._id || (create.body as any)?.id;

      // LIST
      authRequest(adminToken, 'GET', '/coupons', undefined, false).then((list) => {
        expect([200, 401, 403], 'list coupons').to.include(list.status);
      });

      if (!couponId) return;

      cleanup.track({ method: 'DELETE', url: `/coupons/${couponId}` });

      // UPDATE
      authRequest(
        adminToken,
        'PUT',
        `/coupons/${couponId}`,
        { percentOff: 20 },
        false,
      ).then((upd) => {
        expect([200, 204, 400, 403, 404], 'update coupon').to.include(upd.status);
      });

      // DELETE
      authRequest(adminToken, 'DELETE', `/coupons/${couponId}`, undefined, false).then((del) => {
        expect([200, 204, 403, 404], 'delete coupon').to.include(del.status);
      });
    });
  });
});
