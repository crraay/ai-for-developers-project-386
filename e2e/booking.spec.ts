import { test, expect } from '@playwright/test';

/**
 * Returns a future weekday (Mon-Fri) at least `minDays` out, formatted as
 * yyyy-mm-dd in the host timezone (Europe/Berlin). The booking horizon is
 * 14 days, so staying well inside it keeps the slot bookable.
 */
function futureWeekdayDate(minDays = 2): string {
  const timeZone = 'Europe/Berlin';
  const now = new Date();
  let candidate = new Date(now.getTime() + minDays * 24 * 60 * 60 * 1000);
  while (candidate.getDay() === 0 || candidate.getDay() === 6) {
    candidate = new Date(candidate.getTime() + 24 * 60 * 60 * 1000);
  }
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(candidate);
}

test('guest books a slot and the host sees it', async ({ page }) => {
  test.setTimeout(60_000);

  const guestName = 'Ada Lovelace';
  const guestEmail = 'ada@example.com';

  await page.goto('/');
  await expect(page.locator('app-home-page')).toBeVisible();
  await page.locator('a.cta').click();

  await expect(page.getByRole('heading', { name: 'Pick a time' })).toBeVisible();

  // Pick a future weekday so slots are available.
  const dayInput = page.getByLabel('Day');
  await dayInput.fill(futureWeekdayDate());
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
