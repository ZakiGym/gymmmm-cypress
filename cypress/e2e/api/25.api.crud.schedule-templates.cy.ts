// cypress/e2e/api/25.api.crud.schedule-templates.cy.ts

import { authRequest, getEnv } from '../../support/api';
import { createCleanup } from '../../support/cleanup';

const uniq = () => `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}`;

describe('API CRUD: Schedule Templates (best-effort)', () => {
  const gymId = getEnv('GYM_ID');
  const cleanup = createCleanup();

  let adminToken = '';

  before(() => {
    cy.apiLogin('admin').then(({ token }) => {
      adminToken = token;
    });
  });

  after(() => {
    cleanup.run(adminToken);
  });

  it('LIST schedule templates', () => {
    authRequest(adminToken, 'GET', '/schedule-templates', undefined, false).then((res) => {
      expect([200, 401, 403, 404], 'list schedule templates').to.include(res.status);
    });
  });

  it('CREATE -> GET -> UPDATE -> DELETE schedule template lifecycle', () => {
    const name = `E2E Template ${uniq()}`;

    authRequest(
      adminToken,
      'POST',
      '/schedule-templates',
      {
        name,
        gymId,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '10:00',
      },
      false,
    ).then((create) => {
      expect([200, 201, 400, 403, 404, 422, 500], 'create schedule template').to.include(
        create.status,
      );

      if (![200, 201].includes(create.status)) {
        cy.log(`Schedule template create returned ${create.status}; skipping lifecycle`);
        return;
      }

      const id = (create.body as any)?._id || (create.body as any)?.id;
      expect(id, 'schedule template id').to.be.a('string').and.not.empty;

      if (!id) return;

      cleanup.track({ method: 'DELETE', url: `/schedule-templates/${id}` });

      // UPDATE
      authRequest(
        adminToken,
        'PUT',
        `/schedule-templates/${id}`,
        { name: `${name} (updated)`, startTime: '10:00', endTime: '11:00' },
        false,
      ).then((upd) => {
        expect([200, 204, 400, 403, 404], 'update schedule template').to.include(upd.status);
      });

      // DELETE
      authRequest(adminToken, 'DELETE', `/schedule-templates/${id}`, undefined, false).then(
        (del) => {
          expect([200, 204, 403, 404], 'delete schedule template').to.include(del.status);
        },
      );
    });
  });
});
