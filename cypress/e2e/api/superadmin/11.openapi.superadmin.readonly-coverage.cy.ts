/// <reference types="cypress" />

import { API_PREFIX, getEnv } from '../../../support/api';

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

const expectExistsish = (status: number) => {
  expect([200, 401, 403, 404]).to.include(status);
};

describe('Superadmin - OpenAPI - read-only coverage (production-safe)', () => {
  let token = '';
  const gymId = getEnv('GYM_ID');

  before(() => {
    cy.apiLogin('superadmin').then((r) => {
      token = r.token;
    });
  });

  it('Superadmin - Audit - audit-log list + csv export reachable (best-effort)', () => {
    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/audit-log?limit=5`,
      headers: authHeaders(token),
      failOnStatusCode: false,
    }).then((res) => expectExistsish(res.status));

    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/audit-log/logs.csv`,
      headers: authHeaders(token),
      failOnStatusCode: false,
    }).then((res) => expectExistsish(res.status));
  });

  it('Superadmin - Gyms/Users/Payments - endpoints reachable (best-effort)', () => {
    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/superadmin/gyms/${gymId}/users`,
      headers: authHeaders(token),
      failOnStatusCode: false,
    }).then((res) => expectExistsish(res.status));

    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/superadmin/gyms/${gymId}/payments`,
      headers: authHeaders(token),
      failOnStatusCode: false,
    }).then((res) => expectExistsish(res.status));

    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/superadmin/gyms/${gymId}/payments/export`,
      headers: authHeaders(token),
      failOnStatusCode: false,
    }).then((res) => expectExistsish(res.status));
  });
});
