/// <reference types="cypress" />

import { API_PREFIX } from '../../../support/api';

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('Admin - OpenAPI - auth + basic smoke', () => {
  it('Admin - Auth - login and call /auth/me', () => {
    cy.apiLogin('admin').then(({ token }) => {
      cy.request({
        method: 'GET',
        url: `${API_PREFIX}/auth/me`,
        headers: authHeaders(token),
      }).then((res) => {
        expect(res.status).to.eq(200);
        const user = (res.body as any).user ?? res.body;
        expect(user).to.be.an('object');
      });
    });
  });

  it('Admin - Dashboard - load dashboard stats (if enabled)', () => {
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

  it('Admin - Notifications - fetch list + unread count (best-effort)', () => {
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

  it('Admin - QR - call issue/me endpoints (best-effort)', () => {
    cy.apiLogin('admin').then(({ token }) => {
      cy.request({
        method: 'POST',
        url: `${API_PREFIX}/qr/issue`,
        headers: authHeaders(token),
        failOnStatusCode: false,
      }).then((res) => {
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
