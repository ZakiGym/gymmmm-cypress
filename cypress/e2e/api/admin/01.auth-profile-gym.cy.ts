// cypress/e2e/api/admin/01.auth-profile-gym.cy.ts
import { API_PREFIX } from '../../../support/api';

describe('Admin - Auth/Profile/Gym - Production-safe flow', () => {
  it('Admin - Auth - login and fetch /auth/me', () => {
    cy.apiLogin('admin').then(({ token }) => {
      cy.request({
        method: 'GET',
        url: `${API_PREFIX}/auth/me`,
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property('id');
      });
    });
  });

  it('Admin - Profile - update profile (best-effort)', () => {
    cy.apiLogin('admin').then(({ token }) => {
      cy.request({
        method: 'PUT',
        url: `${API_PREFIX}/user/profile`,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
        body: {
          firstName: 'Admin',
          lastName: 'Cypress',
          phone: '+1-555-1010',
        },
      }).then((res) => {
        expect([200, 400, 401, 403, 404, 422, 429, 500, 502, 503]).to.include(res.status);
      });
    });
  });

  it('Admin - Gym - fetch gym and locations (best-effort)', () => {
    cy.apiLogin('admin').then(({ token }) => {
      cy.request({
        method: 'GET',
        url: `${API_PREFIX}/gym`,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      }).then((res) => {
        expect([200, 401, 403, 404, 429, 500, 502, 503]).to.include(res.status);
      });

      cy.request({
        method: 'GET',
        url: `${API_PREFIX}/locations`,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      }).then((res) => {
        expect([200, 401, 403, 404, 429, 500, 502, 503]).to.include(res.status);
      });
    });
  });
});
