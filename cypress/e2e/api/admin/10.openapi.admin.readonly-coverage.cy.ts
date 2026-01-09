/// <reference types="cypress" />

import { API_PREFIX, getEnv } from '../../../support/api';

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

const expectExistsish = (status: number) => {
  expect([200, 401, 403, 404]).to.include(status);
};

describe('Admin - OpenAPI - read-only coverage (production-safe)', () => {
  let token = '';
  const gymId = getEnv('GYM_ID');

  before(() => {
    cy.apiLogin('admin').then((r) => {
      token = r.token;
    });
  });

  it('Admin - Analytics - analytics/dashboard endpoints reachable (best-effort)', () => {
    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/admin/analytics/${gymId}`,
      headers: authHeaders(token),
      failOnStatusCode: false,
    }).then((res) => expectExistsish(res.status));

    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/admin/analytics/export?format=csv`,
      headers: authHeaders(token),
      failOnStatusCode: false,
    }).then((res) => expectExistsish(res.status));

    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/admin/dashboard/stats`,
      headers: authHeaders(token),
      failOnStatusCode: false,
    }).then((res) => expectExistsish(res.status));
  });

  it('Admin - Billing - summary + members list reachable (best-effort)', () => {
    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/billing/summary`,
      headers: authHeaders(token),
      failOnStatusCode: false,
    }).then((res) => expectExistsish(res.status));

    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/billing/members?limit=5&page=1`,
      headers: authHeaders(token),
      failOnStatusCode: false,
    }).then((res) => expectExistsish(res.status));
  });

  it('Admin - Payments/Bookings - exports reachable (best-effort)', () => {
    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/payments/admin`,
      headers: authHeaders(token),
      failOnStatusCode: false,
    }).then((res) => expectExistsish(res.status));

    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/payments/export`,
      headers: authHeaders(token),
      failOnStatusCode: false,
    }).then((res) => expectExistsish(res.status));

    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/bookings/admin`,
      headers: authHeaders(token),
      failOnStatusCode: false,
    }).then((res) => expectExistsish(res.status));

    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/bookings/export`,
      headers: authHeaders(token),
      failOnStatusCode: false,
    }).then((res) => expectExistsish(res.status));
  });

  it('Admin - Settings - settings bundle reachable (best-effort)', () => {
    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/settings`,
      headers: authHeaders(token),
      failOnStatusCode: false,
    }).then((res) => expectExistsish(res.status));
  });
});
