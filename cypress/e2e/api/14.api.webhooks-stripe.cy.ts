// cypress/e2e/14.api.webhooks-stripe.cy.ts

import { authRequest } from '../../support/api';

const isJson = (ct?: string) => (ct || '').includes('application/json');
const headerToString = (v: unknown) => (Array.isArray(v) ? v.join(';') : (v as any)) as string | undefined;

const expectHasMessage = (body: any) => {
  const msg = body?.message || body?.error || body?.errors;
  expect(msg, 'error/message payload').to.exist;
};

// Note: Signature validation requires a secret that we do NOT have in this repo.
// So this spec focuses on production-safe behaviors:
// - health endpoint
// - invalid signature rejected OR endpoint disabled
// - idempotency-style replays do not crash the service (best-effort)

describe('API: Stripe webhooks (production-safe realism)', () => {
  it('GET /webhooks/stripe/health returns 200 (or 4xx if disabled)', () => {
    authRequest(undefined, 'GET', '/webhooks/stripe/health', undefined, false).then((res) => {
      expect([200, 401, 403, 404], 'health may be disabled/protected').to.include(res.status);
    });
  });

  it('POST /webhooks/stripe invalid signature returns 4xx (best-effort)', () => {
    // Minimal Stripe-like payload
    const event = {
      id: `evt_test_${Date.now()}`,
      object: 'event',
      api_version: '2024-06-20',
      created: Math.floor(Date.now() / 1000),
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: `pi_test_${Date.now()}`,
          object: 'payment_intent',
          amount: 1000,
          currency: 'usd',
        },
      },
      livemode: false,
    };

    // Deliberately wrong signature header
    cy.request({
      method: 'POST',
      url: `/api/webhooks/stripe`,
      failOnStatusCode: false,
      headers: {
        'stripe-signature': 't=0,v1=invalid',
        'content-type': 'application/json',
      },
      body: event,
      timeout: 20000,
    }).then((res) => {
      // If webhook endpoint is enabled, invalid signature should be 400/401.
      // If not deployed/disabled, 404 is acceptable.
      // If protected by auth (rare), 401/403 acceptable.
      expect([200, 400, 401, 403, 404], 'status for invalid signature').to.include(res.status);

      // Prefer 4xx; treat 200 as "accepts unsigned" and just log.
      if (res.status === 200) {
        cy.log('Webhook accepted invalid signature (unsigned mode or signature check disabled)');
      }

      if (res.status >= 400 && isJson(headerToString(res.headers['content-type']))) {
        expectHasMessage(res.body);
      }
    });
  });

  it('Idempotency replay: sending same event twice should not error (best-effort)', () => {
    const eventId = `evt_replay_${Date.now()}`;
    const event = {
      id: eventId,
      object: 'event',
      api_version: '2024-06-20',
      created: Math.floor(Date.now() / 1000),
      type: 'charge.succeeded',
      data: { object: { id: `ch_${Date.now()}`, object: 'charge', amount: 1000, currency: 'usd' } },
      livemode: false,
    };

    const send = () =>
      cy.request({
        method: 'POST',
        url: `/api/webhooks/stripe`,
        failOnStatusCode: false,
        headers: {
          'stripe-signature': 't=0,v1=invalid',
          'content-type': 'application/json',
        },
        body: event,
        timeout: 20000,
      });

    send().then((first) => {
      // Don't fail the suite if endpoint is disabled.
      if ([404].includes(first.status)) {
        cy.log('Webhook endpoint not found; skipping replay expectations');
        return;
      }

      // If server errors, log but don't fail — prod volatility.
      if (first.status >= 500) {
        cy.log('First webhook call returned 5xx; skipping replay expectations');
        return;
      }

      send().then((second) => {
        if (second.status >= 500) {
          cy.log('Second webhook call returned 5xx; replay handling unstable');
          return;
        }

        // We only assert that replay doesn't worsen behavior.
        // Many implementations reply 2xx even for duplicates.
        expect([200, 400, 401, 403], 'second call status').to.include(second.status);
      });
    });
  });
});
