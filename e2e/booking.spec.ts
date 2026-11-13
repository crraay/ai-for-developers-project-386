import { test, expect } from '@playwright/test';

const API = 'http://localhost:8080';

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatDateInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function weekdayInTimeZone(dateString: string, timeZone: string): number {
  const value = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(new Date(`${dateString}T12:00:00`));
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[value];
}

function isWeekday(dateString: string): boolean {
  // The string is already a host-local calendar date; weekday is pure calendar
  // arithmetic, so no timezone conversion is involved.
  const [year, month, day] = dateString.split('-').map(Number);
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return dayOfWeek !== 0 && dayOfWeek !== 6;
}

/** Pure calendar arithmetic on a yyyy-mm-dd string (no timezones involved). */
function addDaysToDateString(dateString: string, days: number): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));
  return date.toISOString().slice(0, 10);
}

function lastWeekdayOnOrBefore(dateString: string): string {
  for (let offset = 0; offset < 7; offset++) {
    const candidate = addDaysToDateString(dateString, -offset);
    if (isWeekday(candidate)) {
      return candidate;
    }
  }
  /* c8 ignore next -- a 7-day look-back always finds a weekday */
  throw new Error(`no weekday on or before ${dateString}`);
}

function firstWeekdayAfter(dateString: string): string {
  for (let offset = 1; offset <= 7; offset++) {
    const candidate = addDaysToDateString(dateString, offset);
    if (isWeekday(candidate)) {
      return candidate;
    }
  }
  /* c8 ignore next -- a 7-day look-ahead always finds a weekday */
  throw new Error(`no weekday after ${dateString}`);
}

/**
 * Returns a future weekday (Mon-Fri) at least `minDays` out, formatted as
 * yyyy-mm-dd in the given IANA timezone. The booking horizon is 14 days, so
 * staying well inside it keeps the slot bookable.
 */
function futureWeekdayDate(timeZone: string, minDays = 2): string {
  let candidate = addDays(new Date(), minDays);
  while (true) {
    const formatted = formatDateInTimeZone(candidate, timeZone);
    const day = weekdayInTimeZone(formatted, timeZone);
    if (day !== 0 && day !== 6) {
      return formatted;
    }
    candidate = addDays(candidate, 1);
  }
}

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
  await expect(page.locator('app-home-page')).toBeVisible();
  await page.locator('a.cta').click();

  await expect(page.getByRole('heading', { name: 'Pick a time' })).toBeVisible();

  // Wait for the initial page load (booking types + slots for today) before
  // changing the date, otherwise the constructor may overwrite the input.
  await expect(
    page.locator('.slot-link').first().or(page.getByText('No available slots on this day.')),
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
  const firstSlot = page.locator('.slot-link').first();
  await expect(firstSlot).toBeVisible({ timeout: 10_000 });
  await expect(firstSlot).toHaveAttribute('href', new RegExp(bookingDay));
  await typeSelect.selectOption(quickChat.value);
  await expect(firstSlot).toHaveAttribute('href', new RegExp(`bookingTypeId=${quickChat.value}`));
  await firstSlot.click();

  await expect(page.getByRole('heading', { name: 'Confirm your booking' })).toBeVisible();
  await expect(page.locator('.summary')).toContainText('Quick chat (30 min)');

  // Back to the picker, then book the same slot with the 60-minute type: the
  // window on the confirm page follows the chosen type.
  await page.getByRole('link', { name: 'Pick another time' }).click();
  await expect(page.getByRole('heading', { name: 'Pick a time' })).toBeVisible();
  await expect(
    page.locator('.slot-link').first().or(page.getByText('No available slots on this day.')),
  ).toBeVisible({ timeout: 10_000 });

  await dayInput.fill(bookingDay);
  await dayInput.press('Tab');
  await expect(firstSlot).toBeVisible({ timeout: 10_000 });
  await expect(firstSlot).toHaveAttribute('href', new RegExp(bookingDay));

  await typeSelect.selectOption(deepDive.value);
  await expect(firstSlot).toHaveAttribute('href', new RegExp(`bookingTypeId=${deepDive.value}`));
  await firstSlot.click();

  await expect(page.getByRole('heading', { name: 'Confirm your booking' })).toBeVisible();
  await expect(page.locator('.summary')).toContainText('Deep dive (60 min)');
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
  const lastDay = addDaysToDateString(today, bookingHorizonDays);
  const lastWeekday = lastWeekdayOnOrBefore(lastDay);
  const firstDayBeyond = firstWeekdayAfter(lastDay);

  // The first day of the window is today and the last is exactly 14 calendar
  // days ahead — the picker must offer no more (issue #29).
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
  await expect(page.locator('.slot-link').first()).toBeVisible({ timeout: 10_000 });

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
