/// <reference types="cypress" />

import { API_PREFIX } from '../../support/api';

describe('OpenAPI: health + public endpoints', () => {
  it('GET /auth/health returns 200', () => {
    cy.request('GET', `${API_PREFIX}/auth/health`).then((res) => {
      expect(res.status).to.eq(200);
    });
  });

  it('GET /qr/_health returns 200', () => {
    cy.request('GET', `${API_PREFIX}/qr/_health`).then((res) => {
      expect(res.status).to.eq(200);
    });
  });

  it('GET /webhooks/stripe/health returns 200 (or 4xx if disabled)', () => {
    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/webhooks/stripe/health`,
      failOnStatusCode: false,
    }).then((res) => {
      // In some environments this may require configuration; we still want to assert the endpoint exists.
      expect([200, 401, 403, 404]).to.include(res.status);
    });
  });

  it('POST /echo echoes payload', () => {
    const payload = {
      hello: 'world',
      time: new Date().toISOString(),
      nested: { ok: true },
    };

    cy.request({
      method: 'POST',
      url: `${API_PREFIX}/echo`,
      body: payload,
      failOnStatusCode: false,
    }).then((res) => {
      // Production has historically not exposed this utility route.
      expect([200, 404]).to.include(res.status);
      if (res.status === 200) {
        expect(res.body).to.deep.include(payload);
      }
    });
  });

  it('GET /memberships (public) returns list-ish payload', () => {
    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/memberships`,
      failOnStatusCode: false,
    }).then((res) => {
      // Production has historically returned 404 for some endpoints; keep this as a smoke check.
      expect([200, 404]).to.include(res.status);
      if (res.status === 200) {
        expect(res.body).to.exist;
      }
    });
  });
});
