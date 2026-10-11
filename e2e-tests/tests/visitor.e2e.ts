import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('home renders real discovery rails from the backend', async ({ app, screen, browser }) => {
  await app.open('/en/');
  await expect(browser).toHaveURL('/en/');
  await expect(screen.getByRole('heading', 'Find your next outing in Egypt')).toBeVisible();
  const featured = screen.getByRole('region', 'Featured places');
  for (const name of ['Giza Pyramids', 'Egyptian Museum', 'Bibliotheca Alexandrina']) {
    await expect(featured.getByRole('link', name)).toBeVisible();
  }
  await expect(screen.getByText('Hidden Draft')).toHaveCount(0);
});

test('explorer lists the seeded cities and routes on select', async ({ app, screen, browser }) => {
  await app.open('/en/explorer/');
  await expect(screen.getByRole('heading', 'Explore Egypt')).toBeVisible();
  const main = screen.getByRole('main');
  await expect(main.getByRole('link')).toHaveCount(2);
  await expect(main.getByRole('heading', 'Alexandria')).toBeVisible();
  await expect(main.getByRole('heading', 'Cairo')).toBeVisible();
  const cairo = main.getByRole('link').filter({ has: screen.getByRole('heading', 'Cairo') });
  await expect(cairo).toHaveAttribute('href', '/en/explorer/cairo/');
  await cairo.tap();
  await expect(browser).toHaveURL('/en/explorer/cairo/');
  await expect(screen.getByRole('heading', 'Cairo', { level: 1 })).toBeVisible();
});

test('city page lists active places and excludes the draft', async ({ app, screen }) => {
  await app.open('/en/explorer/cairo/');
  await expect(screen.getByRole('heading', 'Cairo', { level: 1 })).toBeVisible();
  const main = screen.getByRole('main');
  await expect(main.getByRole('status')).toHaveText('3 places');
  await expect(main.getByRole('article')).toHaveCount(3);
  for (const name of ['Abou Tarek', 'Egyptian Museum', 'Giza Pyramids']) {
    await expect(main.getByRole('link', name)).toBeVisible();
  }
  for (const name of ['Hidden Draft', 'e2e-inactive-place', 'e2e-deleted-place', 'e2e-pending-media-place', 'e2e-no-media-place']) {
    await expect(main.getByText(name)).toHaveCount(0);
  }
});

test('a place detail page renders by slug', async ({ app, screen, browser }) => {
  await app.open('/en/explorer/cairo/giza-pyramids/');
  await expect(browser).toHaveURL('/en/explorer/cairo/giza-pyramids/');
  await expect(screen.getByRole('heading', 'Giza Pyramids', { level: 1 })).toBeVisible();
  await expect(screen.getByRole('navigation', 'Breadcrumb').getByRole('link', 'Cairo')).toHaveAttribute('href', '/en/explorer/cairo/');
  await expect(screen.getByText('12 Nile Road')).toBeVisible();
});

test('public search returns matching active places', async ({ app, screen, browser }) => {
  await app.open('/en/');
  await screen.getByRole('combobox', 'Search places…').fill('Museum');
  const results = screen.getByRole('listbox', 'Search results');
  const museum = results.getByRole('option', /^Egyptian Museum\s/);
  await expect(museum).toBeVisible();
  await expect(museum).toHaveAttribute('href', '/en/explorer/cairo/egyptian-museum/');
  await expect(results.getByRole('option', /^Giza Pyramids\s/)).toHaveCount(0);
  await expect(results.getByText('Hidden Draft')).toHaveCount(0);
  await museum.tap();
  await expect(browser).toHaveURL('/en/explorer/cairo/egyptian-museum/');
  await expect(screen.getByRole('heading', 'Egyptian Museum', { level: 1 })).toBeVisible();
  await app.open('/en/explorer/cairo/');
  await screen.getByRole('searchbox', 'Search places…').fill('Hidden Draft');
  await expect(screen.getByText('No results for "Hidden Draft"')).toBeVisible();
  await expect(screen.getByRole('article')).toHaveCount(0);
});

test('saving a place as a guest persists in the plan', async ({ app, screen, browser }) => {
  let failed = false;
  try {
    await app.open('/en/plan/');
    await expect(screen.getByRole('heading', 'Your plan is empty')).toBeVisible();
    await app.open('/en/explorer/cairo/giza-pyramids/');
    await expect(screen.getByRole('heading', 'Giza Pyramids', { level: 1 })).toBeVisible();
    await screen.getByRole('complementary').getByRole('button', /^Add Giza Pyramids to your plan: \d+ saves$/).tap();
    const saved = screen.getByRole('complementary').getByRole('button', /^Remove Giza Pyramids from your plan: \d+ saves$/);
    await expect(saved).toHaveAttribute('aria-pressed', 'true');
    await expect(saved).toHaveAttribute('aria-busy', 'false');
    await screen.getByRole('navigation', 'Primary').getByRole('link', 'My plan').tap();
    await expect(browser).toHaveURL('/en/plan/');
    await expect(screen.getByRole('heading', 'My visit plan')).toBeVisible();
    const plan = screen.getByRole('tabpanel', 'Plan');
    await expect(plan.getByRole('article')).toHaveCount(1);
    await expect(plan.getByText('Giza Pyramids')).toBeVisible();
    await expect(screen.getByRole('heading', 'No specific day yet')).toBeVisible();
    await browser.reload();
    await expect(plan.getByRole('article')).toHaveCount(1);
    await expect(plan.getByText('Giza Pyramids')).toBeVisible();
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    try {
      await app.open('/en/plan/');
      const remove = screen.getByRole('tabpanel', 'Plan').getByRole('button', /^Remove Giza Pyramids from your plan: \d+ saves$/);
      await expect(remove).toHaveAttribute('aria-busy', 'false');
      await remove.tap();
      await expect(screen.getByRole('heading', 'Your plan is empty')).toBeVisible();
    } catch (error) {
      if (!failed) throw error;
      console.error('Guest plan cleanup failed:', error);
    }
  }
});

test('area labels deduplicate and filter by the stored catalogue key', async ({ app, screen }) => {
  await app.open('/en/explorer/cairo/');
  await expect(screen.getByRole('article')).toHaveCount(3);
  const pyramids = screen.getByRole('article').filter({ has: screen.getByRole('link', 'Giza Pyramids') });
  await expect(pyramids.getByRole('link', 'Giza Pyramids Landmarks · Zamalek')).toBeVisible();
  await expect(pyramids.getByText('12 Nile Road')).toHaveCount(0);
  await expect(screen.getByRole('link', 'Egyptian Museum Landmarks · Zamalek')).toBeVisible();
  await screen.getByRole('button', 'Area: All areas').tap();
  const area = screen.getByRole('dialog', 'Area');
  await expect(area.getByRole('option')).toHaveText(['All areas', 'Maadi', 'Zamalek']);
  await area.getByRole('button', 'Zamalek').tap();
  await expect(screen.getByRole('button', 'Area: Zamalek')).toBeVisible();
  await expect(screen.getByRole('main').getByRole('status')).toHaveText('1 place');
  await expect(screen.getByRole('article')).toHaveCount(1);
  await expect(screen.getByRole('link', 'Giza Pyramids')).toBeVisible();
  await expect(screen.getByRole('link', 'Egyptian Museum')).toHaveCount(0);
  await screen.getByRole('button', 'Area: Zamalek').tap();
  await area.getByRole('button', 'All areas').tap();
  await expect(screen.getByRole('button', 'Area: All areas')).toBeVisible();
  await expect(screen.getByRole('article')).toHaveCount(3);
});

test('Arabic area labels keep the same catalogue key', async ({ app, screen, browser }) => {
  await app.open('/en/explorer/cairo/');
  await expect(screen.getByRole('article')).toHaveCount(3);
  await screen.getByRole('button', 'Switch language').tap();
  await expect(browser).toHaveURL('/ar/explorer/cairo/');
  await expect(screen.getByRole('heading', 'القاهرة', { level: 1 })).toBeVisible();
  await screen.getByRole('button', 'المنطقة: كل المناطق').tap();
  const area = screen.getByRole('dialog', 'المنطقة');
  await expect(area.getByRole('option')).toHaveCount(3);
  for (const name of ['كل المناطق', 'الزمالك', 'المعادي']) {
    await expect(area.getByRole('option', name)).toHaveCount(1);
  }
  await expect(area.getByText('Zamalek')).toHaveCount(0);
  await area.getByRole('button', 'الزمالك').tap();
  await expect(screen.getByRole('button', /^المنطقة:/)).toHaveText('الزمالك');
  await expect(screen.getByRole('article')).toHaveCount(1);
  await expect(screen.getByRole('link', 'أهرامات الجيزة')).toBeVisible();
  await expect(screen.getByRole('link', 'المتحف المصري')).toHaveCount(0);
});

test('unknown areas show only in their own script without dangling location text', async ({ app, screen, browser }) => {
  await app.open('/en/explorer/alexandria/');
  await expect(screen.getByRole('link', 'Bibliotheca Alexandrina Landmarks · Legacy Quarter 2')).toBeVisible();
  await screen.getByRole('button', 'Area: All areas').tap();
  await expect(screen.getByRole('dialog', 'Area').getByRole('option')).toHaveText(['All areas', 'Legacy Quarter 2']);
  await screen.getByRole('dialog', 'Area').getByRole('button', 'Close').tap();
  await screen.getByRole('button', 'Switch language').tap();
  await expect(browser).toHaveURL('/ar/explorer/alexandria/');
  await expect(screen.getByRole('button', 'المنطقة: مفيش مناطق في المدينة دي لسه.')).toBeDisabled();
  await expect(screen.getByRole('link', 'مكتبة الإسكندرية معالم')).toBeVisible();
  await expect(screen.getByText('Legacy Quarter 2')).toHaveCount(0);
  await screen.getByRole('link', 'مكتبة الإسكندرية').tap();
  await expect(screen.getByRole('heading', 'مكتبة الإسكندرية', { level: 1 })).toBeVisible();
  await expect(screen.getByText('معالم · الإسكندرية')).toBeVisible();
  await expect(screen.getByText('Legacy Quarter 2')).toHaveCount(0);
});
