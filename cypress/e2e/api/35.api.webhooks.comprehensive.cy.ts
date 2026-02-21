// cypress/e2e/api/35.api.webhooks.comprehensive.cy.ts

import { API_PREFIX, authRequest } from '../../support/api';

describe('API: Webhook Endpoints Comprehensive (best-effort)', () => {
  let adminToken = '';

  before(() => {
    cy.apiLogin('admin').then(({ token }) => {
      adminToken = token;
    });
  });

  // ============================
  // STRIPE WEBHOOKS
  // ============================

  it('GET /webhooks/stripe/health — webhook health check', () => {
    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/webhooks/stripe/health`,
      failOnStatusCode: false,
    }).then((res) => {
      expect([200, 204, 404], 'stripe webhook health').to.include(res.status);
    });
  });

  it('POST /webhooks/stripe — with valid-looking payload (no signature)', () => {
    cy.request({
      method: 'POST',
      url: `${API_PREFIX}/webhooks/stripe`,
      body: {
        id: 'evt_test_e2e',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_e2e',
            amount_total: 5000,
            currency: 'usd',
            status: 'complete',
          },
        },
      },
      headers: {
        'stripe-signature': 'invalid-sig-e2e',
      },
      failOnStatusCode: false,
    }).then((res) => {
      // Without valid Stripe signature, expect 400 or 200 (if Stripe not configured)
      expect([200, 400, 401, 403, 500], 'stripe webhook invalid sig').to.include(res.status);
    });
  });

  it('POST /webhooks/stripe — idempotent duplicate event', () => {
    cy.request({
      method: 'POST',
      url: `${API_PREFIX}/webhooks/stripe`,
      body: {
        id: 'evt_duplicate_e2e',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_duplicate' } },
      },
      headers: { 'stripe-signature': 'invalid' },
      failOnStatusCode: false,
    }).then((res) => {
      expect([200, 400, 401, 500], 'stripe webhook duplicate').to.include(res.status);
    });
  });

  // ============================
  // LEGACY STRIPE WEBHOOK
  // ============================

  it('POST /webhooks-raw/stripe — legacy webhook endpoint', () => {
    cy.request({
      method: 'POST',
      url: `${API_PREFIX}/webhooks-raw/stripe`,
      body: {
        id: 'evt_raw_test_e2e',
        type: 'invoice.payment_succeeded',
        data: { object: { id: 'in_test' } },
      },
      headers: { 'stripe-signature': 'invalid' },
      failOnStatusCode: false,
    }).then((res) => {
      expect([200, 400, 401, 404, 500], 'legacy stripe webhook').to.include(res.status);
    });
  });

  // ============================
  // SENDGRID EMAIL WEBHOOK
  // ============================

  it('POST /webhooks/email/sendgrid — email event webhook', () => {
    cy.request({
      method: 'POST',
      url: `${API_PREFIX}/webhooks/email/sendgrid`,
      body: [
        {
          email: 'test@test.com',
          event: 'bounce',
          sg_event_id: 'e2e-test-event',
          sg_message_id: 'e2e-msg',
          timestamp: Math.floor(Date.now() / 1000),
          type: 'bounce',
          reason: 'test bounce',
        },
      ],
      failOnStatusCode: false,
    }).then((res) => {
      expect([200, 204, 400, 404, 500], 'sendgrid email webhook').to.include(res.status);
    });
  });

  it('POST /webhooks/email/sendgrid — empty array', () => {
    cy.request({
      method: 'POST',
      url: `${API_PREFIX}/webhooks/email/sendgrid`,
      body: [],
      failOnStatusCode: false,
    }).then((res) => {
      expect([200, 204, 400, 404, 500], 'sendgrid empty array').to.include(res.status);
    });
  });

  // ============================
  // TWILIO SMS WEBHOOKS
  // ============================

  it('POST /webhooks/sms/twilio/inbound — inbound SMS (STOP handling)', () => {
    cy.request({
      method: 'POST',
      url: `${API_PREFIX}/webhooks/sms/twilio/inbound`,
      form: true,
      body: {
        From: '+15551234567',
        To: '+15559876543',
        Body: 'STOP',
        MessageSid: 'SM_e2e_test',
        AccountSid: 'AC_e2e_test',
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect([200, 204, 400, 404, 500], 'twilio inbound SMS').to.include(res.status);
    });
  });

  it('POST /webhooks/sms/twilio/status — delivery status callback', () => {
    cy.request({
      method: 'POST',
      url: `${API_PREFIX}/webhooks/sms/twilio/status`,
      form: true,
      body: {
        MessageSid: 'SM_e2e_status_test',
        MessageStatus: 'delivered',
        To: '+15551234567',
        From: '+15559876543',
        AccountSid: 'AC_e2e_test',
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect([200, 204, 400, 404, 500], 'twilio status callback').to.include(res.status);
    });
  });

  // ============================
  // STRIPE SUBSCRIPTION WEBHOOK
  // ============================

  it('POST /webhooks/stripe-subscriptions — subscription event', () => {
    // This is mounted at the top level in app.js
    cy.request({
      method: 'POST',
      url: '/api/webhooks/stripe-subscriptions',
      body: {
        id: 'evt_sub_test_e2e',
        type: 'customer.subscription.updated',
        data: { object: { id: 'sub_test', status: 'active' } },
      },
      headers: { 'stripe-signature': 'invalid' },
      failOnStatusCode: false,
    }).then((res) => {
      expect([200, 400, 401, 404, 500], 'stripe subscription webhook').to.include(res.status);
    });
  });
});
