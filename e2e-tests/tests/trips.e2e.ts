// Trips (tourism P2P) on the website, against a running tourism backend.
// Run: npx e2e run --config e2e.trips.config.ts --workers 1
// Creates its own listers, trips and customers with a run-unique suffix and cancels every
// booking and trip it made in afterAll. Screenshots: TRIPS_SHOTS (default worktrees/tourism-shots/website).
import { afterAll, beforeAll, describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = process.env.TOURISM_API_URL ?? 'http://localhost:3120';
const SHOTS = process.env.TRIPS_SHOTS ?? resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../tourism-shots/website');
const PASSWORD = 'Passw0rd!x';
const stamp = Date.now().toString().slice(-7);
const future = (days: number) => new Date(Date.now() + days * 864e5).toISOString();
const nid = (n: number) => `2990202${String(n).padStart(7, '0')}`;
const phone = (n: number) => `012${String(n).padStart(8, '0')}`;
const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };

async function call<T = any>(method: string, path: string, token?: string, body?: unknown): Promise<{ status: number; data: T; json: any }> {
  const res = await fetch(API + path, {
    method,
    headers: { Origin: 'http://localhost:3122', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, data: json?.data ?? json, json };
}
async function signIn(email: string) {
  const r = await call('POST', '/v1/tourism/auth/sign-in/email', undefined, { email, password: PASSWORD });
  if (!r.json?.token) throw new Error(`sign-in ${email}: ${JSON.stringify(r.json)}`);
  return r.json.token as string;
}
async function signUp(kind: 'agency' | 'customer', name: string, n: number) {
  const email = `e2e-${kind}-${name.toLowerCase().replace(/\W/g, '')}-${stamp}@test.5argny.local`;
  const r = await call('POST', '/v1/tourism/auth/sign-up/email', undefined, { email, password: PASSWORD, name, kind, phone: phone(Number(stamp) + n) });
  if (!r.json?.token) throw new Error(`sign-up ${email}: ${JSON.stringify(r.json)}`);
  return { email, token: r.json.token as string };
}

const seed = {
  freeLister: '', verifiedLister: '', admin: '',
  freeTrip: { id: '', title: `E2E Fayoum camp ${stamp}` },
  paidTrip: { id: '', title: `E2E Siwa escape ${stamp}` },
  inviter: { email: '', token: '', code: '', bookingId: '' },
  friend: { name: `Nour ${stamp}`, email: `e2e-friend-${stamp}@test.5argny.local`, token: '' },
};

async function shot(app: { screenshot(label?: string): Promise<string> }, name: string) {
  await mkdir(SHOTS, { recursive: true });
  // The returned path is relative to the attempt folder: find the newest file with that name.
  const file = basename(await app.screenshot(name));
  const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '../.e2e/results');
  const found = (await readdir(root, { recursive: true })).filter((entry) => basename(entry) === file).map((entry) => join(root, entry));
  const times = await Promise.all(found.map(async (path) => (await stat(path)).mtimeMs));
  await copyFile(found[times.indexOf(Math.max(...times))], join(SHOTS, `${name}.png`));
}
/** Opens a page signed in as a customer: the website keeps the bearer token in localStorage. */
async function openAs(app: { open(path: string): Promise<void> }, browser: { evaluate(fn: (t: string) => void, arg: string): Promise<unknown> }, token: string, path: string) {
  await app.open('/en/trips/sign-in/');
  await browser.evaluate((t: string) => localStorage.setItem('khg.trips.token', t), token);
  await app.open(path);
}

describe('trips', { serial: true, tags: ['trips'] }, () => {
  beforeAll(async () => {
    seed.admin = (await call('POST', '/v1/auth/login', undefined, { email: 'admin@khargny.local', password: 'Admin12345!' })).data.access_token;
    const settings = (await call('GET', '/v1/admin/tourism/settings', seed.admin)).data;
    if (!settings.rewardsEnabled || settings.earlyBirdPerTrip < 2) throw new Error(`rewards need earlyBirdPerTrip >= 2: ${JSON.stringify(settings)}`);

    seed.freeLister = (await signUp('agency', 'Fayoum Friends', 1)).token;
    await call('POST', '/v1/tourism/agency/register', seed.freeLister, { kind: 'individual', name: `Fayoum Friends ${stamp}`, city: 'Fayoum', acceptTerms: true });
    const free = await call('POST', '/v1/tourism/agency/trips', seed.freeLister, {
      kind: 'trip', title: `مخيم الفيوم ${stamp}`, titleEn: seed.freeTrip.title, destination: 'Fayoum', departureCity: 'Cairo',
      description: 'Tunis village, Wadi El Rayan waterfalls and a night under the stars.', includes: 'Bus from Cairo\nTent\nDinner',
      startsAt: future(12), endsAt: future(13), priceEgp: 900, seatsTotal: 15,
    });
    seed.freeTrip.id = free.data.id;

    seed.verifiedLister = await signIn('lister.verified@demo.5argny.local');
    const paid = await call('POST', '/v1/tourism/agency/trips', seed.verifiedLister, {
      kind: 'trip', title: `هروب سيوة ${stamp}`, titleEn: seed.paidTrip.title, destination: 'Siwa', departureCity: 'Cairo',
      description: 'Salt lakes, Cleopatra spring and a desert camp.', includes: 'Transport\nHotel 3 nights\nSafari',
      startsAt: future(15), endsAt: future(19), priceEgp: 4500, seatsTotal: 12,
    });
    seed.paidTrip.id = paid.data.id;
    const approved = await call('POST', `/v1/admin/tourism/trips/${paid.data.id}/approve`, seed.admin, {});
    if (approved.data.status !== 'live') throw new Error(`approve: ${JSON.stringify(approved.json)}`);

    const inviter = await signUp('customer', 'Karim', 3);
    seed.inviter.email = inviter.email; seed.inviter.token = inviter.token;
    seed.inviter.code = (await call('POST', '/v1/tourism/customer/profile', inviter.token, { nationalId: nid(Number(stamp) + 3), acceptTerms: true })).data.inviteCode;
    const booked = await call('POST', '/v1/tourism/customer/bookings', inviter.token, { tripId: seed.paidTrip.id, seats: 1 });
    if (booked.data?.reward?.kind !== 'early_bird') throw new Error(`inviter booking: ${JSON.stringify(booked.json)}`);
    seed.inviter.bookingId = booked.data.booking.id;
  });

  afterAll(async () => {
    // Cancel every booking this run made, then the two trips, through the normal API paths.
    for (const token of [seed.friend.token, seed.inviter.token].filter(Boolean)) {
      const me = await call('GET', '/v1/tourism/customer/me', token);
      for (const b of me.data?.bookings ?? []) if (b.status === 'booked') await call('POST', `/v1/tourism/customer/bookings/${b.id}/cancel`, token);
    }
    if (seed.freeTrip.id) await call('POST', `/v1/tourism/agency/trips/${seed.freeTrip.id}/cancel`, seed.freeLister);
    if (seed.paidTrip.id) await call('POST', `/v1/tourism/agency/trips/${seed.paidTrip.id}/cancel`, seed.verifiedLister);
  });

  test('guest browses Trips, filters and likes then unlikes a trip', async ({ app, screen, browser }) => {
    await browser.setViewport(DESKTOP);
    await app.open('/en/trips/');
    await expect(screen.getByRole('heading', '5argny is a free marketplace', { level: 1 })).toBeVisible();
    await expect(screen.getByRole('navigation', 'Primary').getByRole('link', 'Trips')).toHaveAttribute('aria-current', 'page');
    await screen.getByRole('searchbox', 'Search by destination…').fill(stamp);
    await expect(screen.getByRole('article')).toHaveCount(2);
    const free = screen.getByRole('article').filter({ hasText: seed.freeTrip.title });
    const paid = screen.getByRole('article').filter({ hasText: seed.paidTrip.title });
    await expect(free.getByText('Free listing')).toBeVisible();
    await expect(paid.getByRole('img', 'Verified by 5argny')).toBeVisible();
    await expect(paid.getByText(/250 EGP cash for early birds — \d+ left/)).toBeVisible();
    await expect(paid.getByText('4,500 EGP')).toBeVisible();
    await expect(paid.getByText('11 seats left')).toBeVisible();
    await shot(app, 'en-desktop-01-trips-list');

    await screen.getByRole('button', 'Verified only').tap();
    await expect(screen.getByRole('article')).toHaveCount(1);
    await expect(screen.getByRole('article').getByText(seed.paidTrip.title)).toBeVisible();
    await screen.getByRole('button', 'Verified only').tap();
    await screen.getByRole('button', 'Events').tap();
    await expect(screen.getByRole('status')).toHaveText('0 listings');
    await screen.getByRole('button', 'All').tap();

    const like = free.getByRole('button', `Like ${seed.freeTrip.title}`);
    await like.tap();
    const unlike = free.getByRole('button', `Unlike ${seed.freeTrip.title}`);
    await expect(unlike).toHaveAttribute('aria-pressed', 'true');
    await expect(unlike).toHaveText('1');
    expect((await call('GET', `/v1/tourism/trips/${seed.freeTrip.id}`)).data.likeCount).toBe(1);
    await shot(app, 'en-desktop-02-trip-liked');
    await unlike.tap();
    await expect(free.getByRole('button', `Like ${seed.freeTrip.title}`)).toHaveText('0');
    await expect.poll(async () => (await call('GET', `/v1/tourism/trips/${seed.freeTrip.id}`)).data.likeCount).toBe(0);
  });

  test('guest opens a free trip: disclaimer, view counted once, sign-in to book', async ({ app, screen, browser }) => {
    await browser.setViewport(DESKTOP);
    await app.open(`/en/trips/${seed.freeTrip.id}/`);
    await expect(screen.getByRole('heading', seed.freeTrip.title, { level: 1 })).toBeVisible();
    await expect(screen.getByRole('note')).toContainText('Not supervised by 5argny');
    await expect(screen.getByRole('note')).toContainText('not supervised or verified by 5argny');
    await expect(screen.getByRole('heading', "What's included")).toBeVisible();
    await expect(screen.getByText('Bus from Cairo')).toBeVisible();
    await expect(screen.getByRole('link', /Organizer page: Fayoum Friends/)).toBeVisible();
    await expect.poll(async () => (await call('GET', `/v1/tourism/trips/${seed.freeTrip.id}`)).data.viewCount).toBe(1);
    await shot(app, 'en-desktop-03-free-trip-guest');
    await screen.getByRole('button', 'Sign in to book').tap();
    await expect(browser).toHaveURL(new RegExp(`/en/trips/sign-in/\\?next=%2Fen%2Ftrips%2F${seed.freeTrip.id}`));
    await expect(screen.getByRole('heading', 'Sign in', { level: 1 })).toBeVisible();
  });

  test('a friend signs up with an invite code and finishes the profile', async ({ app, screen, browser }) => {
    await browser.setViewport(MOBILE);
    await app.open(`/en/trips/?invite=${seed.inviter.code}`);
    await expect(screen.getByText(/A friend invited you/)).toBeVisible();
    await screen.getByRole('link', 'Create my account').tap();
    await expect(screen.getByRole('heading', 'Create account', { level: 1 })).toBeVisible();
    await expect(screen.getByText('5argny is a free marketplace')).toBeVisible();
    await screen.getByLabel('Full name').fill(seed.friend.name);
    await screen.getByLabel('Email').fill(seed.friend.email);
    await screen.getByLabel('Mobile number').fill(phone(Number(stamp) + 4));
    await screen.getByLabel('Password').fill(PASSWORD);
    await screen.getByRole('button', 'Create account').tap();
    await expect(screen.getByRole('main').getByRole('alert')).toHaveText('Accept the terms to continue.');
    await screen.getByRole('checkbox', /I accept the terms: 5argny is a free marketplace/).check();
    await shot(app, 'en-mobile-04-sign-up');
    await screen.getByRole('button', 'Create account').tap();

    await expect(screen.getByRole('heading', 'Finish your profile', { level: 1 })).toBeVisible();
    await expect(screen.getByLabel('Invite code (optional)')).toHaveValue(seed.inviter.code);
    await screen.getByLabel('National ID number (14 digits)').fill('123');
    await screen.getByRole('button', 'Save and continue').tap();
    await expect(screen.getByRole('main').getByRole('alert')).toHaveText('Enter the 14 digits on your national ID.');
    await screen.getByLabel('National ID number (14 digits)').fill(nid(Number(stamp) + 4));
    await shot(app, 'en-mobile-05-finish-profile');
    await screen.getByRole('button', 'Save and continue').tap();
    await expect(browser).toHaveURL('/en/trips/me/');
    await expect(screen.getByText('No bookings yet.')).toBeVisible();
    seed.friend.token = String(await browser.evaluate(() => localStorage.getItem('khg.trips.token')));
    const me = await call('GET', '/v1/tourism/customer/me', seed.friend.token);
    expect(me.data.profile.nationalIdLast4).toBe(nid(Number(stamp) + 4).slice(-4));
    const inviter = await call('GET', '/v1/tourism/customer/me', seed.inviter.token);
    expect(inviter.data.invites.friendsJoined).toBe(1);
  });

  test('free trip booking needs the disclaimer tick', async ({ app, screen, browser }) => {
    await browser.setViewport(DESKTOP);
    await openAs(app, browser, seed.friend.token, `/en/trips/${seed.freeTrip.id}/`);
    await screen.getByRole('button', 'One seat more').tap();
    await screen.getByRole('button', 'Book').tap();
    await expect(screen.getByRole('main').getByRole('alert')).toHaveText('Tick the box to accept the note before you book this free listing.');
    expect((await call('GET', '/v1/tourism/customer/me', seed.friend.token)).data.bookings).toHaveLength(0);
    // The server refuses it too, not just the page.
    const refused = await call('POST', '/v1/tourism/customer/bookings', seed.friend.token, { tripId: seed.freeTrip.id, seats: 1 });
    expect(refused.status).toBe(422);
    expect(refused.json.error.code).toBe('DISCLAIMER_REQUIRED');
    await shot(app, 'en-desktop-06-free-refused-without-tick');
    await screen.getByRole('checkbox', /this trip is not supervised by 5argny/).check();
    await screen.getByRole('button', 'Book').tap();
    await expect(screen.getByRole('status').filter({ hasText: 'Booked' })).toHaveText('Booked: 2 seats.');
    await expect(screen.getByText(/You earned 250 EGP cash/)).toHaveCount(0);
    await shot(app, 'en-desktop-07-free-booked');
  });

  test('monitored trip booking earns the early-bird cash', async ({ app, screen, browser }) => {
    await browser.setViewport(MOBILE);
    await openAs(app, browser, seed.friend.token, `/en/trips/${seed.paidTrip.id}/`);
    await expect(screen.getByRole('heading', seed.paidTrip.title, { level: 1 })).toBeVisible();
    await expect(screen.getByRole('note')).toHaveCount(0);
    await expect(screen.getByRole('img', 'Verified by 5argny').first()).toBeVisible();
    await expect(screen.getByText(/250 EGP cash for early birds — \d+ left/)).toBeVisible();
    await shot(app, 'en-mobile-08-monitored-trip');
    await screen.getByRole('button', 'Book').scrollIntoView();
    await screen.getByRole('button', 'Book').tap();
    await expect(screen.getByRole('status').filter({ hasText: 'Booked' })).toHaveText('Booked: 1 seats.');
    await expect(screen.getByText(/You earned 250 EGP cash\. Show your QR at the Sinai Tours office/)).toBeVisible();
    await shot(app, 'en-mobile-09-monitored-booked-early-bird');
    const me = await call('GET', '/v1/tourism/customer/me', seed.friend.token);
    expect(me.data.rewards.map((r: { kind: string; status: string }) => `${r.kind}:${r.status}`)).toEqual(['early_bird:waiting']);
  });

  test('messages stay inside 5argny and rating waits for the trip to start', async ({ app, screen, browser }) => {
    await browser.setViewport(DESKTOP);
    await openAs(app, browser, seed.friend.token, '/en/trips/me/');
    const booking = screen.getByRole('article', seed.paidTrip.title);
    await booking.getByRole('button', 'Messages').tap();
    await expect(booking.getByText('Phone numbers and links are hidden so everything stays inside 5argny.')).toBeVisible();
    await booking.getByRole('textbox', 'Write to the organizer…').fill('Call me on 01012345678 or wa.me/201012345678');
    await booking.getByRole('button', 'Send').tap();
    const log = booking.getByRole('log');
    await expect(log).toContainText('•••');
    await expect(log).not.toContainText('01012345678');
    const me = await call('GET', '/v1/tourism/customer/me', seed.friend.token);
    const bookingId = me.data.bookings.find((b: { trip: { id: string } }) => b.trip.id === seed.paidTrip.id).id;
    await call('POST', `/v1/tourism/agency/bookings/${bookingId}/messages`, seed.verifiedLister, { body: 'Welcome! Bus leaves at 7 am.' });
    await expect(log).toContainText('Welcome! Bus leaves at 7 am.', { timeout: 12_000 });

    await expect(booking.getByText(/You can rate this trip after it starts on/)).toBeVisible();
    await expect(booking.getByRole('button', 'Send rating')).toHaveCount(0);
    const early = await call('POST', `/v1/tourism/customer/bookings/${bookingId}/rating`, seed.friend.token, { stars: 5 });
    expect(early.status).toBe(409);
    expect(early.json.error.code).toBe('TRIP_NOT_STARTED');
    await shot(app, 'en-desktop-10-messages-and-rating-wait');
  });

  test('QR screen: organizer gives cash, customer answers Yes', async ({ app, screen, browser }) => {
    await browser.setViewport(MOBILE);
    await openAs(app, browser, seed.friend.token, '/en/trips/cash/');
    await expect(screen.getByText("Waiting: show your QR at the Sinai Tours office to get 250 EGP cash.")).toBeVisible();
    await expect(screen.getByText('Your code')).toBeVisible();
    await shot(app, 'en-mobile-11-my-cash');
    await screen.getByRole('link', 'Show my QR').tap();
    await expect(screen.getByRole('heading', 'Your QR code', { level: 1 })).toBeVisible();
    await expect(screen.getByText(/New code in \d+ s/)).toBeVisible();
    const qr = screen.getByRole('img', 'Your QR code');
    await expect(qr).toHaveAttribute('data-qr-token', /^5T\./);
    await shot(app, 'en-mobile-12-qr');
    const token = await qr.getAttribute('data-qr-token');
    const scan = await call('POST', '/v1/tourism/agency/scan', seed.verifiedLister, { token });
    expect(scan.data.canPay).toBe(true);
    const option = scan.data.options.find((o: { booking: { trip: { id: string } } }) => o.booking.trip.id === seed.paidTrip.id) ?? scan.data.options[0];
    const given = await call('POST', '/v1/tourism/agency/redemptions', seed.verifiedLister, { scanId: scan.data.scanId, bookingId: option.booking.id, rewardId: option.reward.id });
    expect(given.data.status).toBe('cash_given');
    const dialog = screen.getByRole('dialog');
    await expect(dialog.getByRole('heading', 'Did you receive 250 EGP cash from Sinai Tours?')).toBeVisible({ timeout: 10_000 });
    await shot(app, 'en-mobile-13-cash-question');
    await dialog.getByRole('button', 'Yes, I got it').tap();
    await expect(dialog.getByRole('heading', 'Confirmed. Enjoy your trip!')).toBeVisible();
    await shot(app, 'en-mobile-14-cash-confirmed');
    await dialog.getByRole('button', 'Done').tap();
    await expect(screen.getByRole('dialog')).toHaveCount(0);
    expect((await call('GET', `/v1/tourism/agency/redemptions/${option.reward.id}`, seed.verifiedLister)).data.status).toBe('confirmed');
  });

  test('QR screen in Arabic: the inviter signs in, gets cash and answers No', async ({ app, screen, browser }) => {
    await app.clearState(); // signed out: a fresh visitor
    await browser.setViewport(MOBILE);
    await app.open('/ar/trips/sign-in/?next=%2Far%2Ftrips%2Fqr%2F');
    await expect(screen.getByRole('heading', 'تسجيل الدخول', { level: 1 })).toBeVisible();
    await screen.getByLabel('الإيميل').fill(seed.inviter.email);
    await screen.getByLabel('كلمة السر').fill(PASSWORD);
    await screen.getByRole('button', 'تسجيل الدخول').tap();
    await expect(browser).toHaveURL('/ar/trips/qr/');
    expect(await browser.evaluate(() => document.documentElement.dir)).toBe('rtl');
    const qr = screen.getByRole('img', 'الـQR بتاعك');
    await expect(qr).toHaveAttribute('data-qr-token', /^5T\./);
    await shot(app, 'ar-mobile-15-qr');
    const scan = await call('POST', '/v1/tourism/agency/scan', seed.verifiedLister, { token: await qr.getAttribute('data-qr-token') });
    const option = scan.data.options.find((o: { reward: unknown }) => o.reward);
    await call('POST', '/v1/tourism/agency/redemptions', seed.verifiedLister, { scanId: scan.data.scanId, bookingId: option.booking.id, rewardId: option.reward.id });
    const dialog = screen.getByRole('dialog');
    await expect(dialog.getByRole('heading', /استلمت ٢٥٠ جنيه كاش من Sinai Tours؟/)).toBeVisible({ timeout: 10_000 });
    await shot(app, 'ar-mobile-16-cash-question');
    await dialog.getByRole('button', 'لأ، مستلمتش').tap();
    await expect(dialog.getByRole('heading', 'شكراً إنك قلتلنا. خرجني هيراجع مع Sinai Tours.')).toBeVisible();
    await shot(app, 'ar-mobile-17-cash-disputed');
    expect((await call('GET', `/v1/tourism/agency/redemptions/${option.reward.id}`, seed.verifiedLister)).data.status).toBe('disputed');
    await dialog.getByRole('button', 'تمام').tap();
    await screen.getByRole('link', 'ارجع للكاش بتاعي').tap();
    await expect(screen.getByText('قلت إنك مستلمتش. خرجني بيراجع مع Sinai Tours.')).toBeVisible();
    await expect(screen.getByText('١ من ٥ صحاب انضموا')).toBeVisible();
    await shot(app, 'ar-mobile-18-my-cash-invites');
  });

  test('Arabic browsing: list, trip page with seal, lister page', async ({ app, screen, browser }) => {
    await app.clearState();
    await browser.setViewport(DESKTOP);
    await app.open('/ar/trips/');
    await expect(screen.getByRole('heading', 'خرجني سوق مجاني', { level: 1 })).toBeVisible();
    expect(await browser.evaluate(() => document.documentElement.dir)).toBe('rtl');
    await screen.getByRole('searchbox', 'دوّر بالوجهة…').fill(stamp);
    await expect(screen.getByRole('article')).toHaveCount(2);
    await expect(screen.getByText('إعلان مجاني')).toBeVisible();
    await shot(app, 'ar-desktop-19-trips-list');
    await screen.getByRole('link', /هروب سيوة/).tap();
    await expect(screen.getByRole('heading', `هروب سيوة ${stamp}`, { level: 1 })).toBeVisible();
    await expect(screen.getByRole('button', 'سجّل دخول علشان تحجز')).toBeVisible();
    await shot(app, 'ar-desktop-20-monitored-trip');
    await screen.getByRole('link', /صفحة المنظّم: Sinai Tours/).tap();
    await expect(screen.getByRole('heading', /^Sinai Tours/, { level: 1 })).toBeVisible();
    await expect(screen.getByRole('heading', /^Sinai Tours/, { level: 1 }).getByRole('img', 'موثّق من خرجني')).toBeVisible();
    await expect(screen.getByRole('region', 'أرقام المنظّم')).toBeVisible();
    await shot(app, 'ar-desktop-21-lister');
    await browser.setViewport(MOBILE);
    await app.open(`/ar/trips/${seed.freeTrip.id}/`);
    await expect(screen.getByRole('note')).toContainText('مش تحت إشراف خرجني');
    await shot(app, 'ar-mobile-22-free-trip');
  });

  test('the customer cancels a booking from My trips', async ({ app, screen, browser }) => {
    await browser.setViewport(MOBILE);
    await openAs(app, browser, seed.friend.token, '/en/trips/me/');
    const booking = screen.getByRole('article', seed.freeTrip.title);
    await booking.getByRole('button', 'Cancel booking').tap();
    await booking.getByRole('button', 'Yes, cancel').tap();
    await expect(booking.getByText('Cancelled')).toBeVisible();
    await shot(app, 'en-mobile-23-booking-cancelled');
  });
});
