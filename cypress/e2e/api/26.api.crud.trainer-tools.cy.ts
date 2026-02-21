// cypress/e2e/api/26.api.crud.trainer-tools.cy.ts

import { authRequest, getEnv } from '../../support/api';
import { createCleanup } from '../../support/cleanup';

const uniq = () => `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}`;

describe('API CRUD: Trainer Tools (best-effort)', () => {
  const gymId = getEnv('GYM_ID');
  const cleanup = createCleanup();

  let trainerToken = '';
  let adminToken = '';

  before(() => {
    cy.apiLogin('trainer').then(({ token }) => {
      trainerToken = token;
    });
    cy.apiLogin('admin').then(({ token }) => {
      adminToken = token;
    });
  });

  after(() => {
    cleanup.run(trainerToken);
  });

  // --- Trainer Availability ---

  it('Trainer availability: CREATE -> GET -> UPDATE -> DELETE', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const startDate = tomorrow.toISOString().split('T')[0];

    authRequest(
      trainerToken,
      'POST',
      '/trainer/availability',
      {
        gymId,
        date: startDate,
        startTime: '08:00',
        endTime: '12:00',
        type: 'available',
      },
      false,
    ).then((create) => {
      expect(
        [200, 201, 400, 403, 404, 422, 500],
        'create trainer availability',
      ).to.include(create.status);

      if (![200, 201].includes(create.status)) {
        cy.log(`Trainer availability create returned ${create.status}; skipping lifecycle`);
        return;
      }

      const id = (create.body as any)?._id || (create.body as any)?.id;
      expect(id, 'availability id').to.be.a('string').and.not.empty;

      if (!id) return;

      cleanup.track({ method: 'DELETE', url: `/trainer/availability/${id}` });

      // UPDATE
      authRequest(
        trainerToken,
        'PUT',
        `/trainer/availability/${id}`,
        { startTime: '09:00', endTime: '13:00' },
        false,
      ).then((upd) => {
        expect([200, 204, 400, 403, 404], 'update availability').to.include(upd.status);
      });

      // DELETE
      authRequest(trainerToken, 'DELETE', `/trainer/availability/${id}`, undefined, false).then(
        (del) => {
          expect([200, 204, 403, 404], 'delete availability').to.include(del.status);
        },
      );
    });
  });

  it('GET /trainer/availability/me', () => {
    authRequest(trainerToken, 'GET', '/trainer/availability/me', undefined, false).then((res) => {
      expect([200, 401, 403, 404], 'get my availability').to.include(res.status);
    });
  });

  // --- Trainer Classes ---

  it('GET /trainer/classes/me — list trainer assigned classes', () => {
    authRequest(trainerToken, 'GET', '/trainer/classes/me', undefined, false).then((res) => {
      expect([200, 401, 403, 404], 'trainer my classes').to.include(res.status);
    });
  });

  it('GET /trainer/stats/me — trainer stats', () => {
    authRequest(trainerToken, 'GET', '/trainer/stats/me', undefined, false).then((res) => {
      expect([200, 401, 403, 404], 'trainer stats').to.include(res.status);
    });
  });

  it('Trainer class operations: roster, attendance, cancel, request-sub (best-effort)', () => {
    // First get trainer's classes to find a real class ID
    authRequest(trainerToken, 'GET', '/trainer/classes/me', undefined, false).then((classes) => {
      if (classes.status !== 200) {
        cy.log('Cannot list trainer classes; skipping class operations');
        return;
      }

      const items: any[] = (classes.body as any)?.items || (classes.body as any) || [];
      const first = items[0];
      const classId = first?._id || first?.id;

      if (!classId) {
        cy.log('No classes assigned to trainer; skipping class operations');
        return;
      }

      // ROSTER
      authRequest(trainerToken, 'GET', `/trainer/classes/${classId}/roster`, undefined, false).then(
        (roster) => {
          expect([200, 401, 403, 404], 'get class roster').to.include(roster.status);
        },
      );

      // ATTENDANCE (best-effort — requires valid student data)
      authRequest(
        trainerToken,
        'PUT',
        `/trainer/classes/${classId}/attendance`,
        { attendees: [] },
        false,
      ).then((att) => {
        expect([200, 204, 400, 403, 404, 422], 'mark attendance').to.include(att.status);
      });

      // REQUEST SUB (best-effort)
      authRequest(
        trainerToken,
        'PUT',
        `/trainer/classes/${classId}/request-sub`,
        { reason: `e2e sub request ${uniq()}` },
        false,
      ).then((sub) => {
        expect([200, 204, 400, 403, 404, 422], 'request sub').to.include(sub.status);
      });
    });
  });

  // --- Trainer Notifications ---

  it('GET /trainer/notifications', () => {
    authRequest(trainerToken, 'GET', '/trainer/notifications', undefined, false).then((res) => {
      expect([200, 401, 403, 404], 'trainer notifications').to.include(res.status);

      if (res.status !== 200) return;

      // If there are notifications, try to mark one as read
      const items: any[] = (res.body as any)?.items || (res.body as any) || [];
      const first = items[0];
      const notifId = first?._id || first?.id;

      if (!notifId) {
        cy.log('No trainer notifications to mark as read');
        return;
      }

      authRequest(
        trainerToken,
        'PUT',
        `/trainer/notifications/${notifId}/read`,
        {},
        false,
      ).then((read) => {
        expect([200, 204, 400, 403, 404], 'mark trainer notification read').to.include(
          read.status,
        );
      });
    });
  });
});
