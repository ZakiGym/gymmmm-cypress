// cypress/e2e/backend/03.backend.crud.class-types-and-classes.cy.ts
// Full CRUD lifecycle for class types and classes

import { authRequest, getEnv, login } from '../../support/api';
import { createCleanup } from '../../support/cleanup';

const uid = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

describe('Backend CRUD: Class Types & Classes', () => {
  const gymId = getEnv('GYM_ID');
  const cleanup = createCleanup();

  let adminToken = '';

  // IDs shared across the ordered tests in this describe block
  let classTypeId = '';
  let classId = '';

  before(() => {
    cy.apiLogin('admin').then(({ token }) => {
      adminToken = token;
    });
  });

  after(() => {
    cleanup.run(adminToken);
  });

  // ────────────────────────────────────────────────────────────
  // POST /class-types
  // ────────────────────────────────────────────────────────────

  it('POST /class-types — creates class type, returns _id with matching name', () => {
    if (!adminToken) {
      cy.log('No admin token; skipping');
      return;
    }

    const name = `E2E ClassType ${uid()}`;
    const description = 'Automated e2e test class type';
    const color = '#FF5733';

    authRequest(
      adminToken,
      'POST',
      '/class-types',
      { name, description, color, gymId },
      false,
    ).then((res) => {
      if (res.status === 429) {
        cy.log('Rate limited; skipping');
        return;
      }

      expect(res.status, 'POST /class-types status').to.equal(201);

      const body = res.body as any;

      const id = body._id || body.id;
      expect(id, 'class type _id').to.be.a('string').and.not.empty;

      expect(body.name, 'class type name').to.be.a('string');
      expect(body.name, 'name matches input').to.equal(name);

      classTypeId = id;
      cleanup.track({ method: 'DELETE', url: `/class-types/${classTypeId}` });
    });
  });

  // ────────────────────────────────────────────────────────────
  // GET /class-types
  // ────────────────────────────────────────────────────────────

  it('GET /class-types — list returns array containing created type', () => {
    if (!adminToken) {
      cy.log('No admin token; skipping');
      return;
    }

    authRequest(adminToken, 'GET', '/class-types', undefined, false).then((res) => {
      expect(res.status, 'GET /class-types status').to.equal(200);

      const body = res.body as any;
      const items: any[] = body.items || body.data || (Array.isArray(body) ? body : []);

      expect(items, 'class types response is array').to.be.an('array');

      if (classTypeId) {
        const found = items.some((ct: any) => (ct._id || ct.id) === classTypeId);
        expect(found, 'created class type in list').to.be.true;
      }
    });
  });

  // ────────────────────────────────────────────────────────────
  // PUT /class-types/{id}
  // ────────────────────────────────────────────────────────────

  it('PUT /class-types/{id} — update name, verify GET reflects change', () => {
    if (!adminToken || !classTypeId) {
      cy.log('Prerequisites missing; skipping');
      return;
    }

    const updatedName = `E2E ClassType Updated ${uid()}`;

    authRequest(
      adminToken,
      'PUT',
      `/class-types/${classTypeId}`,
      { name: updatedName, gymId },
      false,
    ).then((res) => {
      if (res.status === 429) {
        cy.log('Rate limited; skipping');
        return;
      }

      expect([200, 204], 'PUT /class-types/{id} status').to.include(res.status);

      // Verify via GET list
      authRequest(adminToken, 'GET', '/class-types', undefined, false).then((listRes) => {
        expect(listRes.status, 'list after update').to.equal(200);

        const items: any[] =
          listRes.body.items || listRes.body.data || (Array.isArray(listRes.body) ? listRes.body : []);

        const found = items.find((ct: any) => (ct._id || ct.id) === classTypeId);
        expect(found, 'updated class type in list').to.exist;
        expect(found.name, 'updated name reflected').to.equal(updatedName);
      });
    });
  });

  // ────────────────────────────────────────────────────────────
  // POST /classes
  // ────────────────────────────────────────────────────────────

  it('POST /classes — creates class with future startTime, returns _id', () => {
    if (!adminToken) {
      cy.log('No admin token; skipping');
      return;
    }
    if (!classTypeId) {
      cy.log('No classTypeId available; skipping class creation');
      return;
    }

    const title = `E2E Class ${uid()}`;
    // Start 2 hours from now
    const startAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const endAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

    authRequest(
      adminToken,
      'POST',
      '/classes',
      {
        title,
        classTypeId,
        gymId,
        capacity: 10,
        startAt,
        endAt,
      },
      false,
    ).then((res) => {
      if (res.status === 429) {
        cy.log('Rate limited; skipping');
        return;
      }

      expect(res.status, 'POST /classes status').to.equal(201);

      const body = res.body as any;

      const id = body._id || body.id;
      expect(id, 'class _id').to.be.a('string').and.not.empty;

      expect(body.title || body.name, 'class title').to.be.a('string').and.not.empty;

      const capacity = body.capacity ?? body.maxCapacity;
      expect(capacity, 'class capacity').to.be.a('number');
      expect(capacity, 'capacity equals 10').to.equal(10);

      classId = id;
      cleanup.track({ method: 'DELETE', url: `/classes/${classId}` });
    });
  });

  // ────────────────────────────────────────────────────────────
  // GET /classes
  // ────────────────────────────────────────────────────────────

  it('GET /classes — list returns 200 and is array', () => {
    if (!adminToken) {
      cy.log('No admin token; skipping');
      return;
    }

    authRequest(adminToken, 'GET', '/classes', undefined, false).then((res) => {
      expect(res.status, 'GET /classes status').to.equal(200);

      const body = res.body as any;
      const items: any[] = body.items || body.data || body.classes || (Array.isArray(body) ? body : []);
      expect(items, 'classes response is array').to.be.an('array');
    });
  });

  // ────────────────────────────────────────────────────────────
  // GET /classes/{id}
  // ────────────────────────────────────────────────────────────

  it('GET /classes/{id} — returns 200 with correct fields', () => {
    if (!adminToken || !classId) {
      cy.log('Prerequisites missing; skipping');
      return;
    }

    authRequest(adminToken, 'GET', `/classes/${classId}`, undefined, false).then((res) => {
      expect(res.status, 'GET /classes/{id} status').to.equal(200);

      const body = res.body as any;

      const returnedId = body._id || body.id;
      expect(returnedId, 'returned _id').to.be.a('string').and.not.empty;
      expect(returnedId, '_id matches created class').to.equal(classId);

      expect(body.title || body.name, 'class has title').to.be.a('string').and.not.empty;

      const capacity = body.capacity ?? body.maxCapacity;
      expect(capacity, 'class capacity present').to.be.a('number');
    });
  });

  // ────────────────────────────────────────────────────────────
  // PUT /classes/{id}
  // ────────────────────────────────────────────────────────────

  it('PUT /classes/{id} — update capacity to 15', () => {
    if (!adminToken || !classId) {
      cy.log('Prerequisites missing; skipping');
      return;
    }

    authRequest(
      adminToken,
      'PUT',
      `/classes/${classId}`,
      { capacity: 15 },
      false,
    ).then((res) => {
      if (res.status === 429) {
        cy.log('Rate limited; skipping');
        return;
      }

      expect([200, 204], 'PUT /classes/{id} status').to.include(res.status);

      // Verify via GET
      authRequest(adminToken, 'GET', `/classes/${classId}`, undefined, false).then((getRes) => {
        expect(getRes.status, 'GET after capacity update').to.equal(200);

        const body = getRes.body as any;
        const updatedCapacity = body.capacity ?? body.maxCapacity;
        expect(updatedCapacity, 'capacity updated to 15').to.equal(15);
      });
    });
  });

  // ────────────────────────────────────────────────────────────
  // PATCH /class-types/{id}/archive
  // ────────────────────────────────────────────────────────────

  it('PATCH /class-types/{id}/archive — archives the class type', () => {
    if (!adminToken || !classTypeId) {
      cy.log('Prerequisites missing; skipping');
      return;
    }

    authRequest(
      adminToken,
      'PATCH',
      `/class-types/${classTypeId}/archive`,
      { archived: true },
      false,
    ).then((res) => {
      if (res.status === 429) {
        cy.log('Rate limited; skipping');
        return;
      }

      expect([200, 204], 'archive class type status').to.include(res.status);
    });
  });

  // ────────────────────────────────────────────────────────────
  // DELETE /classes/{id}
  // ────────────────────────────────────────────────────────────

  it('DELETE /classes/{id} — deletes the class', () => {
    if (!adminToken || !classId) {
      cy.log('Prerequisites missing; skipping');
      return;
    }

    authRequest(adminToken, 'DELETE', `/classes/${classId}`, undefined, false).then((res) => {
      if (res.status === 429) {
        cy.log('Rate limited; skipping');
        return;
      }

      expect([200, 204], 'DELETE /classes/{id} status').to.include(res.status);

      // Verify gone
      authRequest(adminToken, 'GET', `/classes/${classId}`, undefined, false).then((getRes) => {
        expect([404, 400], 'GET deleted class should 404').to.include(getRes.status);
      });

      classId = '';
    });
  });
});
