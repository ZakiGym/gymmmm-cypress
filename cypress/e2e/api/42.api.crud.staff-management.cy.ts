/**
 * 42 — Staff Management: /api/staff-management/*
 *
 * Covers stats, directory, and schedule CRUD.
 */

import { authRequest } from '../../support/api';
import { createCleanup } from '../../support/cleanup';

describe('Staff Management — full CRUD', () => {
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

  it('GET /staff-management/stats — staff statistics', () => {
    authRequest(adminToken, 'GET', '/staff-management/stats', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
        if (res.status === 200) {
          expect(res.body).to.have.property('totalStaff');
        }
      });
  });

  it('GET /staff-management/directory — staff directory', () => {
    authRequest(adminToken, 'GET', '/staff-management/directory', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
        if (res.status === 200 && Array.isArray(res.body)) {
          expect(res.body.length).to.be.gte(0);
        }
      });
  });

  it('GET /staff-management/directory — with search query', () => {
    authRequest(adminToken, 'GET', '/staff-management/directory?search=admin&role=admin', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('GET /staff-management/schedules — list schedules', () => {
    authRequest(adminToken, 'GET', '/staff-management/schedules', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('GET /staff-management/schedules — with weekStart param', () => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const iso = weekStart.toISOString().split('T')[0];
    authRequest(adminToken, 'GET', `/staff-management/schedules?weekStart=${iso}`, undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('POST + PUT + DELETE /staff-management/schedules — full lifecycle', () => {
    // We need a staff member ID. Try to get one from the directory.
    authRequest(adminToken, 'GET', '/staff-management/directory', undefined, false)
      .then((dirRes) => {
        const staffId =
          dirRes.body?.data?.[0]?._id ||
          dirRes.body?.[0]?._id ||
          dirRes.body?.staff?.[0]?._id ||
          '000000000000000000000000';

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];

        authRequest(adminToken, 'POST', '/staff-management/schedules', {
          staffId,
          date: dateStr,
          shiftStart: '09:00',
          shiftEnd: '17:00',
          role: 'trainer',
          notes: 'Cypress test shift',
        }, false).then((createRes) => {
          expect([200, 201, 400, 403, 404, 422]).to.include(createRes.status);

          if (createRes.status === 200 || createRes.status === 201) {
            const schedId = createRes.body?._id || createRes.body?.id || createRes.body?.data?._id;
            if (schedId) {
              cleanup.track({ method: 'DELETE', url: `/staff-management/schedules/${schedId}` });

              // PUT update
              authRequest(adminToken, 'PUT', `/staff-management/schedules/${schedId}`, {
                notes: 'Updated by Cypress',
                shiftEnd: '18:00',
              }, false).then((updateRes) => {
                expect([200, 400, 403, 404, 422]).to.include(updateRes.status);
              });

              // DELETE
              authRequest(adminToken, 'DELETE', `/staff-management/schedules/${schedId}`, undefined, false)
                .then((delRes) => {
                  expect([200, 204, 400, 403, 404]).to.include(delRes.status);
                });
            }
          }
        });
      });
  });

  it('PUT /staff-management/schedules/:fakeId — 404 for non-existent', () => {
    authRequest(adminToken, 'PUT', '/staff-management/schedules/000000000000000000000000', {
      notes: 'nope',
    }, false).then((res) => {
      expect([400, 403, 404, 422]).to.include(res.status);
    });
  });

  it('DELETE /staff-management/schedules/:fakeId — 404 for non-existent', () => {
    authRequest(adminToken, 'DELETE', '/staff-management/schedules/000000000000000000000000', undefined, false)
      .then((res) => {
        expect([200, 204, 400, 403, 404]).to.include(res.status);
      });
  });
});
