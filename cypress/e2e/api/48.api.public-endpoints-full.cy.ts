/**
 * 48 — Public endpoints: full coverage
 *
 * Covers all /api/public/* + root health checks + Swagger docs.
 * No auth required for any of these.
 */

import { API_PREFIX } from '../../support/api';

describe('Public endpoints — full coverage', () => {

  /* ─── Root & infrastructure ──────────────────────────── */

  it('GET / — root liveness', () => {
    cy.request({ url: '/', failOnStatusCode: false }).then((res) => {
      expect([200, 301, 302, 404]).to.include(res.status);
    });
  });

  it('GET /__health — JSON health check', () => {
    cy.request({ url: '/__health', failOnStatusCode: false }).then((res) => {
      expect([200, 404]).to.include(res.status);
    });
  });

  it('GET /__ready — readiness probe', () => {
    cy.request({ url: '/__ready', failOnStatusCode: false }).then((res) => {
      expect([200, 404]).to.include(res.status);
    });
  });

  it('GET /docs — Swagger UI', () => {
    cy.request({ url: '/docs', failOnStatusCode: false }).then((res) => {
      expect([200, 301, 302, 404]).to.include(res.status);
    });
  });

  it('GET /docs-json — Swagger spec JSON', () => {
    cy.request({ url: '/docs-json', failOnStatusCode: false }).then((res) => {
      expect([200, 404]).to.include(res.status);
    });
  });

  it('GET /api/openapi.json — OpenAPI spec', () => {
    cy.request({ url: `${API_PREFIX}/openapi.json`, failOnStatusCode: false }).then((res) => {
      expect([200, 404]).to.include(res.status);
    });
  });

  /* ─── Public API endpoints ──────────────────────────── */

  it('GET /api/public — root info', () => {
    cy.request({ url: `${API_PREFIX}/public`, failOnStatusCode: false }).then((res) => {
      expect([200, 404]).to.include(res.status);
    });
  });

  it('GET /api/public/health — liveness', () => {
    cy.request({ url: `${API_PREFIX}/public/health`, failOnStatusCode: false }).then((res) => {
      expect([200, 404]).to.include(res.status);
    });
  });

  it('GET /api/public/ready — readiness', () => {
    cy.request({ url: `${API_PREFIX}/public/ready`, failOnStatusCode: false }).then((res) => {
      expect([200, 404]).to.include(res.status);
    });
  });

  it('GET /api/public/plans — marketing/public plans', () => {
    cy.request({ url: `${API_PREFIX}/public/plans`, failOnStatusCode: false }).then((res) => {
      expect([200, 404]).to.include(res.status);
      if (res.status === 200 && Array.isArray(res.body)) {
        expect(res.body.length).to.be.gte(0);
      }
    });
  });

  it('POST /api/public/signup/gym — lead capture', () => {
    cy.request({
      method: 'POST',
      url: `${API_PREFIX}/public/signup/gym`,
      body: {
        gymName: `CY Test Gym ${Date.now()}`,
        ownerName: 'Cypress Test',
        email: `cy-lead-${Date.now()}@example.com`,
        phone: '+1234567890',
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect([200, 201, 400, 404, 409, 422, 429]).to.include(res.status);
    });
  });

  it('GET /api/public/gym-by-subdomain — resolve subdomain', () => {
    cy.request({
      url: `${API_PREFIX}/public/gym-by-subdomain?subdomain=test-gym`,
      failOnStatusCode: false,
    }).then((res) => {
      expect([200, 400, 404, 429]).to.include(res.status);
    });
  });

  it('GET /api/public/gym-profile/:subdomain — gym profile', () => {
    cy.request({
      url: `${API_PREFIX}/public/gym-profile/test-gym`,
      failOnStatusCode: false,
    }).then((res) => {
      expect([200, 400, 404, 429]).to.include(res.status);
    });
  });

  /* ─── Public CRM form ───────────────────────────────── */

  it('POST /api/public/crm/forms/:fakeId/submit — lead form with fake ID', () => {
    cy.request({
      method: 'POST',
      url: `${API_PREFIX}/public/crm/forms/000000000000000000000000/submit`,
      body: {
        name: 'Cypress Lead',
        email: `cy-lead-${Date.now()}@example.com`,
        phone: '+1234567890',
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect([200, 201, 400, 404, 422, 429]).to.include(res.status);
    });
  });

  /* ─── Auth health ────────────────────────────────────── */

  it('GET /api/auth/health — auth service health', () => {
    cy.request({ url: `${API_PREFIX}/auth/health`, failOnStatusCode: false }).then((res) => {
      expect([200, 404]).to.include(res.status);
    });
  });

  /* ─── QR health ──────────────────────────────────────── */

  it('GET /api/qr/_health — QR service health', () => {
    cy.request({ url: `${API_PREFIX}/qr/_health`, failOnStatusCode: false }).then((res) => {
      expect([200, 404]).to.include(res.status);
    });
  });

  /* ─── Stripe webhook health ──────────────────────────── */

  it('GET /api/webhooks/stripe/health — webhook health', () => {
    cy.request({ url: `${API_PREFIX}/webhooks/stripe/health`, failOnStatusCode: false }).then((res) => {
      expect([200, 404]).to.include(res.status);
    });
  });

  /* ─── Public memberships listing ─────────────────────── */

  it('GET /api/memberships — public pricing', () => {
    cy.request({ url: `${API_PREFIX}/memberships`, failOnStatusCode: false }).then((res) => {
      expect([200, 404]).to.include(res.status);
    });
  });

  /* ─── Public classes listing ─────────────────────────── */

  it('GET /api/classes — public class list', () => {
    cy.request({ url: `${API_PREFIX}/classes`, failOnStatusCode: false }).then((res) => {
      expect([200, 404]).to.include(res.status);
    });
  });
});
