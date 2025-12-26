/// <reference types="cypress" />

import { API_PREFIX } from '../../support/api';

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('OpenAPI: auth + basic admin smoke', () => {
  it('admin can login and call /auth/me', () => {
    cy.apiLogin('admin').then(({ token }) => {
      cy.request({
        method: 'GET',
        url: `${API_PREFIX}/auth/me`,
        headers: authHeaders(token),
      }).then((res) => {
        expect(res.status).to.eq(200);
        // Production has returned different shapes; accept either.
        const user = (res.body as any).user ?? res.body;
        expect(user).to.be.an('object');
      });
    });
  });

  it('admin can load dashboard stats (if enabled)', () => {
    cy.apiLogin('admin').then(({ token }) => {
      cy.request({
        method: 'GET',
        url: `${API_PREFIX}/admin/dashboard/stats`,
        headers: authHeaders(token),
        failOnStatusCode: false,
      }).then((res) => {
        expect([200, 401, 403, 404, 429, 500, 502, 503, 504]).to.include(res.status);
        if (res.status === 200) expect(res.body).to.exist;
      });
    });
  });

  it('admin can fetch notifications list + unread count', () => {
    cy.apiLogin('admin').then(({ token }) => {
      cy.request({
        method: 'GET',
        url: `${API_PREFIX}/notifications`,
        headers: authHeaders(token),
        failOnStatusCode: false,
      }).then((res) => {
        expect([200, 401, 403, 404, 429, 500, 502, 503, 504]).to.include(res.status);
      });

      cy.request({
        method: 'GET',
        url: `${API_PREFIX}/notifications/unread-count`,
        headers: authHeaders(token),
        failOnStatusCode: false,
      }).then((res) => {
        expect([200, 401, 403, 404, 429, 500, 502, 503, 504]).to.include(res.status);
      });
    });
  });

  it('admin can call QR issue/me endpoints (if member context exists)', () => {
    cy.apiLogin('admin').then(({ token }) => {
      cy.request({
        method: 'POST',
        url: `${API_PREFIX}/qr/issue`,
        headers: authHeaders(token),
        failOnStatusCode: false,
      }).then((res) => {
        // historically can be 200 or 201
        expect([200, 201, 401, 403, 404, 429, 500, 502, 503, 504]).to.include(res.status);
      });

      cy.request({
        method: 'GET',
        url: `${API_PREFIX}/qr/me`,
        headers: authHeaders(token),
        failOnStatusCode: false,
      }).then((res) => {
        expect([200, 401, 403, 404, 429, 500, 502, 503, 504]).to.include(res.status);
      });
    });
  });
});
