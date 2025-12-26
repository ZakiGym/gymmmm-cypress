// cypress/support/e2e.ts
import './api';

import { waitForBackendReady } from './api';

// Render-style cold starts can take ~60s.
// Warm the server once before the first spec runs.
before(() => {
	waitForBackendReady({ timeoutMs: 75_000, intervalMs: 2_500 });
});