import { test, expect } from '@playwright/test';

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

test('guest books a slot and the host sees it', async ({ page }) => {
  test.setTimeout(60_000);

  const guestName = 'Ada Lovelace';
  const guestEmail = 'ada@example.com';

  // Fetch the host timezone so the test date is interpreted the same way the
  // UI and server do.
  const settingsResponse = await page.request.get('http://localhost:8080/api/host-settings');
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

  // Pick a future weekday so slots are available.
  const dayInput = page.getByLabel('Day');
  await dayInput.fill(futureWeekdayDate(hostTimeZone));
  await dayInput.press('Tab');

  // Wait for slots to load and click the first available start time.
  const firstSlot = page.locator('.slot-link').first();
  await expect(firstSlot).toBeVisible({ timeout: 10_000 });
  await firstSlot.click();

  await expect(page.getByRole('heading', { name: 'Confirm your booking' })).toBeVisible();

  await page.getByLabel('Your name').fill(guestName);
  await page.getByLabel('Your email').fill(guestEmail);
  await page.getByRole('button', { name: 'Confirm booking' }).click();

  // Success lands on the secret booking page.
  await expect(page).toHaveURL(/\/booking\/[A-Za-z0-9_-]+/);
  await expect(page.getByText(guestName)).toBeVisible();
  await expect(page.getByText('Confirmed')).toBeVisible();

  // The same booking appears in the unauthenticated host view.
  await page.goto('/host');
  await expect(page.getByRole('heading', { name: 'Upcoming bookings' })).toBeVisible();
  await expect(page.getByRole('cell', { name: guestName, exact: true }).first()).toBeVisible();
  await expect(page.getByRole('cell', { name: guestEmail, exact: true }).first()).toBeVisible();
});
