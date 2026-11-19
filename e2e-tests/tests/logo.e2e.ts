import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('a touch tap flies the logo arrow and still goes home, and hover still flies it', async ({ app, screen, browser }) => {
  // a returning visitor: the first-visit "better in the app" sheet would cover the page while this test runs
  await browser.addInitScript(() => { try { localStorage.setItem('kh.getApp', String(Date.now())); } catch { /* storage blocked */ } });
  const flying = () => browser.evaluate(() => document.querySelector('.mark-go')!.getAnimations().length);
  await app.open('/explorer/');
  const logo = screen.getByRole('link', '5argny home');
  await expect(logo).toBeVisible();

  // a phone tap: the pointer events iOS and Android send, on the logo link (the web engine's tap is a mouse click)
  await browser.evaluate(() => {
    const link = document.querySelector<HTMLAnchorElement>('a.brand-mark');
    if (!link) throw new Error('the brand mark is not on the page');
    for (const type of ['pointerdown', 'pointerup']) {
      link.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch', isPrimary: true }));
    }
  });
  await expect.poll(flying, { message: 'the arrow did not fly on a touch press' }).toBeGreaterThan(0);

  // the same tap still navigates Home as it always did
  await logo.tap();
  await expect(browser).toHaveURL('/');

  // a mouse hover still flies the arrow, and hovering alone never navigates. The tap put the mouse on the logo,
  // so leave it and let that flight end before coming back for a fresh pointerenter.
  await browser.mouse.move(1, 700);
  await expect.poll(flying).toBe(0);
  await logo.hover();
  await expect.poll(flying, { message: 'the arrow did not fly on hover' }).toBeGreaterThan(0);
  await expect(browser).toHaveURL('/');
});
