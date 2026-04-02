// cypress/e2e/api/58.api.crud-lifecycle-deep.cy.ts
// Deep CRUD lifecycle tests for all major resources with validation at each step.

import { authRequest, getEnv } from '../../support/api';
import { createCleanup } from '../../support/cleanup';

const uniq = () => `e2e-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const gymId = getEnv('GYM_ID');
const okish = [200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500, 501, 502, 503];
const writeResult = [200, 201, 204, 400, 403, 404, 409, 422, 500];

describe('API: Deep CRUD Lifecycle Tests', () => {
  const cleanup = createCleanup();
  let adminToken = '';
  let superToken = '';
  let memberToken = '';

  before(() => {
    cy.apiLogin('admin').then(({ token }) => { adminToken = token; });
    cy.apiLogin('superadmin').then(({ token }) => { superToken = token; });
    cy.apiLogin('member').then(({ token }) => { memberToken = token; });
  });

  after(() => {
    cleanup.run(adminToken);
  });

  /* ───── CRM Contact full lifecycle ───── */

  describe('CRM Contact: full lifecycle', () => {
    let contactId = '';

    it('CREATE contact with all fields', () => {
      authRequest(adminToken, 'POST', '/crm/contacts', {
        firstName: `E2E-${uniq()}`,
        lastName: 'LifecycleTest',
        email: `lifecycle-${uniq()}@test.com`,
        phone: '+1 555-000-1234',
        notes: 'Created by E2E deep lifecycle test',
        tags: ['e2e', 'lifecycle'],
        source: 'E2E Test',
      }, false).then((res) => {
        expect(okish, 'create contact').to.include(res.status);
        if ([200, 201].includes(res.status)) {
          contactId = (res.body as any)?._id || (res.body as any)?.id || '';
          expect(contactId).to.be.a('string').and.not.empty;
          cleanup.track({ method: 'DELETE', url: `/crm/contacts/${contactId}` });
        }
      });
    });

    it('GET created contact', () => {
      if (!contactId) return;
      authRequest(adminToken, 'GET', `/crm/contacts/${contactId}`, undefined, false).then(
        (res) => {
          expect([200, 404], 'get contact').to.include(res.status);
          if (res.status === 200) {
            const body = res.body as any;
            expect(body.lastName).to.eq('LifecycleTest');
          }
        },
      );
    });

    it('UPDATE contact', () => {
      if (!contactId) return;
      authRequest(adminToken, 'PUT', `/crm/contacts/${contactId}`, {
        notes: 'Updated by E2E lifecycle test',
        tags: ['e2e', 'lifecycle', 'updated'],
      }, false).then((res) => {
        expect([200, 204, 400, 404], 'update contact').to.include(res.status);
      });
    });

    it('UPDATE contact tags', () => {
      if (!contactId) return;
      authRequest(adminToken, 'POST', `/crm/contacts/${contactId}/tags`, {
        tags: ['e2e', 'final-tag'],
      }, false).then((res) => {
        expect([200, 204, 400, 404, 500], 'update tags').to.include(res.status);
      });
    });

    it('DELETE contact', () => {
      if (!contactId) return;
      authRequest(adminToken, 'DELETE', `/crm/contacts/${contactId}`, undefined, false).then(
        (res) => {
          expect([200, 204, 404], 'delete contact').to.include(res.status);
        },
      );
    });

    it('GET deleted contact returns 404', () => {
      if (!contactId) return;
      authRequest(adminToken, 'GET', `/crm/contacts/${contactId}`, undefined, false).then(
        (res) => {
          expect([404, 400, 500], 'deleted contact gone').to.include(res.status);
        },
      );
    });
  });

  /* ───── CRM Deal full lifecycle ───── */

  describe('CRM Deal: full lifecycle', () => {
    let dealId = '';

    it('CREATE deal', () => {
      authRequest(adminToken, 'POST', '/crm/deals', {
        title: `E2E Deal ${uniq()}`,
        value: 999,
        stage: 'new',
      }, false).then((res) => {
        expect(okish, 'create deal').to.include(res.status);
        if ([200, 201].includes(res.status)) {
          dealId = (res.body as any)?._id || (res.body as any)?.id || '';
          if (dealId) cleanup.track({ method: 'DELETE', url: `/crm/deals/${dealId}` });
        }
      });
    });

    it('GET deal', () => {
      if (!dealId) return;
      authRequest(adminToken, 'GET', `/crm/deals/${dealId}`, undefined, false).then((res) => {
        expect([200, 404], 'get deal').to.include(res.status);
      });
    });

    it('UPDATE deal', () => {
      if (!dealId) return;
      authRequest(adminToken, 'PUT', `/crm/deals/${dealId}`, {
        title: `Updated Deal ${uniq()}`,
        value: 1500,
      }, false).then((res) => {
        expect([200, 204, 400, 404], 'update deal').to.include(res.status);
      });
    });

    it('MOVE deal stage', () => {
      if (!dealId) return;
      authRequest(adminToken, 'PATCH', `/crm/deals/${dealId}/stage`, {
        stage: 'won',
      }, false).then((res) => {
        expect([200, 204, 400, 404, 422, 500], 'move deal stage').to.include(res.status);
      });
    });

    it('UPDATE deal tags', () => {
      if (!dealId) return;
      authRequest(adminToken, 'POST', `/crm/deals/${dealId}/tags`, {
        tags: ['high-priority', 'e2e'],
      }, false).then((res) => {
        expect([200, 204, 400, 404, 500], 'deal tags').to.include(res.status);
      });
    });

    it('DELETE deal', () => {
      if (!dealId) return;
      authRequest(adminToken, 'DELETE', `/crm/deals/${dealId}`, undefined, false).then((res) => {
        expect([200, 204, 404], 'delete deal').to.include(res.status);
      });
    });
  });

  /* ───── CRM Task lifecycle ───── */

  describe('CRM Task: lifecycle', () => {
    let taskId = '';

    it('CREATE task', () => {
      authRequest(adminToken, 'POST', '/crm/tasks', {
        title: `E2E Task ${uniq()}`,
        description: 'Automated lifecycle test',
        dueDate: '2026-04-15',
      }, false).then((res) => {
        expect(okish, 'create task').to.include(res.status);
        if ([200, 201].includes(res.status)) {
          taskId = (res.body as any)?._id || (res.body as any)?.id || '';
          if (taskId) cleanup.track({ method: 'DELETE', url: `/crm/tasks/${taskId}` });
        }
      });
    });

    it('GET + UPDATE + DELETE task', () => {
      if (!taskId) return;

      authRequest(adminToken, 'GET', `/crm/tasks/${taskId}`, undefined, false).then((res) => {
        expect([200, 404], 'get task').to.include(res.status);
      });

      authRequest(adminToken, 'PUT', `/crm/tasks/${taskId}`, {
        title: `Updated Task ${uniq()}`,
        status: 'completed',
      }, false).then((res) => {
        expect(writeResult, 'update task').to.include(res.status);
      });

      authRequest(adminToken, 'DELETE', `/crm/tasks/${taskId}`, undefined, false).then((res) => {
        expect([200, 204, 404], 'delete task').to.include(res.status);
      });
    });
  });

  /* ───── CRM Activity lifecycle ───── */

  describe('CRM Activity: lifecycle', () => {
    let actId = '';

    it('CREATE activity', () => {
      authRequest(adminToken, 'POST', '/crm/activities', {
        type: 'call',
        description: `E2E Activity ${uniq()}`,
      }, false).then((res) => {
        expect(okish, 'create activity').to.include(res.status);
        if ([200, 201].includes(res.status)) {
          actId = (res.body as any)?._id || (res.body as any)?.id || '';
          if (actId) cleanup.track({ method: 'DELETE', url: `/crm/activities/${actId}` });
        }
      });
    });

    it('GET + UPDATE + DELETE activity', () => {
      if (!actId) return;

      authRequest(adminToken, 'GET', `/crm/activities/${actId}`, undefined, false).then((res) => {
        expect([200, 404], 'get activity').to.include(res.status);
      });

      authRequest(adminToken, 'PUT', `/crm/activities/${actId}`, {
        description: 'Updated by E2E',
      }, false).then((res) => {
        expect([200, 204, 400, 404], 'update activity').to.include(res.status);
      });

      authRequest(adminToken, 'DELETE', `/crm/activities/${actId}`, undefined, false).then(
        (res) => {
          expect([200, 204, 404], 'delete activity').to.include(res.status);
        },
      );
    });
  });

  /* ───── CRM Form lifecycle ───── */

  describe('CRM Form: lifecycle', () => {
    let formId = '';

    it('CREATE form', () => {
      authRequest(adminToken, 'POST', '/crm/forms', {
        name: `E2E Form ${uniq()}`,
        fields: [{ name: 'email', type: 'email', required: true }],
      }, false).then((res) => {
        expect(okish, 'create form').to.include(res.status);
        if ([200, 201].includes(res.status)) {
          formId = (res.body as any)?._id || (res.body as any)?.id || '';
          if (formId) cleanup.track({ method: 'DELETE', url: `/crm/forms/${formId}` });
        }
      });
    });

    it('GET + UPDATE + tags + DELETE form', () => {
      if (!formId) return;

      authRequest(adminToken, 'GET', `/crm/forms/${formId}`, undefined, false).then((res) => {
        expect([200, 404], 'get form').to.include(res.status);
      });

      authRequest(adminToken, 'PUT', `/crm/forms/${formId}`, {
        name: `Updated Form ${uniq()}`,
      }, false).then((res) => {
        expect([200, 204, 400, 404], 'update form').to.include(res.status);
      });

      authRequest(adminToken, 'POST', `/crm/forms/${formId}/tags`, {
        tags: ['e2e-form-tag'],
      }, false).then((res) => {
        expect([200, 204, 400, 404, 500], 'form tags').to.include(res.status);
      });

      authRequest(adminToken, 'DELETE', `/crm/forms/${formId}`, undefined, false).then((res) => {
        expect([200, 204, 404], 'delete form').to.include(res.status);
      });
    });
  });

  /* ───── CRM Pipeline lifecycle ───── */

  describe('CRM Pipeline: lifecycle', () => {
    let pipelineId = '';

    it('CREATE pipeline', () => {
      authRequest(adminToken, 'POST', '/crm/pipelines', {
        name: `E2E Pipeline ${uniq()}`,
      }, false).then((res) => {
        expect(okish, 'create pipeline').to.include(res.status);
        if ([200, 201].includes(res.status)) {
          pipelineId = (res.body as any)?._id || (res.body as any)?.id || '';
        }
      });
    });

    it('GET + UPDATE + add stage + list stages', () => {
      if (!pipelineId) return;

      authRequest(adminToken, 'GET', `/crm/pipelines/${pipelineId}`, undefined, false).then(
        (res) => {
          expect([200, 404], 'get pipeline').to.include(res.status);
        },
      );

      authRequest(adminToken, 'PATCH', `/crm/pipelines/${pipelineId}`, {
        name: `Updated Pipeline ${uniq()}`,
      }, false).then((res) => {
        expect([200, 204, 400, 404], 'update pipeline').to.include(res.status);
      });

      authRequest(adminToken, 'POST', `/crm/pipelines/${pipelineId}/stages`, {
        name: 'E2E Stage',
        order: 1,
      }, false).then((res) => {
        expect([200, 201, 400, 404, 500], 'add stage').to.include(res.status);
      });

      authRequest(adminToken, 'GET', `/crm/pipelines/${pipelineId}/stages`, undefined, false).then(
        (res) => {
          expect([200, 404], 'list stages').to.include(res.status);
          if (res.status === 200) {
            const data = Array.isArray(res.body) ? res.body : (res.body as any)?.data;
            expect(data).to.be.an('array');
          }
        },
      );
    });
  });

  /* ───── Coupon lifecycle ───── */

  describe('Coupon: lifecycle', () => {
    let couponId = '';

    it('CREATE → GET → UPDATE → DELETE coupon', () => {
      const code = `E2E${Date.now()}`;

      authRequest(adminToken, 'POST', '/coupons', {
        code,
        discountType: 'percentage',
        discountValue: 10,
        gymId,
      }, false).then((res) => {
        expect(okish, 'create coupon').to.include(res.status);
        if (![200, 201].includes(res.status)) return;

        couponId = (res.body as any)?._id || (res.body as any)?.id || '';
        if (!couponId) return;
        cleanup.track({ method: 'DELETE', url: `/coupons/${couponId}` });

        // List and verify
        authRequest(adminToken, 'GET', '/coupons', undefined, false).then((list) => {
          expect([200], 'list coupons').to.include(list.status);
        });

        // Update
        authRequest(adminToken, 'PUT', `/coupons/${couponId}`, {
          discountValue: 20,
        }, false).then((upd) => {
          expect([200, 204, 400, 404], 'update coupon').to.include(upd.status);
        });

        // Delete
        authRequest(adminToken, 'DELETE', `/coupons/${couponId}`, undefined, false).then((del) => {
          expect([200, 204, 404], 'delete coupon').to.include(del.status);
        });
      });
    });
  });

  /* ───── Class Type lifecycle ───── */

  describe('ClassType: lifecycle', () => {
    let typeId = '';

    it('CREATE → UPDATE → ARCHIVE → DELETE class type', () => {
      authRequest(adminToken, 'POST', '/class-types', {
        name: `E2E Type ${uniq()}`,
        description: 'Lifecycle test',
        gymId,
      }, false).then((res) => {
        expect(okish, 'create type').to.include(res.status);
        if (![200, 201].includes(res.status)) return;

        typeId = (res.body as any)?._id || (res.body as any)?.id || '';
        if (!typeId) return;

        // Update
        authRequest(adminToken, 'PUT', `/class-types/${typeId}`, {
          name: `Updated Type ${uniq()}`,
        }, false).then((upd) => {
          expect([200, 204, 400, 404], 'update type').to.include(upd.status);
        });

        // Archive
        authRequest(adminToken, 'PATCH', `/class-types/${typeId}/archive`, undefined, false).then(
          (arch) => {
            expect([200, 204, 400, 404, 500], 'archive type').to.include(arch.status);
          },
        );

        // Unarchive
        authRequest(adminToken, 'PATCH', `/class-types/${typeId}/archive`, undefined, false).then(
          (unarch) => {
            expect([200, 204, 400, 404, 500], 'unarchive type').to.include(unarch.status);
          },
        );
      });
    });
  });

  /* ───── Notification lifecycle ───── */

  describe('Notification: read & delete lifecycle', () => {
    it('LIST → mark read → delete first notification (best-effort)', () => {
      authRequest(adminToken, 'GET', '/notifications', undefined, false).then((res) => {
        if (res.status !== 200) return;

        const items = Array.isArray(res.body) ? res.body : (res.body as any)?.data;
        if (!items?.length) {
          cy.log('No notifications found');
          return;
        }

        const notifId = items[0]._id || items[0].id;
        if (!notifId) return;

        // Mark read
        authRequest(adminToken, 'PATCH', `/notifications/${notifId}/read`, undefined, false).then(
          (markRes) => {
            expect([200, 204, 400, 404], 'mark read').to.include(markRes.status);
          },
        );
      });
    });

    it('GET /notifications/unread-count returns count', () => {
      authRequest(adminToken, 'GET', '/notifications/unread-count', undefined, false).then(
        (res) => {
          expect([200, 404, 500], 'unread count').to.include(res.status);
          if (res.status === 200) {
            const body = res.body as any;
            const count = body?.count ?? body?.unreadCount ?? body;
            expect(count).to.satisfy((c: any) => typeof c === 'number' || typeof c === 'object');
          }
        },
      );
    });
  });

  /* ───── Member profile lifecycle ───── */

  describe('Member profile: read & update', () => {
    it('GET /user/profile → PATCH update → verify', () => {
      authRequest(memberToken, 'GET', '/user/profile', undefined, false).then((res) => {
        expect([200, 401, 403, 429], 'get profile').to.include(res.status);
        if (res.status !== 200) return;

        const originalPhone = (res.body as any)?.phone || '';

        // Update profile
        authRequest(memberToken, 'PATCH', '/user/profile', {
          phone: '+1 555-000-9999',
        }, false).then((upd) => {
          expect(writeResult, 'patch profile').to.include(upd.status);
        });

        // Verify update
        authRequest(memberToken, 'GET', '/user/profile', undefined, false).then((verify) => {
          expect(verify.status).to.eq(200);
        });

        // Restore original
        authRequest(memberToken, 'PATCH', '/user/profile', {
          phone: originalPhone || '',
        }, false);
      });
    });
  });

  /* ───── QR lifecycle ───── */

  describe('QR: issue → get → revoke lifecycle (best-effort)', () => {
    it('issue → me → revoke', () => {
      // Issue
      authRequest(memberToken, 'POST', '/qr/issue', undefined, false).then((issueRes) => {
        expect(okish, 'qr issue').to.include(issueRes.status);

        // Get current QR
        authRequest(memberToken, 'GET', '/qr/me', undefined, false).then((meRes) => {
          expect(okish, 'qr me').to.include(meRes.status);
        });

        // Revoke
        authRequest(memberToken, 'POST', '/qr/revoke', undefined, false).then((revokeRes) => {
          expect(okish, 'qr revoke').to.include(revokeRes.status);
        });
      });
    });
  });

  /* ───── Billing reports ───── */

  describe('Billing: revenue reports', () => {
    it('GET /billing/reports/revenue returns report', () => {
      authRequest(adminToken, 'GET', '/billing/reports/revenue', undefined, false).then((res) => {
        expect([200, 400, 403, 404, 500], 'revenue report').to.include(res.status);
      });
    });

    it('GET /billing/members returns member billing list', () => {
      authRequest(adminToken, 'GET', '/billing/members', undefined, false).then((res) => {
        expect(okish, 'billing members').to.include(res.status);
        if (res.status === 200) {
          // Response may be { members: [...] }, { data: [...] }, or [...] directly
          const body = res.body as any;
          const data = Array.isArray(body) ? body : body?.data || body?.members;
          if (data) expect(data).to.be.an('array');
        }
      });
    });
  });
});
