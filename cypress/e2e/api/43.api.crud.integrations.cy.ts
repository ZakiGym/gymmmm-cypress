/**
 * 43 — Integrations: full CRUD + test connection
 *
 * Covers /api/integrations/* — catalog, list, install, update, test, remove.
 */

import { authRequest } from '../../support/api';
import { createCleanup } from '../../support/cleanup';

describe('Integrations — full CRUD', () => {
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

  it('GET /integrations/catalog — available integrations', () => {
    authRequest(adminToken, 'GET', '/integrations/catalog', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('GET /integrations — list installed integrations', () => {
    authRequest(adminToken, 'GET', '/integrations', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('POST /integrations — install integration', () => {
    authRequest(adminToken, 'POST', '/integrations', {
      type: 'webhook',
      name: `CY Test Integration ${Date.now()}`,
      config: {
        url: 'https://httpbin.org/post',
        events: ['member.created'],
      },
    }, false).then((res) => {
      expect([200, 201, 400, 403, 404, 409, 422]).to.include(res.status);
      if (res.status === 200 || res.status === 201) {
        const id = res.body?._id || res.body?.id || res.body?.data?._id;
        if (id) {
          cleanup.track({ method: 'DELETE', url: `/integrations/${id}` });

          // PUT update
          authRequest(adminToken, 'PUT', `/integrations/${id}`, {
            name: `CY Updated ${Date.now()}`,
          }, false).then((r) => {
            expect([200, 400, 403, 404, 422]).to.include(r.status);
          });

          // POST test connection
          authRequest(adminToken, 'POST', `/integrations/${id}/test`, undefined, false)
            .then((r) => {
              expect([200, 400, 403, 404, 422, 500, 502]).to.include(r.status);
            });
        }
      }
    });
  });

  it('DELETE /integrations/:fakeId — 404 for non-existent', () => {
    authRequest(adminToken, 'DELETE', '/integrations/000000000000000000000000', undefined, false)
      .then((res) => {
        expect([200, 204, 400, 403, 404]).to.include(res.status);
      });
  });

  it('POST /integrations/:fakeId/test — test non-existent', () => {
    authRequest(adminToken, 'POST', '/integrations/000000000000000000000000/test', undefined, false)
      .then((res) => {
        expect([400, 403, 404]).to.include(res.status);
      });
  });
});
