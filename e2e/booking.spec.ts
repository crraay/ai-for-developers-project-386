import { test, expect } from '@playwright/test';

import {
  addDaysToDateString,
  firstWeekdayAfter,
  formatDateInTimeZone,
  futureWeekdayDate,
  lastWeekdayOnOrBefore,
} from './dates';

const API = 'http://localhost:8080';

test('guest books a chosen meeting type and the host sees it', async ({ page }) => {
  test.setTimeout(60_000);

  const guestName = 'Ada Lovelace';
  const guestEmail = 'ada@example.com';

  // Fetch the host timezone so the test date is interpreted the same way the
  // UI and server do.
  const settingsResponse = await page.request.get(`${API}/api/host-settings`);
  expect(settingsResponse.ok()).toBeTruthy();
  const { timezone: hostTimeZone } = await settingsResponse.json();

  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Book a call, no account needed' }),
  ).toBeVisible();
  await page.locator('.home-page__cta').click();

  await expect(page.getByRole('heading', { name: 'Pick a time' })).toBeVisible();

  // Wait for the initial page load (booking types + slots for today) before
  // changing the date, otherwise the constructor may overwrite the input.
  await expect(
    page.locator('.book-page__slot-link').first().or(page.getByText('No available slots on this day.')),
  ).toBeVisible({ timeout: 10_000 });

  // Two seeded booking types of different durations are offered, and the guest
  // picks one instead of a bare duration (issue #28).
  const typeSelect = page.getByLabel('Booking type');
  const typeOptions = await typeSelect
    .locator('option')
    .evaluateAll((elements) =>
      elements.map((element) => ({
        value: element.value,
        text: (element.textContent ?? '').trim(),
      })),
    );
  expect(typeOptions).toHaveLength(2);
  const quickChat = typeOptions.find((option) => option.text.includes('Quick chat'));
  const deepDive = typeOptions.find((option) => option.text.includes('Deep dive'));
  expect(quickChat?.text).toContain('30 min');
  expect(deepDive?.text).toContain('60 min');
  expect(deepDive).toBeDefined();
  if (!quickChat || !deepDive) {
    throw new Error('seeded booking types are missing');
  }

  // Pick a future weekday so slots are available.
  const bookingDay = futureWeekdayDate(hostTimeZone);
  const dayInput = page.getByLabel('Day');
  await dayInput.fill(bookingDay);
  await dayInput.press('Tab');

  // Preview the 30-minute type on a slot: the confirm page must show that
  // type's title and derived duration, not a generic booking. Wait for the
  // chosen day to land in the hrefs so a stale slot from another day is never
  // clicked.
  const firstSlot = page.locator('.book-page__slot-link').first();
  await expect(firstSlot).toBeVisible({ timeout: 10_000 });
  await expect(firstSlot).toHaveAttribute('href', new RegExp(bookingDay));
  await typeSelect.selectOption(quickChat.value);
  await expect(firstSlot).toHaveAttribute('href', new RegExp(`bookingTypeId=${quickChat.value}`));
  await firstSlot.click();

  await expect(page.getByRole('heading', { name: 'Confirm your booking' })).toBeVisible();
  await expect(page.locator('.book-form-page__summary')).toContainText('Quick chat (30 min)');

  // Back to the picker, then book the same slot with the 60-minute type: the
  // window on the confirm page follows the chosen type.
  await page.getByRole('link', { name: 'Pick another time' }).click();
  await expect(page.getByRole('heading', { name: 'Pick a time' })).toBeVisible();
  await expect(
    page.locator('.book-page__slot-link').first().or(page.getByText('No available slots on this day.')),
  ).toBeVisible({ timeout: 10_000 });

  await dayInput.fill(bookingDay);
  await dayInput.press('Tab');
  await expect(firstSlot).toBeVisible({ timeout: 10_000 });
  await expect(firstSlot).toHaveAttribute('href', new RegExp(bookingDay));

  await typeSelect.selectOption(deepDive.value);
  await expect(firstSlot).toHaveAttribute('href', new RegExp(`bookingTypeId=${deepDive.value}`));
  await firstSlot.click();

  await expect(page.getByRole('heading', { name: 'Confirm your booking' })).toBeVisible();
  await expect(page.locator('.book-form-page__summary')).toContainText('Deep dive (60 min)');
  await expect(page.getByText('A longer conversation for a deeper talk.')).toBeVisible();

  await page.getByLabel('Your name').fill(guestName);
  await page.getByLabel('Your email').fill(guestEmail);
  await page.getByRole('button', { name: 'Confirm booking' }).click();

  // Success lands on the secret booking page.
  await expect(page).toHaveURL(/\/booking\/[A-Za-z0-9_-]+/);
  await expect(page.getByText(guestName)).toBeVisible();
  await expect(page.getByText('Confirmed')).toBeVisible();

  // The same booking appears in the unauthenticated host view, carrying the
  // type the guest chose.
  await page.goto('/host');
  await expect(page.getByRole('heading', { name: 'Upcoming bookings' })).toBeVisible();
  await expect(page.getByRole('cell', { name: guestName, exact: true }).first()).toBeVisible();
  await expect(page.getByRole('cell', { name: guestEmail, exact: true }).first()).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Deep dive', exact: true }).first()).toBeVisible();
});

test('the booking window is exactly the first 14 calendar days', async ({ page }) => {
  test.setTimeout(60_000);

  const settingsResponse = await page.request.get(`${API}/api/host-settings`);
  expect(settingsResponse.ok()).toBeTruthy();
  const { timezone: hostTimeZone, bookingHorizonDays } = await settingsResponse.json();
  expect(bookingHorizonDays).toBe(14);

  const typesResponse = await page.request.get(`${API}/api/booking-types`);
  expect(typesResponse.ok()).toBeTruthy();
  const types = await typesResponse.json();
  const typeId = types[0].id;

  const today = formatDateInTimeZone(new Date(), hostTimeZone);
  // The window is 14 calendar days including today: the last selectable date is
  // today + 13, i.e. bookingHorizonDays - 1 days ahead (issue #29, review
  // follow-up: today is day 1).
  const lastDay = addDaysToDateString(today, bookingHorizonDays - 1);
  const lastWeekday = lastWeekdayOnOrBefore(lastDay);
  const firstDayBeyond = firstWeekdayAfter(lastDay);

  // The first day of the window is today and the last is the 14th calendar
  // day — the picker must offer no more (issue #29).
  await page.goto('/book');
  const dayInput = page.getByLabel('Day');
  await expect(dayInput).toHaveAttribute('min', today);
  await expect(dayInput).toHaveAttribute('max', lastDay);

  // The last day of the window still offers slots (it is always a future
  // weekday once rounded down, so the seeded windows apply).
  const lastDayResponse = await page.request.get(
    `${API}/api/slots?date=${lastWeekday}&bookingTypeId=${typeId}`,
  );
  expect(lastDayResponse.ok()).toBeTruthy();
  const lastDayStarts = await lastDayResponse.json();
  expect(lastDayStarts.length).toBeGreaterThan(0);

  await dayInput.fill(lastWeekday);
  await dayInput.press('Tab');
  await expect(page.locator('.book-page__slot-link').first()).toBeVisible({ timeout: 10_000 });

  // ...and it is bookable, not just browsable: the very last day of the
  // window accepts a booking with 201.
  const lastDayBooking = await page.request.post(`${API}/api/bookings`, {
    data: {
      start: lastDayStarts[0],
      bookingTypeId: typeId,
      guestName: 'Vera Horizon',
      guestEmail: 'vera@example.com',
    },
  });
  expect(lastDayBooking.status()).toBe(201);

  // The first day of the window is served rather than rejected. Whether it
  // shows slots depends on the time of day (1-hour notice), so the status
  // code is the assertion.
  const firstDayResponse = await page.request.get(
    `${API}/api/slots?date=${today}&bookingTypeId=${typeId}`,
  );
  expect(firstDayResponse.ok()).toBeTruthy();
  expect(Array.isArray(await firstDayResponse.json())).toBeTruthy();

  // A weekday past the window offers nothing: the server filters it out...
  const beyondResponse = await page.request.get(
    `${API}/api/slots?date=${firstDayBeyond}&bookingTypeId=${typeId}`,
  );
  expect(beyondResponse.ok()).toBeTruthy();
  expect(await beyondResponse.json()).toEqual([]);

  // ...the picker shows it as empty...
  await dayInput.fill(firstDayBeyond);
  await dayInput.press('Tab');
  await expect(page.getByText('No available slots on this day.')).toBeVisible({ timeout: 10_000 });

  // ...and a booking starting past the horizon is refused outright with 409,
  // even though every other rule (grid, notice, availability) would accept it.
  const lastSlot = new Date(lastDayStarts[lastDayStarts.length - 1]);
  const beyondHorizonStart = new Date(lastSlot.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString();
  const postResponse = await page.request.post(`${API}/api/bookings`, {
    data: {
      start: beyondHorizonStart,
      bookingTypeId: typeId,
      guestName: 'Nobody Beyond',
      guestEmail: 'beyond@example.com',
    },
  });
  expect(postResponse.status()).toBe(409);
});

test('a second guest racing for the same slot is refused and one booking survives', async ({
  page,
}) => {
  test.setTimeout(60_000);

  const settingsResponse = await page.request.get(`${API}/api/host-settings`);
  expect(settingsResponse.ok()).toBeTruthy();
  const { timezone: hostTimeZone } = await settingsResponse.json();
  const types = await (await page.request.get(`${API}/api/booking-types`)).json();
  const typeId = types[0].id;
  const bookingDay = futureWeekdayDate(hostTimeZone);

  // Take the slot exactly where a guest meets it: off the picker's own link.
  await page.goto('/book');
  await expect(page.getByRole('heading', { name: 'Pick a time' })).toBeVisible();
  const dayInput = page.getByLabel('Day');
  await dayInput.fill(bookingDay);
  await dayInput.press('Tab');
  const slotLink = page.locator('.book-page__slot-link').first();
  await expect(slotLink).toBeVisible({ timeout: 10_000 });
  // Wait for the chosen day to land in the hrefs so a stale slot from the default day is
  // never taken for the racing booking.
  await expect(slotLink).toHaveAttribute('href', new RegExp(bookingDay));
  const href = (await slotLink.getAttribute('href')) ?? '';
  const start = decodeURIComponent(href.split('?')[0].replace('/book/', ''));

  // Guest A takes it against the real server.
  const first = await page.request.post(`${API}/api/bookings`, {
    data: {
      start,
      bookingTypeId: typeId,
      guestName: 'Ada First',
      guestEmail: 'first@example.com',
    },
  });
  expect(first.status()).toBe(201);

  // Guest B opens the confirm page for the very same slot and submits through the UI —
  // the race the backend tests cover, now exercised through the browser (review gap).
  await page.goto(href);
  await expect(page.getByRole('heading', { name: 'Confirm your booking' })).toBeVisible();
  await page.getByLabel('Your name').fill('Ada Second');
  await page.getByLabel('Your email').fill('second@example.com');
  await page.getByRole('button', { name: 'Confirm booking' }).click();

  // The loser is told what happened instead of failing silently...
  await expect(page.getByRole('alert')).toContainText(/no longer available/i);

  // ...and the server still holds exactly one booking for that interval.
  const bookings = await (await page.request.get(`${API}/api/bookings`)).json();
  const sameSlot = bookings.filter((booking: { start: string }) => booking.start === start);
  expect(sameSlot).toHaveLength(1);
  expect(sameSlot[0].guestEmail).toBe('first@example.com');
});

test.describe('guest whose calendar leads the host (issue #1)', () => {
  test('the picker sends its own zone and offers only that calendar day', async ({ page }) => {
    test.setTimeout(60_000);

    // Auckland is 10-12 hours ahead of Berlin in every DST combination, so its calendar day
    // closes while the host's 09:00-17:00 window still has hours left. Playwright's `timeZone`
    // context option is not honoured by the bundled Chromium in this setup (the page keeps the
    // host's zone - verified), so pin the guest's zone the way Playwright would have done it
    // internally: CDP emulation. The browser then reports Auckland from `Intl` for real, and the
    // server does the actual work - no API response is faked.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTimezoneOverride', { timezoneId: 'Pacific/Auckland' });

    const settingsResponse = await page.request.get(`${API}/api/host-settings`);
    expect(settingsResponse.ok()).toBeTruthy();
    const { timezone: hostTimeZone, bookingHorizonDays } = await settingsResponse.json();
    const types = await (await page.request.get(`${API}/api/booking-types`)).json();
    const typeId = types[0].id;
    const bookingDay = futureWeekdayDate(hostTimeZone);

    const requestedZones: Array<string | null> = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/slots')) {
        requestedZones.push(new URL(request.url()).searchParams.get('timeZone'));
      }
    });

    await page.goto('/book');
    await expect(page.getByRole('heading', { name: 'Pick a time' })).toBeVisible();

    // The window is the host's, whatever zone the browser reports: 14 host-local days.
    const today = formatDateInTimeZone(new Date(), hostTimeZone);
    const lastDay = addDaysToDateString(today, bookingHorizonDays - 1);
    const dayInput = page.getByLabel('Day');
    await expect(dayInput).toHaveAttribute('min', today);
    await expect(dayInput).toHaveAttribute('max', lastDay);

    await dayInput.fill(bookingDay);
    await dayInput.press('Tab');
    const slotLinks = page.locator('.book-page__slot-link');
    await expect(slotLinks.first()).toBeVisible({ timeout: 10_000 });
    // Wait for the chosen day to land in the hrefs so slots from the default day are never
    // judged against this date.
    await expect(slotLinks.first()).toHaveAttribute('href', new RegExp(bookingDay));
    expect(requestedZones).toContain('Pacific/Auckland');

    // Every start offered under the picked date falls on that date in the guest's calendar...
    const hrefs = await slotLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute('href') ?? ''),
    );
    const guestStarts = hrefs.map((href) =>
      new Date(decodeURIComponent(href.split('?')[0].replace('/book/', ''))),
    );
    expect(guestStarts.length).toBeGreaterThan(0);
    guestStarts.forEach((start) =>
      expect(formatDateInTimeZone(start, 'Pacific/Auckland')).toBe(bookingDay),
    );

    // ...while the host-local answer for the same date runs past the guest's midnight — the
    // wrong-day times issue #1 reports — so API and browser no longer claim the same day.
    const hostDayResponse = await page.request.get(
      `${API}/api/slots?date=${bookingDay}&bookingTypeId=${typeId}`,
    );
    expect(hostDayResponse.ok()).toBeTruthy();
    const hostStarts = await hostDayResponse.json();
    expect(hostStarts.length).toBeGreaterThan(0);
    const lastHostStart = new Date(hostStarts[hostStarts.length - 1]);
    expect(formatDateInTimeZone(lastHostStart, 'Pacific/Auckland')).not.toBe(bookingDay);
  });
});
