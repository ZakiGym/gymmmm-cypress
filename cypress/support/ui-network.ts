// cypress/support/ui-network.ts
// Helpers to do robust UI assertions without brittle DOM selectors.

export type ObservedRequest = {
  method: string;
  url: string;
  status?: number;
};

export const normalizeUrl = (url: string) => {
  try {
    const u = new URL(url);
    // Drop query params/fragments for stable matching.
    return `${u.origin}${u.pathname}`;
  } catch {
    return url.split('?')[0].split('#')[0];
  }
};

/**
 * Creates an intercept that collects API requests (fetch/xhr) into an array.
 *
 * Typical use:
 *   const observed: ObservedRequest[] = []
 *   cy.collectApiTraffic(observed)
 */
export const isLikelyApiCall = (url: string) => {
  const u = normalizeUrl(url);
  return u.includes('/api/') || u.includes('api-gymmm.onrender.com');
};
