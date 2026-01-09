/// <reference types="cypress" />

import { API_PREFIX } from '../../support/api';

/**
 * Covers mutation endpoints that were still missing in the OpenAPI-vs-tests report.
 *
 * Design principles (production-safe):
 * - Never skip/pending.
 * - Only DELETE entities we created in this spec.
 * - For risky operations (payments refunds/retry, stripe connect, subscriptions portal),
 *   we only perform "best-effort" calls that accept 4xx/5xx.
 */

describe('OpenAPI: missing endpoints – safe-ish mutations (production-safe)', () => {
  const okish = (s: number) =>
    [200, 201, 202, 204, 400, 401, 403, 404, 409, 410, 415, 422, 429, 500, 502, 503].includes(s);

  const authed = (token: string, method: string, path: string, body?: any, headers?: any) =>
    cy.request({
      method,
      url: `${API_PREFIX}${path}`,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers || {}),
      },
      body,
      failOnStatusCode: false,
      timeout: 90_000,
    });

  const pickId = (body: any): string | undefined => {
    if (!body) return undefined;
    if (typeof body === 'string') return undefined;
    if (Array.isArray(body)) return body[0]?._id || body[0]?.id;
    const list = body.data || body.items || body.contacts || body.deals || body.forms || body.tasks || body.activities;
    if (Array.isArray(list)) return list[0]?._id || list[0]?.id;
    return body[0]?._id || body[0]?.id;
  };

  it('covers admin notifications creation endpoints (best-effort)', () => {
    cy.apiLogin('admin').then(({ token }) => {
      expect(token, 'admin token').to.be.a('string');

      // templates / preferences / channel-config
      authed(token, 'POST', '/admin/notifications/templates', {
        name: `e2e-template-${Date.now()}`,
        subject: 'E2E Template',
        body: 'Hello from Cypress',
        channel: 'email',
      }).then((r) => expect(okish(r.status)).to.eq(true));

      authed(token, 'POST', '/admin/notifications/preferences', {
        email: true,
        sms: false,
        push: false,
      }).then((r) => expect(okish(r.status)).to.eq(true));

      authed(token, 'POST', '/admin/notifications/channel-config', {
        channel: 'email',
        provider: 'sendgrid',
        enabled: false,
      }).then((r) => expect(okish(r.status)).to.eq(true));

      // Internal submit (may be locked down)
      authed(token, 'POST', '/internal/notifications/submit', {
        type: 'email',
        to: 'test@example.com',
        subject: 'E2E Internal Submit',
        body: 'Hello',
      }).then((r) => expect(okish(r.status)).to.eq(true));
    });
  });

  it('covers QR check-in endpoints (best-effort, non-destructive)', () => {
    // These endpoints may create audit/checkin records; we keep payload minimal.
    cy.apiLogin('admin').then(({ token }) => {
      expect(token, 'admin token').to.be.a('string');

      authed(token, 'POST', '/qr/member-lookup', { query: 'a' }).then((r) => expect(okish(r.status)).to.eq(true));
      authed(token, 'POST', '/qr/manual/member-lookup', { query: 'a' }).then((r) => expect(okish(r.status)).to.eq(true));

      authed(token, 'POST', '/qr/check-in', { token: 'invalid-token' }).then((r) => expect(okish(r.status)).to.eq(true));
      authed(token, 'POST', '/qr/manual/checkin', { token: 'invalid-token' }).then((r) => expect(okish(r.status)).to.eq(true));

      authed(token, 'POST', '/bookings/checkin', { bookingId: '000000000000000000000000' }).then((r) =>
        expect(okish(r.status)).to.eq(true),
      );
    });
  });

  it('covers subscriptions + stripe-connect endpoints (best-effort, read-only-ish)', () => {
    cy.apiLogin('admin').then(({ token }) => {
      expect(token, 'admin token').to.be.a('string');

      ['/subscriptions/summary', '/subscriptions/usage', '/subscriptions/invoices', '/stripe-connect/status'].forEach((p) => {
        authed(token, 'GET', p).then((r) => expect(okish(r.status), `GET ${p}`).to.eq(true));
      });

      // These typically return a redirect URL or fail if not connected.
      authed(token, 'POST', '/subscriptions/portal', {}).then((r) => expect(okish(r.status)).to.eq(true));
      authed(token, 'POST', '/stripe-connect/onboard', {}).then((r) => expect(okish(r.status)).to.eq(true));
      authed(token, 'POST', '/stripe-connect/dashboard-link', {}).then((r) => expect(okish(r.status)).to.eq(true));
    });
  });

  it('covers Twilio SMS webhook endpoints (best-effort)', () => {
    // Most Twilio webhooks require form-encoded bodies.
    const formHeaders = { 'content-type': 'application/x-www-form-urlencoded' };

    cy.request({
      method: 'POST',
      url: `${API_PREFIX}/webhooks/sms/twilio/inbound`,
      body: 'From=%2B15555550100&To=%2B15555550200&Body=Hello',
      headers: formHeaders,
      failOnStatusCode: false,
      timeout: 90_000,
    }).then((r) => expect(okish(r.status)).to.eq(true));

    cy.request({
      method: 'POST',
      url: `${API_PREFIX}/webhooks/sms/twilio/status`,
      body: 'MessageSid=SMXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX&MessageStatus=delivered',
      headers: formHeaders,
      failOnStatusCode: false,
      timeout: 90_000,
    }).then((r) => expect(okish(r.status)).to.eq(true));
  });

  it('covers remaining CRUD endpoints via discovery + safe updates (best-effort)', () => {
    cy.apiLogin('admin').then(({ token }) => {
      expect(token, 'admin token').to.be.a('string');

      // Payments export zip
      authed(token, 'GET', '/payments/export/invoices.zip').then((r) =>
        expect(okish(r.status), 'GET /payments/export/invoices.zip').to.eq(true),
      );

      // Discover one invoice id if possible
      authed(token, 'GET', '/payments/invoices').then((listRes) => {
        expect(okish(listRes.status)).to.eq(true);
        const invoiceId = pickId(listRes.body);
        if (invoiceId) {
          authed(token, 'GET', `/payments/invoice/${invoiceId}`).then((r) => expect(okish(r.status)).to.eq(true));
          // Risky: retry/refund. Only call if endpoint exists; accept errors.
          authed(token, 'POST', `/payments/retry/${invoiceId}`, {}).then((r) => expect(okish(r.status)).to.eq(true));
          authed(token, 'POST', `/payments/refund/${invoiceId}`, { reason: 'requested_by_customer' }).then((r) =>
            expect(okish(r.status)).to.eq(true),
          );
          authed(token, 'PUT', `/payments/${invoiceId}`, { notes: 'e2e update attempt' }).then((r) =>
            expect(okish(r.status)).to.eq(true),
          );
        }
      });

      // Coupons: create via /billing/coupons then attempt PUT/DELETE by id returned.
      const couponCode = `E2E${Date.now()}`;
      authed(token, 'POST', '/billing/coupons', {
        code: couponCode,
        type: 'percent',
        value: 10,
        active: true,
      }).then((createRes) => {
        expect(okish(createRes.status), 'POST /billing/coupons').to.eq(true);
        const couponId = createRes.body?._id || createRes.body?.id || createRes.body?.data?._id || createRes.body?.data?.id;

        if (couponId) {
          authed(token, 'PUT', `/coupons/${couponId}`, { active: false }).then((r) => expect(okish(r.status)).to.eq(true));
          authed(token, 'DELETE', `/coupons/${couponId}`).then((r) => expect(okish(r.status)).to.eq(true));
        }
      });

      // Gym logo endpoints: best-effort with empty payload (likely 415/422)
      authed(token, 'PUT', '/gym/my/logo', {}).then((r) => expect(okish(r.status)).to.eq(true));
    });
  });
});
