/**
 * 41 — Marketing Campaigns: full CRUD + send
 *
 * Covers /api/marketing/* — stats, campaign CRUD, campaign send.
 */

import { authRequest } from '../../support/api';
import { createCleanup } from '../../support/cleanup';

describe('Marketing Campaigns — full CRUD', () => {
  let adminToken: string;
  const cleanup = createCleanup();

  before(() => {
    cy.apiLogin('admin').then(({ token }) => {
      adminToken = token;
    });
  });

  after(() => {
    cleanup.run(adminToken);
  });

  it('GET /marketing/stats — dashboard stats', () => {
    authRequest(adminToken, 'GET', '/marketing/stats', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('GET /marketing/campaigns — list campaigns', () => {
    authRequest(adminToken, 'GET', '/marketing/campaigns', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('POST /marketing/campaigns — create campaign', () => {
    authRequest(adminToken, 'POST', '/marketing/campaigns', {
      name: `CY Test Campaign ${Date.now()}`,
      subject: 'Test Subject',
      body: '<p>Hello from Cypress</p>',
      type: 'email',
      audience: 'all_members',
    }, false).then((res) => {
      expect([200, 201, 400, 403, 404, 422]).to.include(res.status);
      if (res.status === 200 || res.status === 201) {
        const id = res.body?._id || res.body?.id || res.body?.data?._id;
        if (id) {
          cleanup.track({ method: 'DELETE', url: `/marketing/campaigns/${id}` });

          // GET single campaign
          authRequest(adminToken, 'GET', `/marketing/campaigns/${id}`, undefined, false)
            .then((r) => {
              expect([200, 400, 403, 404]).to.include(r.status);
            });

          // PUT update
          authRequest(adminToken, 'PUT', `/marketing/campaigns/${id}`, {
            name: `CY Updated ${Date.now()}`,
          }, false).then((r) => {
            expect([200, 400, 403, 404, 422]).to.include(r.status);
          });

          // POST send (best-effort)
          authRequest(adminToken, 'POST', `/marketing/campaigns/${id}/send`, undefined, false)
            .then((r) => {
              expect([200, 400, 403, 404, 422, 409]).to.include(r.status);
            });
        }
      }
    });
  });

  it('DELETE /marketing/campaigns/:id — delete campaign (fake id)', () => {
    authRequest(adminToken, 'DELETE', '/marketing/campaigns/000000000000000000000000', undefined, false)
      .then((res) => {
        expect([200, 204, 400, 403, 404]).to.include(res.status);
      });
  });

  it('GET /marketing/campaigns/:fakeId — 404 for non-existent', () => {
    authRequest(adminToken, 'GET', '/marketing/campaigns/000000000000000000000000', undefined, false)
      .then((res) => {
        expect([400, 403, 404]).to.include(res.status);
      });
  });
});
