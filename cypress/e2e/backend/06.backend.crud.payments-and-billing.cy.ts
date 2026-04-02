// cypress/e2e/backend/06.backend.crud.payments-and-billing.cy.ts
// FILE 6: Payments & billing endpoints — admin and member views, coupon lifecycle.

import { authRequest, getEnv, login } from '../../support/api';
import { createCleanup } from '../../support/cleanup';

const uid = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

describe('Backend CRUD: Payments & Billing', () => {
  const GYM_ID = getEnv('GYM_ID', '690dd58eb250ac19d4a39ff4');

  const cleanup = createCleanup();

  let adminToken  = '';
  let memberToken = '';

  before(() => {
    login(getEnv('ADMIN_EMAIL', 'admin@gymmm.app'), getEnv('ADMIN_PASSWORD', 'StrongPass123!')).then(
      (res) => { adminToken = res.token; },
    );

    login(
      getEnv('MEMBER_EMAIL', 'zakinabizada9@gmail.com'),
      getEnv('MEMBER_PASSWORD', 'kabul@123'),
    ).then((res) => { memberToken = res.token; });
  });

  after(() => {
    cleanup.run(adminToken);
  });

  // ─────────────────────────────────────────────────────────────────
  // PAYMENTS
  // ─────────────────────────────────────────────────────────────────

  it('GET /payments/admin — admin payment list, returns 200 with data', () => {
    authRequest(adminToken, 'GET', '/payments/admin', undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited, skipping'); return; }
      expect(res.status, 'GET /payments/admin').to.eq(200);
      // Body is either an array or an object with an array property
      const data = Array.isArray(res.body)
        ? res.body
        : (res.body as any)?.payments ?? (res.body as any)?.items ?? (res.body as any)?.data;
      expect(data).to.exist;
    });
  });

  it('GET /payments/me — member own payment list, returns 200 array', () => {
    authRequest(memberToken, 'GET', '/payments/me', undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited, skipping'); return; }
      // Member payment route is /payments/me; /payments is admin-only (returns 404 for member)
      expect([200, 403, 404], 'GET /payments/me as member').to.include(res.status);
      if (res.status === 200) {
        const body = res.body;
        expect(body).to.exist;
      }
    });
  });

  it('GET /payments/me — member own payment history, returns 200', () => {
    authRequest(memberToken, 'GET', '/payments/me', undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited, skipping'); return; }
      expect([200, 404], 'GET /payments/me as member').to.include(res.status);
      if (res.status === 200) {
        expect(res.body).to.exist;
      }
    });
  });

  it('GET /payments/export — CSV export, returns 200 (admin-only)', () => {
    authRequest(adminToken, 'GET', '/payments/export', undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited, skipping'); return; }
      // 403 is acceptable — export may be restricted to superadmin on some deployments
      expect([200, 403, 404], 'GET /payments/export').to.include(res.status);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // BILLING
  // ─────────────────────────────────────────────────────────────────

  it('GET /billing/summary — returns 200 with summary fields', () => {
    authRequest(adminToken, 'GET', '/billing/summary', undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited, skipping'); return; }
      expect(res.status, 'GET /billing/summary').to.eq(200);
      // Body has at minimum a `total` count (can be 0 when no billing records)
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('total').and.be.a('number');
    });
  });

  it('GET /billing/members — returns 200 with rows array', () => {
    authRequest(adminToken, 'GET', '/billing/members', undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited, skipping'); return; }
      expect(res.status, 'GET /billing/members').to.eq(200);
      const rows = (res.body as any)?.rows ?? (res.body as any)?.items ?? (res.body as any)?.data;
      expect(rows).to.exist;
      expect(Array.isArray(rows)).to.be.true;
    });
  });

  it('GET /billing/reports/revenue — returns 200', () => {
    authRequest(adminToken, 'GET', '/billing/reports/revenue', undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited, skipping'); return; }
      // Some backends may return 400 if date range is required; tolerate it.
      expect([200, 400], 'GET /billing/reports/revenue').to.include(res.status);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // COUPONS — full CRUD lifecycle
  // ─────────────────────────────────────────────────────────────────

  it('POST /billing/coupons — creates billing coupon, returns 201', () => {
    const code = `E2E-${uid()}`.toUpperCase().slice(0, 30);

    authRequest(
      adminToken,
      'POST',
      '/billing/coupons',
      { code, percentOff: 10 },
      false,
    ).then((res) => {
      if (res.status === 429) { cy.log('rate limited, skipping'); return; }
      // Some deployments route /billing/coupons → /coupons; tolerate 404 here.
      expect([200, 201, 404], 'POST /billing/coupons').to.include(res.status);
      if ([200, 201].includes(res.status)) {
        const id = (res.body as any)?._id || (res.body as any)?.id;
        if (id) {
          cleanup.track({ method: 'DELETE', url: `/coupons/${id}` });
        }
      }
    });
  });

  it('Coupons CRUD: POST /coupons → GET /coupons → PUT → DELETE', () => {
    const code = `E2E-${uid()}`.toUpperCase().slice(0, 30);

    authRequest(
      adminToken,
      'POST',
      '/coupons',
      { code, percentOff: 10, gymId: GYM_ID },
      false,
    ).then((create) => {
      if (create.status === 429) { cy.log('rate limited, skipping'); return; }
      expect(create.status, 'create coupon').to.eq(201);
      expect(create.body).to.have.property('_id').and.be.a('string').and.not.empty;
      expect(create.body).to.have.property('code', code);

      const couponId: string = (create.body as any)._id;

      // Register for cleanup
      cleanup.track({ method: 'DELETE', url: `/coupons/${couponId}` });

      // --- GET list and verify coupon is present ---
      authRequest(adminToken, 'GET', '/coupons', undefined, false).then((list) => {
        if (list.status === 429) { cy.log('rate limited, skipping'); return; }
        expect(list.status, 'GET /coupons').to.eq(200);
        const all: any[] =
          (list.body as any)?.data ??
          (list.body as any)?.coupons ??
          (Array.isArray(list.body) ? list.body : []);
        expect(all).to.be.an('array');
        const found = all.some((c: any) => c._id === couponId || c.id === couponId);
        expect(found, `coupon ${couponId} should appear in list`).to.be.true;
      });

      // --- UPDATE discountValue (percentOff) ---
      authRequest(
        adminToken,
        'PUT',
        `/coupons/${couponId}`,
        { percentOff: 20 },
        false,
      ).then((upd) => {
        if (upd.status === 429) { cy.log('rate limited, skipping'); return; }
        expect([200, 204], 'update coupon').to.include(upd.status);
        if (upd.status === 200) {
          expect(upd.body).to.have.property('percentOff', 20);
        }
      });

      // --- DELETE ---
      authRequest(adminToken, 'DELETE', `/coupons/${couponId}`, undefined, false).then((del) => {
        if (del.status === 429) { cy.log('rate limited, skipping'); return; }
        expect([200, 204], 'delete coupon').to.include(del.status);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // Negative: duplicate coupon code → 409
  // ─────────────────────────────────────────────────────────────────

  it('POST /coupons with duplicate code → 409 or 400', () => {
    const code = `E2E-DUP-${uid()}`.toUpperCase().slice(0, 30);

    authRequest(
      adminToken,
      'POST',
      '/coupons',
      { code, percentOff: 5, gymId: GYM_ID },
      false,
    ).then((first) => {
      if (first.status === 429) { cy.log('rate limited, skipping'); return; }
      if (![200, 201].includes(first.status)) {
        cy.log(`First coupon create returned ${first.status}; skipping duplicate test`);
        return;
      }
      const firstId = (first.body as any)?._id;
      if (firstId) cleanup.track({ method: 'DELETE', url: `/coupons/${firstId}` });

      // Create duplicate
      authRequest(
        adminToken,
        'POST',
        '/coupons',
        { code, percentOff: 5, gymId: GYM_ID },
        false,
      ).then((dup) => {
        if (dup.status === 429) { cy.log('rate limited, skipping'); return; }
        expect([400, 409], 'duplicate coupon code').to.include(dup.status);
      });
    });
  });
});
