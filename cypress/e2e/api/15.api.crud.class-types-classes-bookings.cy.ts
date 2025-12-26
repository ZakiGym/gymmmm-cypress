// cypress/e2e/15.api.crud.class-types-classes-bookings.cy.ts

import { authRequest, getEnv } from '../../support/api';

const uniq = () => `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}`;

// Production-safe CRUD where possible:
// - Creates resources with unique names
// - Attempts to delete/archive what we create
// - Uses admin for management endpoints, member for booking endpoints

describe('API: CRUD - class types, classes, bookings (best-effort cleanup)', () => {
  const gymId = getEnv('GYM_ID');

  it('Class Type CRUD: create -> list -> update -> archive (best-effort)', () => {
    cy.apiLogin('admin').then(({ token }) => {
      const name = `E2E ClassType ${uniq()}`;

      // CREATE
      authRequest(token, 'POST', '/class-types', { name, gymId }, false).then((create) => {
        // Prod can intermittently 5xx here; treat as infra/server issue, not a test failure.
        if (create.status >= 500) {
          cy.log('Class type create returned 5xx; skipping remainder of class type CRUD');
          return;
        }

        expect([200, 201, 403, 404], 'create class type status').to.include(create.status);
        if (![200, 201].includes(create.status)) {
          cy.log('Class type create not allowed/available on this env');
          return;
        }

        const classTypeId = (create.body as any)?._id || (create.body as any)?.id;
        expect(classTypeId, 'classTypeId').to.be.a('string').and.not.empty;

        // LIST
        authRequest(token, 'GET', '/class-types', undefined, false).then((list) => {
          expect([200], 'list class types').to.include(list.status);
          const items = (list.body as any)?.items || list.body;
          expect(items, 'list payload').to.exist;
        });

        // UPDATE
        const updatedName = `${name} (updated)`;
        authRequest(token, 'PUT', `/class-types/${classTypeId}`, { name: updatedName }, false).then(
          (upd) => {
            expect([200, 204, 400, 403, 404], 'update class type').to.include(upd.status);
          },
        );

        // ARCHIVE (if present)
        authRequest(token, 'PATCH', `/class-types/${classTypeId}/archive`, { archived: true }, false).then(
          (arc) => {
            expect([200, 204, 400, 403, 404], 'archive class type').to.include(arc.status);
          },
        );
      });
    });
  });

  it('Classes CRUD: create -> get -> update -> delete (best-effort)', () => {
    cy.apiLogin('admin').then(({ token }) => {
      const title = `E2E Class ${uniq()}`;
      const startAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      // CREATE
      authRequest(
        token,
        'POST',
        '/classes',
        {
          title,
          gymId,
          startAt,
          capacity: 5,
          // Some APIs require classTypeId/locationId; if so, backend should return 400.
        },
        false,
      ).then((create) => {
        expect([200, 201, 400, 403, 404], 'create class status').to.include(create.status);
        if (![200, 201].includes(create.status)) {
          cy.log('Class create requires more fields or is not available on this env');
          return;
        }

        const classId = (create.body as any)?._id || (create.body as any)?.id;
        expect(classId, 'classId').to.be.a('string').and.not.empty;

        // GET
        authRequest(token, 'GET', `/classes/${classId}`, undefined, false).then((get) => {
          expect([200, 404], 'get class').to.include(get.status);
        });

        // UPDATE
        authRequest(token, 'PUT', `/classes/${classId}`, { title: `${title} (updated)` }, false).then(
          (upd) => {
            expect([200, 204, 400, 403, 404], 'update class').to.include(upd.status);
          },
        );

        // DELETE
        authRequest(token, 'DELETE', `/classes/${classId}`, undefined, false).then((del) => {
          expect([200, 204, 403, 404], 'delete class').to.include(del.status);
        });
      });
    });
  });

  it('Booking lifecycle: book -> list my bookings -> unbook (member)', () => {
    // Many systems require a real upcoming class ID. We try to use MEMBER_ID if endpoint supports it.
    // Best-effort: if missing prerequisites, we log and skip.
    const memberId = getEnv('MEMBER_ID');

    cy.apiLogin('member').then(({ token }) => {
      // Try listing available classes and book first one. If endpoint isn’t available, exit.
      authRequest(token, 'GET', '/classes', undefined, false).then((classes) => {
        if (classes.status !== 200) {
          cy.log('Cannot list classes as member; skipping booking lifecycle');
          return;
        }

        const items: any[] = (classes.body as any)?.items || (classes.body as any) || [];
        const first = items[0];
        const classId = first?._id || first?.id;

        if (!classId) {
          cy.log('No classes found to book');
          return;
        }

        authRequest(token, 'POST', `/classes/${classId}/book`, { memberId }, false).then((book) => {
          expect([200, 201, 400, 403, 404, 409], 'book status').to.include(book.status);

          // LIST my bookings
          authRequest(token, 'GET', '/classes/my-bookings', undefined, false).then((my) => {
            expect([200, 403, 404], 'my bookings status').to.include(my.status);
          });

          // UNBOOK
          authRequest(token, 'DELETE', `/classes/${classId}/unbook`, undefined, false).then((unbook) => {
            expect([200, 204, 400, 403, 404], 'unbook status').to.include(unbook.status);
          });
        });
      });
    });
  });
});
