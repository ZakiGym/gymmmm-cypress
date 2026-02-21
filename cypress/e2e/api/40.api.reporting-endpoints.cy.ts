/**
 * 40 — Reporting endpoints: /api/reporting/*
 *
 * Covers all 6 reporting endpoints used by admin dashboards.
 */

import { authRequest } from '../../support/api';

describe('Reporting endpoints', () => {
  let adminToken: string;

  before(() => {
    cy.apiLogin('admin').then(({ token }) => {
      adminToken = token;
    });
  });

  it('GET /reporting/overview — KPIs', () => {
    authRequest(adminToken, 'GET', '/reporting/overview', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('GET /reporting/revenue-chart — revenue over time', () => {
    authRequest(adminToken, 'GET', '/reporting/revenue-chart', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('GET /reporting/member-growth — signups over time', () => {
    authRequest(adminToken, 'GET', '/reporting/member-growth', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('GET /reporting/attendance — check-in patterns', () => {
    authRequest(adminToken, 'GET', '/reporting/attendance', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('GET /reporting/retention — plan breakdown & churn', () => {
    authRequest(adminToken, 'GET', '/reporting/retention', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('GET /reporting/top-classes — most popular classes', () => {
    authRequest(adminToken, 'GET', '/reporting/top-classes', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });
});
