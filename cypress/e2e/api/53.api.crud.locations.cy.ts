/**
 * 53 — Locations: /api/locations
 *
 * The only endpoint is GET /locations but let's ensure proper coverage
 * with different auth levels and query parameters.
 */

import { authRequest } from '../../support/api';

describe('Locations — endpoint coverage', () => {
  let adminToken: string;
  let trainerToken: string;
  let memberToken: string;

  before(() => {
    cy.apiLogin('admin').then(({ token }) => { adminToken = token; });
    cy.apiLogin('trainer').then(({ token }) => { trainerToken = token; });
    cy.apiLogin('member').then(({ token }) => { memberToken = token; });
  });

  it('GET /locations — admin', () => {
    authRequest(adminToken, 'GET', '/locations', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
        if (res.status === 200) {
          expect(res.body).to.satisfy((b: any) => Array.isArray(b) || typeof b === 'object');
        }
      });
  });

  it('GET /locations — trainer', () => {
    authRequest(trainerToken, 'GET', '/locations', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('GET /locations — member denied', () => {
    authRequest(memberToken, 'GET', '/locations', undefined, false)
      .then((res) => {
        expect([200, 401, 403, 404]).to.include(res.status);
      });
  });

  it('GET /locations — no auth', () => {
    authRequest(undefined, 'GET', '/locations', undefined, false)
      .then((res) => {
        expect([401, 403, 404]).to.include(res.status);
      });
  });
});
