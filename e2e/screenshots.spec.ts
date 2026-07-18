import { test } from "@playwright/test";
import { mkdirSync } from "fs";
import { join } from "path";

// Visual sweep — capture every visitor page at desktop + mobile so the bad UX (mobile
// components on desktop, un-unified layout) is SEEN, not guessed. Not an assertion test;
// it just drives the real full-stack (Playwright's webServer) and saves PNGs.
const OUT = join(__dirname, "..", ".shots");
mkdirSync(OUT, { recursive: true });

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

// Routes to capture. citySlug/placeSlug resolved from the seeded data at runtime.
async function capture(page: any, name: string, size: { width: number; height: number }) {
  await page.setViewportSize(size);
  await page.waitForTimeout(900); // let rails/data settle
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
}

test("visual sweep — desktop + mobile", async ({ page }) => {
  test.setTimeout(120_000);

  // home
  await page.goto("/");
  await capture(page, "home-desktop", DESKTOP);
  await capture(page, "home-mobile", MOBILE);

  // explorer (city picker)
  await page.goto("/explorer");
  await capture(page, "explorer-desktop", DESKTOP);
  await capture(page, "explorer-mobile", MOBILE);

  // Cairo has the seeded places, so use it for the city + detail shots.
  const citySlug = "cairo";
  {
    await page.goto(`/explorer/${citySlug}`);
    await capture(page, "city-desktop", DESKTOP);
    await capture(page, "city-mobile", MOBILE);

    // first place on the city page → detail (cards are clickable divs, not <a>)
    await page.setViewportSize(DESKTOP);
    await page.goto(`/explorer/${citySlug}`);
    await page.waitForTimeout(1200);
    const firstCard = page.locator(".khg-place-grid > div").first();
    if (await firstCard.count()) {
      await firstCard.click();
      await page.waitForTimeout(1200);
      await capture(page, "detail-desktop", DESKTOP);
      await capture(page, "detail-mobile", MOBILE);
    }
  }

  // plan
  await page.goto("/plan");
  await capture(page, "plan-desktop", DESKTOP);
  await capture(page, "plan-mobile", MOBILE);

  // eslint-disable-next-line no-console
  console.log(`shots saved to ${OUT}`);
});
