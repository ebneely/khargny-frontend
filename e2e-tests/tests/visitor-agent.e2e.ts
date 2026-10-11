import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('a first-time visitor finds a Cairo place and opens it', {
  agent: 'visitor',
  skip: process.env.E2E_MODEL === undefined ? 'Set E2E_MODEL=<provider>:<model id> to run the visitor agent.' : false,
}, async ({ app, screen, agent, browser }) => {
  await app.open('/en/');
  await expect(screen.getByRole('heading', 'Find your next outing in Egypt')).toBeVisible();
  await agent.act('Use Explore and Pick a city to find {city}, then open {place}. Do not save or like any place.', {
    params: { city: 'Cairo', place: 'Giza Pyramids' },
  });
  await expect(screen.getByRole('heading', 'Giza Pyramids', { level: 1 })).toBeVisible();
  await expect(browser).toHaveURL('/en/explorer/cairo/giza-pyramids/');
});
