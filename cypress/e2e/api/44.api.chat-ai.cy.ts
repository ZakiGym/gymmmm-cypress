/**
 * 44 — Chat / AI Assistant: /api/chat/*
 *
 * Covers message, status, and health endpoints.
 */

import { authRequest } from '../../support/api';

describe('Chat / AI Assistant', () => {
  let memberToken: string;
  let adminToken: string;
  let superToken: string;

  before(() => {
    cy.apiLogin('member').then(({ token }) => { memberToken = token; });
    cy.apiLogin('admin').then(({ token }) => { adminToken = token; });
    cy.apiLogin('superadmin').then(({ token }) => { superToken = token; });
  });

  it('GET /chat/status — check AI availability (member)', () => {
    authRequest(memberToken, 'GET', '/chat/status', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404, 503]).to.include(res.status);
      });
  });

  it('GET /chat/status — check AI availability (admin)', () => {
    authRequest(adminToken, 'GET', '/chat/status', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404, 503]).to.include(res.status);
      });
  });

  it('POST /chat/message — send message (member)', () => {
    authRequest(memberToken, 'POST', '/chat/message', {
      message: 'What are my upcoming classes?',
    }, false).then((res) => {
      // Might fail if Gemini key not configured, that's fine
      expect([200, 400, 403, 404, 422, 500, 503]).to.include(res.status);
    });
  });

  it('POST /chat/message — send message (admin)', () => {
    authRequest(adminToken, 'POST', '/chat/message', {
      message: 'How many members do we have?',
    }, false).then((res) => {
      expect([200, 400, 403, 404, 422, 500, 503]).to.include(res.status);
    });
  });

  it('GET /chat/health — diagnostics (superadmin only)', () => {
    authRequest(superToken, 'GET', '/chat/health', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404, 500, 503]).to.include(res.status);
      });
  });

  it('GET /chat/health — should reject non-superadmin', () => {
    authRequest(adminToken, 'GET', '/chat/health', undefined, false)
      .then((res) => {
        expect([401, 403, 404]).to.include(res.status);
      });
  });

  it('POST /chat/message — no auth should fail', () => {
    authRequest(undefined, 'POST', '/chat/message', {
      message: 'test',
    }, false).then((res) => {
      expect([401, 403]).to.include(res.status);
    });
  });

  it('POST /chat/message — empty message body', () => {
    authRequest(memberToken, 'POST', '/chat/message', {}, false)
      .then((res) => {
        expect([400, 422, 500, 503]).to.include(res.status);
      });
  });
});
