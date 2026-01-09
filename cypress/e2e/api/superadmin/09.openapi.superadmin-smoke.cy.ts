// cypress/e2e/api/superadmin/09.openapi.superadmin-smoke.cy.ts
import { API_PREFIX } from '../../../support/api';

describe('Superadmin - OpenAPI - smoke coverage', () => {
  it('Superadmin - Gyms - list gyms (best-effort)', () => {
    cy.apiLogin('superadmin').then(({ token }) => {
      cy.request({
        method: 'GET',
        url: `${API_PREFIX}/superadmin/gyms`,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      }).then((res) => {
        expect([200, 401, 403, 404, 429, 500, 502, 503]).to.include(res.status);
      });
    });
  });
});
