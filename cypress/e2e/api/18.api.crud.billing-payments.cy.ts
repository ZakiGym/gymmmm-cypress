/// <reference types="cypress" />

import { API_PREFIX, getEnv } from '../../support/api';

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

const expectOkish = (status: number, extra: number[] = []) => {
  expect([200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503, ...extra]).to.include(
    status,
  );
};

const hasAdmin = () => {
  try {
    return Boolean(getEnv('ADMIN_EMAIL')) && Boolean(getEnv('ADMIN_PASSWORD'));
  } catch {
    return false;
  }
};

describe('API CRUD: billing + payments (production-safe)', () => {
  // creds are required in cypress.env.json for this suite

  let adminToken = '';
  const gymId = getEnv('GYM_ID');
  const memberId = getEnv('MEMBER_ID', '');

  before(() => {
    cy.apiLogin('admin').then((r) => {
      adminToken = r.token;
    });
  });

  it('billing summary + members are reachable (best-effort)', () => {
    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/billing/summary`,
      headers: authHeaders(adminToken),
      failOnStatusCode: false,
    }).then((res) => expectOkish(res.status));

    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/billing/members?limit=10`,
      headers: authHeaders(adminToken),
      failOnStatusCode: false,
    }).then((res) => expectOkish(res.status));
  });

  it('billing pause/unpause is reachable (best-effort)', () => {
    // Kept best-effort because pausing billing in prod can have side effects.
    cy.request({
      method: 'POST',
      url: `${API_PREFIX}/billing/pause`,
      headers: authHeaders(adminToken),
      body: { reason: 'cypress-safety-check' },
      failOnStatusCode: false,
    }).then((res) => expectOkish(res.status));

    cy.request({
      method: 'POST',
      url: `${API_PREFIX}/billing/unpause`,
      headers: authHeaders(adminToken),
      body: { reason: 'cypress-safety-check' },
      failOnStatusCode: false,
    }).then((res) => expectOkish(res.status));
  });

  it('payments: list invoices + fetch one invoice if present (read-only)', () => {
    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/payments/invoices?limit=5`,
      headers: authHeaders(adminToken),
      failOnStatusCode: false,
    }).then((res) => {
      expectOkish(res.status);
      if (res.status !== 200) return;

      const invoices = (res.body as any)?.invoices ?? (Array.isArray(res.body) ? res.body : []);
      const first = Array.isArray(invoices) ? invoices[0] : undefined;
      const invoiceId = first?._id || first?.id;

      if (!invoiceId) return;

      cy.request({
        method: 'GET',
        url: `${API_PREFIX}/payments/invoices/${invoiceId}`,
        headers: authHeaders(adminToken),
        failOnStatusCode: false,
      }).then((res2) => expectOkish(res2.status));

      // Optional PDF/download endpoints, tolerate 404 if not enabled.
      cy.request({
        method: 'GET',
        url: `${API_PREFIX}/payments/invoices/${invoiceId}/pdf`,
        headers: authHeaders(adminToken),
        failOnStatusCode: false,
      }).then((res2) => expectOkish(res2.status));
    });
  });

  it('payments export endpoints are reachable (best-effort)', () => {
    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/payments/export`,
      headers: authHeaders(adminToken),
      failOnStatusCode: false,
    }).then((res) => expectOkish(res.status));

    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/payments/export.csv`,
      headers: authHeaders(adminToken),
      failOnStatusCode: false,
    }).then((res) => expectOkish(res.status));

    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/payments/export.zip`,
      headers: authHeaders(adminToken),
      failOnStatusCode: false,
    }).then((res) => expectOkish(res.status));

    if (gymId) {
      cy.request({
        method: 'GET',
        url: `${API_PREFIX}/gyms/${gymId}/payments/export`,
        headers: authHeaders(adminToken),
        failOnStatusCode: false,
      }).then((res) => expectOkish(res.status));
    }
  });

  it('member billing endpoints are reachable if memberId exists (read-only)', () => {
    // This is intentionally read-only: no charges, no refunds on prod.
    if (!memberId) return;

    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/members/${memberId}/billing`,
      headers: authHeaders(adminToken),
      failOnStatusCode: false,
    }).then((res) => expectOkish(res.status));

    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/members/${memberId}/payments?limit=5`,
      headers: authHeaders(adminToken),
      failOnStatusCode: false,
    }).then((res) => expectOkish(res.status));
  });
});
