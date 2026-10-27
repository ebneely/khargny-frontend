import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

async function selectedModel() {
  const selection = process.env.E2E_MODEL;
  if (selection === undefined) return undefined;
  const separator = selection.indexOf(':');
  if (separator < 1 || !selection.slice(separator + 1).trim()) {
    throw new Error('E2E_MODEL must be <provider>:<model id>.');
  }
  const provider = selection.slice(0, separator);
  const modelId = selection.slice(separator + 1);
  if (provider === 'gateway') {
    const { gateway } = await import('ai');
    return gateway(modelId);
  }
  if (provider === 'chatgpt') {
    let chatgpt;
    try {
      ({ chatgpt } = await import('e2e/oauth/chatgpt'));
    } catch {
      throw new Error(
        'Install @ai-sdk/openai in e2e-tests/ to use E2E_MODEL=chatgpt:<model id>.',
      );
    }
    return chatgpt(modelId);
  }
  if (provider === 'copilot') {
    let copilot;
    try {
      ({ copilot } = await import('e2e/oauth/copilot'));
    } catch {
      throw new Error(
        'Install @ai-sdk/openai and @ai-sdk/openai-compatible in e2e-tests/ to use E2E_MODEL=copilot:<model id>.',
      );
    }
    return copilot(modelId);
  }
  throw new Error(
    `Unknown E2E_MODEL provider "${provider}"; use chatgpt, copilot, or gateway.`,
  );
}

const model = await selectedModel();
const suiteDir = fileURLToPath(new URL('.', import.meta.url));
const stackEnv = {
  ...Object.fromEntries(
    ['USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'KHARGNY_DASHBOARD_DIR'].flatMap(
      (name) => {
        const value = process.env[name];
        return value === undefined ? [] : [[name, value]];
      },
    ),
  ),
  KHARGNY_FRONTEND_DIR: resolve(suiteDir, '..'),
};

export default {
  agents: {
    default: {
      system: 'You are a thorough QA agent. Verify every outcome.',
      ...(model === undefined ? {} : { model }),
    },
    visitor: {
      system: 'You are a first-time visitor looking for a place to go out in an Egyptian city. Find a place and verify its detail page. Do not save, like or change anything.',
      context: 'The English website has Home, Explore and My plan. Home shows Featured places and a Search places… field. Explore Egypt offers Pick a city, then a city page with Search places… and Area: All areas. Cairo has Giza Pyramids, Egyptian Museum and Abou Tarek.',
      ...(model === undefined ? {} : { model }),
    },
  },
  targets: [{
    name: 'website',
    // Stand in for Vercel's edge, which supplies the visitor IP to the forwarder.
    engine: web({ headers: { 'x-vercel-forwarded-for': '203.0.113.10' } }),
    app: {
      url: 'http://localhost:3112',
      command: {
        executable: 'node',
        args: ['scripts/dev-local.mjs', '--e2e'],
        cwd: resolve(suiteDir, process.env.KHARGNY_BACKEND_DIR ?? '../../khargny-backend'),
        reuseExisting: true,
        startupTimeout: 600_000,
        log: '.e2e/logs/stack.log',
        env: stackEnv,
      },
    },
  }],
  // Trips run against the tourism backend with their own config: e2e.trips.config.ts.
  tests: ['tests/**/*.e2e.ts', '!tests/trips.e2e.ts'],
  reporters: ['list', 'markdown'],
  actionTimeout: 60_000,
  assertionTimeout: 15_000,
} satisfies E2EConfig;
