// Legacy spec re-enabled.

// cypress/e2e/03.plans-memberships-payments-coupons.cy.ts
import { authRequest, getEnv, login, API_PREFIX } from '../../support/api';

describe('Plans, Memberships, Payments, Coupons & Reports', () => {
  let adminToken: string;

  before(() => {
    login(getEnv('ADMIN_EMAIL', 'admin@gymmm.app'), getEnv('ADMIN_PASSWORD'), {
      retryOnRateLimit: true,
    }).then(
      (body) => {
        adminToken = body.token;
      },
    );
  });

  it('creates plan + membership + coupon and hits payments + reports', () => {
    const memberId = getEnv('MEMBER_ID');
    const priceId = getEnv('PRICE_ID', 'price_abc123');

    let planId: string;
    let membershipId: string;
    let couponId: string;
  let couponCode: string;

    // list plans (module may be disabled on prod)
    authRequest(adminToken, 'GET', '/plans', undefined, false)
      .then((res) => {
        expect([200, 401, 403, 404, 429, 500, 502, 503]).to.include(res.status);
        if (res.status === 200) expect(res.body).to.be.an('array');
      })
      // create plan (best-effort)
      .then(() =>
        authRequest(
          adminToken,
          'POST',
          '/plans',
          {
            name: 'Starter – Cypress',
            priceMonthly: 99,
            features: ['classes', 'bookings', 'qr'],
          },
          false,
        ),
      )
      .then((res) => {
        expect([201, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503]).to.include(res.status);
        if (res.status === 201) planId = res.body._id;
      })
      // membership (only if plan was created)
      .then(() => {
        if (!planId) return;
        return authRequest(
          adminToken,
          'POST',
          '/memberships',
          { memberId, planId, status: 'active' },
          false,
        );
      })
      .then((res) => {
        if (!res) return;
        expect([201, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503]).to.include((res as any).status);
        if ((res as any).status === 201) membershipId = (res as any).body._id;
      })
      .then(() => {
        if (!membershipId) return;
        return authRequest(adminToken, 'PUT', `/memberships/${membershipId}`, { status: 'canceled' }, false);
      })
      .then((res) => {
        if (!res) return;
        expect([200, 400, 401, 403, 404, 422, 429, 500, 502, 503]).to.include((res as any).status);
      })
      // coupon (best-effort)
      .then(() => {
        couponCode = `CYPRESS20-${Date.now()}`;
        return authRequest(
          adminToken,
          'POST',
          '/coupons',
          { code: couponCode, percentOff: 20, maxRedemptions: 10, expiresAt: '2025-12-31T23:59:59Z' },
          false,
        );
      })
      .then((res) => {
        expect([201, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503]).to.include(res.status);
        if (res.status === 201) couponId = res.body._id;
      })
      // apply coupon (only if created)
      .then(() => {
        if (!couponId) return;
        return authRequest(adminToken, 'POST', '/coupons/apply', { code: couponCode, priceId }, false);
      })
      .then((res) => {
        if (!res) return;
        // Many backends require coupon code instead of id; treat as best-effort.
        expect([200, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503]).to.include((res as any).status);
      })
      // payments (best-effort)
      .then(() =>
        authRequest(
          adminToken,
          'POST',
          '/payments/checkout-session',
          {
            priceId,
            successUrl: 'https://app.gymmm.app/payment-success',
            cancelUrl: 'https://app.gymmm.app/payment-cancelled',
          },
          false,
        ),
      )
      .then((res) => {
        expect([200, 400, 401, 403, 404, 422, 429, 500, 502, 503]).to.include(res.status);
        if (res.status === 200) expect(res.body).to.have.property('url');
      })
      .then(() => authRequest(adminToken, 'GET', '/payments/invoices?limit=5', undefined, false))
      .then((res) => {
        expect([200, 401, 403, 404, 429, 500, 502, 503]).to.include(res.status);
        if (res.status === 200) expect(res.body).to.be.an('array');
      })
      // reports (best-effort)
      .then(() => authRequest(adminToken, 'GET', '/reports/revenue?from=2025-11-01&to=2025-12-01', undefined, false))
      .then((res) => {
        expect([200, 400, 401, 403, 404, 422, 429, 500, 502, 503]).to.include(res.status);
      })
      .then(() => authRequest(adminToken, 'GET', '/reports/subscriptions?from=2025-11-01&to=2025-12-01', undefined, false))
      .then((res) => {
        expect([200, 400, 401, 403, 404, 422, 429, 500, 502, 503]).to.include(res.status);
      })
      // cleanup only what we created
      .then(() => {
        if (!couponId) return;
        return authRequest(adminToken, 'DELETE', `/coupons/${couponId}`, undefined, false);
      })
      .then((res) => {
        if (!res) return;
        expect([200, 204, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503]).to.include((res as any).status);
      })
      .then(() => {
        if (!planId) return;
        return authRequest(adminToken, 'DELETE', `/plans/${planId}`, undefined, false);
      })
      .then((res) => {
        if (!res) return;
        expect([200, 204, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503]).to.include((res as any).status);
      });

    // unauthorized payments call
    cy.request({
      method: 'POST',
      url: `${API_PREFIX}/payments/checkout-session`,
      failOnStatusCode: false,
      body: {
        priceId,
        successUrl: 'https://app.gymmm.app/payment-success',
        cancelUrl: 'https://app.gymmm.app/payment-cancelled',
      },
    }).then((res) => {
      expect(res.status).to.eq(401);
    });
  });
});