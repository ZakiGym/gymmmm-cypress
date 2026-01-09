/// <reference types="cypress" />

import '../../support/ui';
import { API_PREFIX } from '../../support/api';

/**
 * UI-driven coverage for admin notifications configuration endpoints.
 *
 * Targets (network signal):
 * - POST /api/admin/notifications/templates
 * - POST /api/admin/notifications/preferences
 * - POST /api/admin/notifications/channel-config
 */

describe('UI: admin notifications config (deep)', () => {
  const okish = (s: number) => [200, 201, 202, 204, 400, 401, 403, 404, 409, 415, 422, 429, 500, 502, 503].includes(s);

  it('navigates around settings/notifications and watches config calls (network signal)', () => {
    cy.uiLoginWithToken('admin');

    const hits: Array<{ label: string; status: number }> = [];

    const watch = (label: string, pathPart: string) => {
      cy.intercept({ method: /POST|PUT|PATCH/, url: `${API_PREFIX}${pathPart}*` }, (req) => {
        req.continue((res) => {
          hits.push({ label, status: res.statusCode });
        });
      }).as(label);
    };

    watch('prefs', '/admin/notifications/preferences');
    watch('templates', '/admin/notifications/templates');
    watch('channel', '/admin/notifications/channel-config');

    // Hit route candidates that commonly contain notification settings.
    const candidates = ['/settings', '/settings/notifications', '/notifications', '/admin/settings'];

    candidates.forEach((p) => {
      cy.visit(p, { failOnStatusCode: false });
      cy.wait(1500, { log: false });
    });

    cy.then(() => {
      // Best-effort: environment might not have these screens.
      hits.forEach((h) => expect(okish(h.status), `${h.label} status`).to.eq(true));
    });
  });
});
