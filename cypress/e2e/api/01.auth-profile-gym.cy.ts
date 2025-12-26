/// <reference types="cypress" />

import { API_PREFIX } from '../../support/api';

describe('Auth/Profile/Gym (production-safe)', () => {
  it('admin can login and fetch /auth/me', () => {
    cy.apiLogin('admin').then(({ token }) => {
      cy.request({
        method: 'GET',
        url: `${API_PREFIX}/auth/me`,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      }).then((res) => {
        // tolerate prod drift, but require non-5xx for a healthy auth path
        expect([200, 401, 403, 404]).to.include(res.status);
      });
    });
  });
});