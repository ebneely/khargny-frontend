import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Trips (tourism P2P) against a running tourism backend: TOURISM_API_URL, default the local :3120.
// Run: npx e2e run --config e2e.trips.config.ts --workers 1
// The website runs in same-origin mode (as in e2e.config.ts), so the browser's bearer token and
// guest cookie go through the website's own /api forwarder.
const suiteDir = fileURLToPath(new URL('.', import.meta.url));

export default {
  tests: ['tests/trips.e2e.ts'],
  targets: [{
    name: 'trips',
    // Stand in for Vercel's edge, which supplies the visitor IP to the forwarder.
    engine: web({ headers: { 'x-vercel-forwarded-for': '203.0.113.10' } }),
    app: {
      url: 'http://localhost:3122',
      command: {
        executable: 'npx',
        args: ['next', 'dev', '-p', '{port}'],
        cwd: resolve(suiteDir, '..'),
        reuseExisting: true,
        startupTimeout: 300_000,
        log: '.e2e/logs/trips-web.log',
        env: {
          NEXT_PUBLIC_API_URL: process.env.TOURISM_API_URL ?? 'http://localhost:3120',
          NEXT_PUBLIC_API_MODE: 'same-origin',
          NEXT_PUBLIC_ENV: 'development',
          WEB_FORWARDER_SECRET: 'dev-local-web-forwarder-secret-not-for-prod',
          VERCEL: '1',
        },
      },
    },
  }],
  reporters: ['list', 'markdown'],
  actionTimeout: 60_000,
  assertionTimeout: 15_000,
} satisfies E2EConfig;
