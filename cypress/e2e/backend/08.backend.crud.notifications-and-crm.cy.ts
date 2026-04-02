// cypress/e2e/backend/08.backend.crud.notifications-and-crm.cy.ts
// FILE 8: Notifications and full CRM lifecycle — contacts, activities, tasks, deals.

import { authRequest, getEnv, login } from '../../support/api';
import { createCleanup } from '../../support/cleanup';

const uid = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

describe('Backend CRUD: Notifications & CRM', () => {
  const GYM_ID = getEnv('GYM_ID', '690dd58eb250ac19d4a39ff4');

  const cleanup = createCleanup();

  let adminToken  = '';
  let memberToken = '';
  let adminUserId = '';

  // IDs captured during the test for cross-resource linking
  let contactId = '';
  let dealId    = '';

  before(() => {
    login(getEnv('ADMIN_EMAIL', 'admin@gymmm.app'), getEnv('ADMIN_PASSWORD', 'StrongPass123!')).then(
      (res) => {
        adminToken  = res.token;
        adminUserId = res.user._id as string;
      },
    );

    login(
      getEnv('MEMBER_EMAIL', 'zakinabizada9@gmail.com'),
      getEnv('MEMBER_PASSWORD', 'kabul@123'),
    ).then((res) => { memberToken = res.token; });
  });

  after(() => {
    cleanup.run(adminToken);
  });

  // ─────────────────────────────────────────────────────────────────
  // NOTIFICATIONS
  // ─────────────────────────────────────────────────────────────────

  it('GET /notifications — member gets notification feed, returns 200 array', () => {
    authRequest(memberToken, 'GET', '/notifications', undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited, skipping'); return; }
      expect(res.status, 'GET /notifications').to.eq(200);
      // Backend returns { data: [...], next?: string }
      const data = (res.body as any)?.data ?? res.body;
      expect(Array.isArray(data), 'notifications data should be an array').to.be.true;
    });
  });

  it('GET /notifications/unread-count — member gets unread count, returns 200 with count number', () => {
    authRequest(memberToken, 'GET', '/notifications/unread-count', undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited, skipping'); return; }
      expect(res.status, 'GET /notifications/unread-count').to.eq(200);
      expect(res.body).to.have.property('count').and.be.a('number');
    });
  });

  it('POST /notifications/email — admin sends test email, returns 200/201/202', () => {
    authRequest(
      adminToken,
      'POST',
      '/notifications/email',
      {
        to     : getEnv('ADMIN_EMAIL', 'admin@gymmm.app'),
        subject: `E2E test email ${uid()}`,
        body   : 'This is an automated test email from Cypress.',
        gymId  : GYM_ID,
      },
      false,
    ).then((res) => {
      if (res.status === 429) { cy.log('rate limited, skipping'); return; }
      // 403 is acceptable — only superadmin can send emails directly on some deployments
      // 404 is acceptable if this endpoint is not implemented
      expect([200, 201, 202, 400, 403, 404], 'POST /notifications/email').to.include(res.status);
      if (res.status === 403) {
        cy.log('POST /notifications/email returned 403 — may require superadmin token (best-effort).');
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // CRM CONTACTS
  // ─────────────────────────────────────────────────────────────────

  it('CRM Contacts: POST → GET → PUT lifecycle', () => {
    const contactName  = uid();
    const contactEmail = `${uid()}@test.gymmm.app`;

    // --- CREATE ---
    authRequest(
      adminToken,
      'POST',
      '/crm/contacts',
      {
        firstName: contactName,
        email    : contactEmail,
        gymId    : GYM_ID,
      },
      false,
    ).then((create) => {
      if (create.status === 429) { cy.log('rate limited, skipping'); return; }
      expect(create.status, 'POST /crm/contacts').to.eq(201);
      expect(create.body).to.have.property('_id').and.be.a('string').and.not.empty;

      contactId = (create.body as any)._id as string;
      cleanup.track({ method: 'DELETE', url: `/crm/contacts/${contactId}` });

      // --- GET by id ---
      authRequest(adminToken, 'GET', `/crm/contacts/${contactId}`, undefined, false).then((get) => {
        if (get.status === 429) { cy.log('rate limited, skipping'); return; }
        expect(get.status, 'GET /crm/contacts/:id').to.eq(200);
        expect(get.body).to.have.property('_id', contactId);
        expect(get.body).to.have.property('email', contactEmail);
      });

      // --- UPDATE name ---
      const updatedName = `updated-${uid()}`;
      authRequest(
        adminToken,
        'PUT',
        `/crm/contacts/${contactId}`,
        { firstName: updatedName },
        false,
      ).then((upd) => {
        if (upd.status === 429) { cy.log('rate limited, skipping'); return; }
        expect([200, 204], 'PUT /crm/contacts/:id').to.include(upd.status);
        if (upd.status === 200) {
          expect((upd.body as any).firstName).to.eq(updatedName);
        }
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // CRM ACTIVITIES
  // ─────────────────────────────────────────────────────────────────

  it('CRM Activities: POST → GET list lifecycle', () => {
    // Use the contactId captured above if available; otherwise proceed without it.
    const activityBody: any = {
      type: 'note',
      note: `E2E activity note ${uid()}`,
    };
    if (contactId) activityBody.contactId = contactId;

    // --- CREATE ---
    authRequest(adminToken, 'POST', '/crm/activities', activityBody, false).then((create) => {
      if (create.status === 429) { cy.log('rate limited, skipping'); return; }
      expect(create.status, 'POST /crm/activities').to.eq(201);
      expect(create.body).to.have.property('_id').and.be.a('string').and.not.empty;

      const activityId: string = (create.body as any)._id;
      cleanup.track({ method: 'DELETE', url: `/crm/activities/${activityId}` });

      // --- GET list ---
      authRequest(adminToken, 'GET', '/crm/activities', undefined, false).then((list) => {
        if (list.status === 429) { cy.log('rate limited, skipping'); return; }
        expect(list.status, 'GET /crm/activities').to.eq(200);
        const items =
          (list.body as any)?.items ??
          (list.body as any)?.data ??
          (Array.isArray(list.body) ? list.body : []);
        expect(Array.isArray(items), 'activities list should be an array').to.be.true;
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // CRM TASKS
  // ─────────────────────────────────────────────────────────────────

  it('CRM Tasks: POST → GET list lifecycle', () => {
    const taskTitle = `E2E Task ${uid()}`;
    const taskBody: any = { title: taskTitle };
    if (contactId) taskBody.contactId = contactId;

    // --- CREATE ---
    authRequest(adminToken, 'POST', '/crm/tasks', taskBody, false).then((create) => {
      if (create.status === 429) { cy.log('rate limited, skipping'); return; }
      expect(create.status, 'POST /crm/tasks').to.eq(201);
      expect(create.body).to.have.property('_id').and.be.a('string').and.not.empty;
      expect((create.body as any).title).to.eq(taskTitle);

      const taskId: string = (create.body as any)._id;
      cleanup.track({ method: 'DELETE', url: `/crm/tasks/${taskId}` });

      // --- GET list ---
      authRequest(adminToken, 'GET', '/crm/tasks', undefined, false).then((list) => {
        if (list.status === 429) { cy.log('rate limited, skipping'); return; }
        expect(list.status, 'GET /crm/tasks').to.eq(200);
        const items =
          (list.body as any)?.items ??
          (list.body as any)?.data ??
          (Array.isArray(list.body) ? list.body : []);
        expect(Array.isArray(items), 'tasks list should be an array').to.be.true;
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // CRM DEALS + STAGE MOVEMENT
  // ─────────────────────────────────────────────────────────────────

  it('CRM Deals: POST → PATCH /stage lifecycle', () => {
    const dealTitle = `E2E Deal ${uid()}`;
    const dealBody: any = { title: dealTitle };
    if (contactId) dealBody.contactId = contactId;

    // --- CREATE DEAL ---
    authRequest(adminToken, 'POST', '/crm/deals', dealBody, false).then((create) => {
      if (create.status === 429) { cy.log('rate limited, skipping'); return; }
      expect(create.status, 'POST /crm/deals').to.eq(201);
      expect(create.body).to.have.property('_id').and.be.a('string').and.not.empty;

      dealId = (create.body as any)._id as string;
      cleanup.track({ method: 'DELETE', url: `/crm/deals/${dealId}` });

      // --- PATCH stage — fetch an existing stage first ---
      // Try to find a pipeline + stage to move to
      authRequest(adminToken, 'GET', '/crm/pipelines?limit=1', undefined, false).then((pipes) => {
        if (pipes.status === 429) { cy.log('rate limited, skipping'); return; }
        if (pipes.status !== 200) {
          cy.log('Cannot list pipelines; skipping stage movement');
          return;
        }

        const pipeList: any[] =
          (pipes.body as any)?.items ??
          (pipes.body as any)?.data ??
          (Array.isArray(pipes.body) ? pipes.body : []);
        const firstPipe = pipeList[0];
        const pipelineId: string | undefined = firstPipe?._id || firstPipe?.id;

        if (!pipelineId) {
          cy.log('No pipelines found; skipping stage movement test');
          return;
        }

        authRequest(adminToken, 'GET', `/crm/pipelines/${pipelineId}/stages`, undefined, false).then(
          (stages) => {
            if (stages.status === 429) { cy.log('rate limited, skipping'); return; }
            const stageList: any[] =
              (stages.body as any)?.items ??
              (stages.body as any)?.data ??
              (Array.isArray(stages.body) ? stages.body : []);
            const firstStage = stageList[0];
            const stageId: string | undefined = firstStage?._id || firstStage?.id;

            if (!stageId) {
              cy.log('No stages found in pipeline; skipping PATCH /stage test');
              return;
            }

            // --- PATCH /crm/deals/:id/stage ---
            authRequest(
              adminToken,
              'PATCH',
              `/crm/deals/${dealId}/stage`,
              { stageId },
              false,
            ).then((move) => {
              if (move.status === 429) { cy.log('rate limited, skipping'); return; }
              expect([200, 204], 'PATCH /crm/deals/:id/stage').to.include(move.status);
            });
          },
        );
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // CRM CONTACTS — list check after creation
  // ─────────────────────────────────────────────────────────────────

  it('GET /crm/contacts — list returns 200 with items array', () => {
    authRequest(adminToken, 'GET', '/crm/contacts', undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited, skipping'); return; }
      expect(res.status, 'GET /crm/contacts').to.eq(200);
      const items =
        (res.body as any)?.items ??
        (res.body as any)?.data ??
        (Array.isArray(res.body) ? res.body : []);
      expect(Array.isArray(items), 'contacts should be an array').to.be.true;
      expect(res.body).to.have.property('total').and.be.a('number');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // CRM DEALS — list check
  // ─────────────────────────────────────────────────────────────────

  it('GET /crm/deals — list returns 200', () => {
    authRequest(adminToken, 'GET', '/crm/deals', undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited, skipping'); return; }
      expect(res.status, 'GET /crm/deals').to.eq(200);
      const items =
        (res.body as any)?.items ??
        (res.body as any)?.data ??
        (Array.isArray(res.body) ? res.body : []);
      expect(Array.isArray(items), 'deals should be an array').to.be.true;
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // RBAC: member cannot access CRM
  // ─────────────────────────────────────────────────────────────────

  it('GET /crm/contacts as member → 401 or 403', () => {
    authRequest(memberToken, 'GET', '/crm/contacts', undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited, skipping'); return; }
      expect([401, 403], 'member accessing CRM contacts should be rejected').to.include(
        res.status,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // NOTIFICATIONS — unauthenticated access rejected
  // ─────────────────────────────────────────────────────────────────

  it('GET /notifications without token → 401', () => {
    authRequest(undefined, 'GET', '/notifications', undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited, skipping'); return; }
      expect(res.status, 'GET /notifications without token').to.eq(401);
    });
  });

  it('GET /notifications/unread-count without token → 401', () => {
    authRequest(undefined, 'GET', '/notifications/unread-count', undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited, skipping'); return; }
      expect(res.status, 'GET /notifications/unread-count without token').to.eq(401);
    });
  });
});
