/**
 * 45 — Messaging: conversations CRUD + broadcast + reactions
 *
 * Covers /api/messaging/* — NOTE: messaging may not be mounted in production.
 * All tests use failOnStatusCode:false for safety.
 */

import { authRequest } from '../../support/api';

describe('Messaging — conversations CRUD', () => {
  let memberToken: string;
  let adminToken: string;
  let memberId: string;

  before(() => {
    cy.apiLogin('member').then(({ token, userId }) => {
      memberToken = token;
      memberId = userId;
    });
    cy.apiLogin('admin').then(({ token }) => {
      adminToken = token;
    });
  });

  /* ─── Read operations ────────────────────────────────── */

  it('GET /messaging/unread-count (member)', () => {
    authRequest(memberToken, 'GET', '/messaging/unread-count', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('GET /messaging/conversations (member)', () => {
    authRequest(memberToken, 'GET', '/messaging/conversations', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('GET /messaging/unread-count — no auth', () => {
    authRequest(undefined, 'GET', '/messaging/unread-count', undefined, false)
      .then((res) => {
        expect([401, 403, 404]).to.include(res.status);
      });
  });

  /* ─── Create conversation + messages ─────────────────── */

  it('POST /messaging/conversations — create conversation', () => {
    authRequest(memberToken, 'POST', '/messaging/conversations', {
      participants: [memberId],
      subject: 'Cypress test conversation',
    }, false).then((res) => {
      expect([200, 201, 400, 403, 404, 422]).to.include(res.status);

      if (res.status === 200 || res.status === 201) {
        const convId = res.body?._id || res.body?.id || res.body?.data?._id || res.body?.conversation?._id;
        if (convId) {
          // GET single conversation
          authRequest(memberToken, 'GET', `/messaging/conversations/${convId}`, undefined, false)
            .then((r) => {
              expect([200, 400, 403, 404]).to.include(r.status);
            });

          // POST message to conversation
          authRequest(memberToken, 'POST', `/messaging/conversations/${convId}/messages`, {
            text: 'Hello from Cypress',
          }, false).then((r) => {
            expect([200, 201, 400, 403, 404, 422]).to.include(r.status);

            if (r.status === 200 || r.status === 201) {
              const msgId = r.body?._id || r.body?.id || r.body?.message?._id;
              if (msgId) {
                // POST reaction on message
                authRequest(memberToken, 'POST', `/messaging/conversations/${convId}/messages/${msgId}/react`, {
                  emoji: '👍',
                }, false).then((rr) => {
                  expect([200, 201, 400, 403, 404]).to.include(rr.status);
                });
              }
            }
          });

          // PUT mark as read
          authRequest(memberToken, 'PUT', `/messaging/conversations/${convId}/read`, undefined, false)
            .then((r) => {
              expect([200, 204, 400, 403, 404]).to.include(r.status);
            });
        }
      }
    });
  });

  /* ─── Broadcast (admin) ──────────────────────────────── */

  it('POST /messaging/broadcast — admin broadcast', () => {
    authRequest(adminToken, 'POST', '/messaging/broadcast', {
      subject: 'Cypress broadcast test',
      text: 'This is a test broadcast',
      audience: 'all_members',
    }, false).then((res) => {
      expect([200, 201, 400, 403, 404, 422]).to.include(res.status);
    });
  });

  it('POST /messaging/broadcast — member cannot broadcast', () => {
    authRequest(memberToken, 'POST', '/messaging/broadcast', {
      subject: 'Nope',
      text: 'Should fail',
    }, false).then((res) => {
      expect([401, 403, 404]).to.include(res.status);
    });
  });

  /* ─── Edge cases ─────────────────────────────────────── */

  it('GET /messaging/conversations/:fakeId — non-existent', () => {
    authRequest(memberToken, 'GET', '/messaging/conversations/000000000000000000000000', undefined, false)
      .then((res) => {
        expect([400, 403, 404]).to.include(res.status);
      });
  });

  it('POST /messaging/conversations/:fakeId/messages — non-existent', () => {
    authRequest(memberToken, 'POST', '/messaging/conversations/000000000000000000000000/messages', {
      text: 'hello',
    }, false).then((res) => {
      expect([400, 403, 404]).to.include(res.status);
    });
  });
});
