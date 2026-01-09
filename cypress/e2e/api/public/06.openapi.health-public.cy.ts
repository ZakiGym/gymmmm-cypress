// cypress/e2e/api/public/06.openapi.health-public.cy.ts
import { API_PREFIX } from '../../../support/api';

describe('Public - Health - OpenAPI health + public endpoints', () => {
  it('Public - Health - GET /auth/health returns 200', () => {
    cy.request({ method: 'GET', url: `${API_PREFIX}/auth/health` }).then((res) => {
      expect(res.status).to.eq(200);
    });
  });

  it('Public - Health - GET /qr/_health returns 200', () => {
    cy.request({ method: 'GET', url: `${API_PREFIX}/qr/_health` }).then((res) => {
      expect(res.status).to.eq(200);
    });
  });
});
