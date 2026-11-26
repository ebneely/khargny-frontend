import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The map's worker is served from public/ (see WORKER_URL in gl-map.tsx). It must be the installed package's own file:
// a worker from another version speaks a different message protocol and the map stays blank.
describe('map worker copy', () => {
  it('matches the installed maplibre-gl version', () => {
    const root = process.cwd();
    const installed = JSON.parse(readFileSync(join(root, 'node_modules/maplibre-gl/package.json'), 'utf8')).version as string;
    const served = readFileSync(join(root, 'public/maplibre/maplibre-gl-worker.mjs'), 'utf8').slice(0, 400);
    expect(served).toContain(`/v${installed}/LICENSE.txt`);
  });
});
