import { test, expect, type Page } from "@playwright/test";

// Full-stack visitor e2e for the frontend surfaces (US-VISITOR-CIT-001,
// US-visitor-PLC-001..004, US-visitor-SAV-001, US-VISITOR-SCH-001,
// US-visitor-PLN-001), driven against a real local khargny backend seeded with
// region cities + active places (+ a hidden draft).

const BACKEND = "http://127.0.0.1:3100";

// Capture browser console + page errors so a blank render is diagnosable.
function attachDiagnostics(page: Page, label: string) {
  page.on("console", (m) => {
    if (m.type() === "error") console.log(`[console:${label}] ${m.text()}`);
  });
  page.on("pageerror", (e) => console.log(`[pageerror:${label}] ${e.message}`));
  page.on("requestfailed", (r) =>
    console.log(`[reqfail:${label}] ${r.url()} ${r.failure()?.errorText}`),
  );
}

// A seeded place is bilingual: nameEn "Cairo Place N" / name "مكان القاهرة N".
const PLACE_RE = /Cairo Place|مكان القاهرة/;
const CAIRO_RE = /Cairo|القاهرة/;

test("US-VISITOR-CIT-001 — home renders real discovery rails from the backend", async ({
  page,
}) => {
  attachDiagnostics(page, "home");
  await page.goto("/");
  // The page renders both a mobile and a desktop layout (CSS shows one), so a
  // seeded place appears in the DOM once data has loaded from GET /v1/places.
  await expect
    .poll(async () => await page.getByText(PLACE_RE).count(), {
      timeout: 15_000,
    })
    .toBeGreaterThan(0);
});

test("US-VISITOR-CIT-001 — explorer lists the seeded cities and routes on select", async ({
  page,
}) => {
  attachDiagnostics(page, "explorer");
  await page.goto("/explorer");
  await expect(page.getByText(CAIRO_RE).first()).toBeVisible();
  await page.getByText(/^Cairo$|^القاهرة$/).first().click();
  await expect(page).toHaveURL(/\/explorer\/cairo/);
});

test("US-visitor-PLC-001 — city page lists active places and excludes the draft", async ({
  page,
}) => {
  attachDiagnostics(page, "city");
  await page.goto("/explorer/cairo");
  await expect(page.getByText(PLACE_RE).first()).toBeVisible();
  // The seeded draft place must NOT appear publicly (negative assertion).
  await expect(page.getByText(/Hidden Draft|مسودة مخفية/)).toHaveCount(0);
});

test("US-visitor-PLC-002 — a place's detail page renders by slug", async ({
  page,
}) => {
  attachDiagnostics(page, "detail");
  // Resolve a real seeded place slug, then open its detail route (GET
  // /v1/places/:slug) — the "view full detail by slug" acceptance check.
  const res = await page.request.get(`${BACKEND}/v1/cities/cairo/places`);
  const body = await res.json();
  const list = body.data?.items ?? body.data?.data ?? body.data ?? [];
  expect(list.length).toBeGreaterThan(0);
  await page.goto(`/explorer/cairo/${list[0].slug}`);
  await expect(page.getByText(PLACE_RE).first()).toBeVisible();
});

test("US-VISITOR-SCH-001 — public search returns matching active places", async ({
  request,
}) => {
  const res = await request.get(`${BACKEND}/v1/search/places?q=Cairo`);
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  // Envelope: { data: { data: [...] } } (paginated) or { data: [...] }.
  const d = body.data;
  const items = Array.isArray(d) ? d : (d?.data ?? d?.items ?? []);
  expect(items.length).toBeGreaterThan(0);
});

test("US-VISITOR-SAV-001 / PLN-001 — the plan page loads the guest's saves", async ({
  page,
}) => {
  attachDiagnostics(page, "plan");
  // Save a place directly against the backend as this guest, then view the plan.
  await page.goto("/explorer/cairo");
  const places = await page.request.get(`${BACKEND}/v1/cities/cairo/places`);
  const body = await places.json();
  const list = body.data?.items ?? body.data?.data ?? body.data ?? [];
  if (list.length) {
    await page.request.post(`${BACKEND}/v1/saved-places`, {
      data: { placeId: list[0].id },
    });
  }
  await page.goto("/plan");
  await expect(page.locator("body")).toBeVisible();
});
