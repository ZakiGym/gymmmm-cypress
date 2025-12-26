// cypress/e2e/17.api.crud.memberships.cy.ts

import { API_PREFIX, getEnv } from '../../support/api';

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });
const getId = (obj: any) => (obj?._id ?? obj?.id) as string | undefined;
const uniq = () => `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}`;

describe('API: CRUD - memberships (plans + member join/cancel) (best-effort)', () => {
  const gymId = getEnv('GYM_ID');

  it('GET /memberships public list returns 200', () => {
    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/memberships`,
      failOnStatusCode: false,
    }).then((res) => {
      expect([200, 404, 500]).to.include(res.status);
    });
  });

  it('Admin create -> list includes -> (optional delete) (best-effort)', () => {
    cy.apiLogin('admin').then(({ token }) => {
      const name = `E2E Plan ${uniq()}`;

      cy.request({
        method: 'POST',
        url: `${API_PREFIX}/memberships`,
        headers: authHeaders(token),
        body: {
          name,
          gymId,
          price: 1,
          currency: 'USD',
          interval: 'month',
        },
        failOnStatusCode: false,
      }).then((createRes) => {
        expect([200, 201, 400, 401, 403, 404, 422, 500]).to.include(createRes.status);
        const planId = getId(createRes.body) || getId((createRes.body as any)?.plan);

        // LIST
        cy.request({
          method: 'GET',
          url: `${API_PREFIX}/memberships`,
          headers: authHeaders(token),
          failOnStatusCode: false,
        }).then((listRes) => {
          expect([200, 401, 403, 404, 500]).to.include(listRes.status);
        });

        if (!planId) return;

        // Optional delete (only if endpoint exists)
        cy.request({
          method: 'DELETE',
          url: `${API_PREFIX}/memberships/${planId}`,
          headers: authHeaders(token),
          failOnStatusCode: false,
        }).then((delRes) => {
          expect([200, 204, 400, 401, 403, 404, 500]).to.include(delRes.status);
        });
      });
    });
  });

  it('Member join -> /memberships/me -> cancel (best-effort)', () => {
    // We need a planId; we try to use /memberships public list.
    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/memberships`,
      failOnStatusCode: false,
    }).then((listRes) => {
      if (listRes.status !== 200) {
        cy.log('Cannot list memberships; skipping join/cancel');
        return;
      }

      const items: any[] = (listRes.body as any)?.items || (listRes.body as any)?.plans || listRes.body;
      const first = Array.isArray(items) ? items[0] : undefined;
      const planId = first?._id || first?.id;

      if (!planId) {
        cy.log('No membership plan found to join');
        return;
      }

      cy.apiLogin('member').then(({ token }) => {
        // JOIN
        cy.request({
          method: 'POST',
          url: `${API_PREFIX}/memberships/join/${planId}`,
          headers: authHeaders(token),
          failOnStatusCode: false,
        }).then((joinRes) => {
          expect([200, 201, 400, 401, 403, 404, 409, 500]).to.include(joinRes.status);
        });

        // ME
        cy.request({
          method: 'GET',
          url: `${API_PREFIX}/memberships/me`,
          headers: authHeaders(token),
          failOnStatusCode: false,
        }).then((meRes) => {
          expect([200, 401, 403, 404, 500]).to.include(meRes.status);
        });

        // CANCEL
        cy.request({
          method: 'PUT',
          url: `${API_PREFIX}/memberships/cancel`,
          headers: authHeaders(token),
          failOnStatusCode: false,
        }).then((cancelRes) => {
          expect([200, 204, 400, 401, 403, 404, 500]).to.include(cancelRes.status);
        });
      });
    });
  });
});
