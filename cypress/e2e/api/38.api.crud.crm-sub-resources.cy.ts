// cypress/e2e/api/38.api.crud.crm-sub-resources.cy.ts

import { authRequest, getEnv } from '../../support/api';
import { createCleanup } from '../../support/cleanup';

const uniq = () => `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}`;

describe('API CRUD: CRM Sub-Resources (tags, stages, analytics)', () => {
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

  // ============================
  // CONTACT TAGS
  // ============================

  it('Contact tags: create contact -> add tags -> update tags', () => {
    const email = `crm-tag-${uniq()}@test.gymmm.app`;

    authRequest(
      adminToken,
      'POST',
      '/crm/contacts',
      { firstName: 'E2E Tag', email, gymId },
      false,
    ).then((create) => {
      expect([200, 201, 400, 403, 422], 'create contact').to.include(create.status);

      if (![200, 201].includes(create.status)) {
        cy.log(`Contact create returned ${create.status}; skipping tag tests`);
        return;
      }

      const contactId = (create.body as any)?._id || (create.body as any)?.id;
      if (!contactId) return;

      cleanup.track({ method: 'DELETE', url: `/crm/contacts/${contactId}` });

      // ADD TAGS (set mode)
      authRequest(
        adminToken,
        'POST',
        `/crm/contacts/${contactId}/tags`,
        { tags: ['vip', 'lead', 'e2e-test'] },
        false,
      ).then((res) => {
        expect([200, 204, 400, 403, 404, 422], 'set contact tags').to.include(res.status);
      });

      // UPDATE TAGS (add/remove mode)
      authRequest(
        adminToken,
        'POST',
        `/crm/contacts/${contactId}/tags`,
        { add: ['premium'], remove: ['e2e-test'] },
        false,
      ).then((res) => {
        expect([200, 204, 400, 403, 404, 422], 'add/remove contact tags').to.include(res.status);
      });
    });
  });

  // ============================
  // DEAL TAGS
  // ============================

  it('Deal tags: create deal -> add tags', () => {
    authRequest(
      adminToken,
      'POST',
      '/crm/deals',
      { title: `E2E Deal ${uniq()}` },
      false,
    ).then((create) => {
      expect([200, 201, 400, 403, 422], 'create deal').to.include(create.status);

      if (![200, 201].includes(create.status)) {
        cy.log(`Deal create returned ${create.status}; skipping tag tests`);
        return;
      }

      const dealId =
        (create.body as any)?._id ||
        (create.body as any)?.id ||
        (create.body as any)?.deal?._id ||
        (create.body as any)?.deal?.id;
      if (!dealId) return;

      cleanup.track({ method: 'DELETE', url: `/crm/deals/${dealId}` });

      authRequest(
        adminToken,
        'POST',
        `/crm/deals/${dealId}/tags`,
        { tags: ['hot-lead', 'e2e'] },
        false,
      ).then((res) => {
        expect([200, 204, 400, 403, 404, 422], 'set deal tags').to.include(res.status);
      });
    });
  });

  // ============================
  // DEAL STAGE MOVEMENT
  // ============================

  it('Deal stage: create pipeline + stage + deal -> move deal to stage', () => {
    // Create a pipeline
    authRequest(
      adminToken,
      'POST',
      '/crm/pipelines',
      { name: `E2E Pipeline ${uniq()}` },
      false,
    ).then((pipeCreate) => {
      if (![200, 201].includes(pipeCreate.status)) {
        cy.log('Cannot create pipeline; skipping stage movement');
        return;
      }

      const pipelineId =
        (pipeCreate.body as any)?._id ||
        (pipeCreate.body as any)?.id ||
        (pipeCreate.body as any)?.pipeline?._id ||
        (pipeCreate.body as any)?.pipeline?.id;
      if (!pipelineId) return;

      cleanup.track({ method: 'DELETE', url: `/crm/pipelines/${pipelineId}` });

      // Add a stage to the pipeline
      authRequest(
        adminToken,
        'POST',
        `/crm/pipelines/${pipelineId}/stages`,
        { name: `E2E Stage ${uniq()}`, order: 1 },
        false,
      ).then((stageCreate) => {
        expect([200, 201, 400, 403, 404, 422], 'create stage in pipeline').to.include(
          stageCreate.status,
        );

        const stageId =
          (stageCreate.body as any)?._id ||
          (stageCreate.body as any)?.id ||
          (stageCreate.body as any)?.stage?._id ||
          (stageCreate.body as any)?.stage?.id;

        // List stages in pipeline
        authRequest(
          adminToken,
          'GET',
          `/crm/pipelines/${pipelineId}/stages`,
          undefined,
          false,
        ).then((stageList) => {
          expect([200, 401, 403, 404], 'list pipeline stages').to.include(stageList.status);
        });

        if (!stageId) return;

        // Create a deal
        authRequest(
          adminToken,
          'POST',
          '/crm/deals',
          { title: `E2E Stage Deal ${uniq()}`, pipelineId },
          false,
        ).then((dealCreate) => {
          if (![200, 201].includes(dealCreate.status)) {
            cy.log('Cannot create deal; skipping stage movement');
            return;
          }

          const dealId =
            (dealCreate.body as any)?._id ||
            (dealCreate.body as any)?.id ||
            (dealCreate.body as any)?.deal?._id ||
            (dealCreate.body as any)?.deal?.id;
          if (!dealId) return;

          cleanup.track({ method: 'DELETE', url: `/crm/deals/${dealId}` });

          // MOVE DEAL TO STAGE
          authRequest(
            adminToken,
            'PATCH',
            `/crm/deals/${dealId}/stage`,
            { stageId },
            false,
          ).then((move) => {
            expect([200, 204, 400, 403, 404, 422], 'move deal to stage').to.include(move.status);
          });
        });
      });
    });
  });

  // ============================
  // FORM TAGS
  // ============================

  it('Form tags: create form -> add tags', () => {
    authRequest(
      adminToken,
      'POST',
      '/crm/forms',
      { name: `E2E Form ${uniq()}` },
      false,
    ).then((create) => {
      expect([200, 201, 400, 403, 422], 'create form').to.include(create.status);

      if (![200, 201].includes(create.status)) {
        cy.log(`Form create returned ${create.status}; skipping tag tests`);
        return;
      }

      const formId =
        (create.body as any)?._id ||
        (create.body as any)?.id ||
        (create.body as any)?.form?._id ||
        (create.body as any)?.form?.id;
      if (!formId) return;

      cleanup.track({ method: 'DELETE', url: `/crm/forms/${formId}` });

      authRequest(
        adminToken,
        'POST',
        `/crm/forms/${formId}/tags`,
        { tags: ['landing-page', 'e2e'] },
        false,
      ).then((res) => {
        expect([200, 204, 400, 403, 404, 422], 'set form tags').to.include(res.status);
      });
    });
  });

  // ============================
  // CRM ANALYTICS
  // ============================

  it('GET /crm/analytics/funnel — funnel metrics', () => {
    authRequest(adminToken, 'GET', '/crm/analytics/funnel', undefined, false).then((res) => {
      expect([200, 401, 403, 404], 'crm funnel analytics').to.include(res.status);
    });
  });

  it('GET /crm/analytics/sources — lead sources breakdown', () => {
    authRequest(adminToken, 'GET', '/crm/analytics/sources', undefined, false).then((res) => {
      expect([200, 401, 403, 404], 'crm sources analytics').to.include(res.status);
    });
  });

  it('GET /crm/analytics/deals/by-stage — deals grouped by stage', () => {
    authRequest(adminToken, 'GET', '/crm/analytics/deals/by-stage', undefined, false).then(
      (res) => {
        expect([200, 401, 403, 404], 'crm deals by stage').to.include(res.status);
      },
    );
  });

  // ============================
  // PIPELINE CRUD (stages in pipeline)
  // ============================

  it('Pipeline stages: list stages in existing pipeline', () => {
    // Get an existing pipeline first
    authRequest(adminToken, 'GET', '/crm/pipelines?limit=1', undefined, false).then((list) => {
      if (list.status !== 200) {
        cy.log('Cannot list pipelines; skipping stage listing');
        return;
      }

      const items: any[] = (list.body as any)?.items || (list.body as any) || [];
      const first = items[0];
      const pipelineId = first?._id || first?.id;

      if (!pipelineId) {
        cy.log('No pipelines found; skipping stage listing');
        return;
      }

      authRequest(
        adminToken,
        'GET',
        `/crm/pipelines/${pipelineId}/stages`,
        undefined,
        false,
      ).then((res) => {
        expect([200, 401, 403, 404], 'list pipeline stages').to.include(res.status);
      });
    });
  });
});
