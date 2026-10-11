import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('the desktop explorer matches its screenshot', { tags: ['visual'] }, async ({ app, screen, browser }) => {
  await browser.setViewport({ width: 1440, height: 900 });
  await app.open('/en/explorer/');
  await expect(screen.getByRole('heading', 'Explore Egypt')).toBeVisible();
  await expect(screen.getByRole('main').getByRole('link')).toHaveCount(2);
  await expect(screen.getByRole('heading', 'Cairo')).toBeVisible();
  await expect(screen.getByRole('heading', 'Alexandria')).toBeVisible();
  await expect(screen).toHaveScreenshot('explorer-desktop.png');
});

test('the mobile city matches its screenshot', { tags: ['visual'] }, async ({ app, screen, browser }) => {
  await browser.setViewport({ width: 390, height: 844 });
  await app.open('/en/explorer/cairo/');
  await expect(screen.getByRole('heading', 'Cairo', { level: 1 })).toBeVisible();
  await expect(screen.getByRole('article')).toHaveCount(3);
  await expect(screen.getByRole('button', 'Area: All areas')).toBeEnabled();
  await expect(screen).toHaveScreenshot('cairo-mobile.png', {
    mask: [
      screen.getByRole('article').getByRole('image'),
      screen.getByRole('article').getByRole('button'),
    ],
  });
});
