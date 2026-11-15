import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { futureWeekdayDate } from './dates';

const API = 'http://localhost:8080';

/**
 * Accessibility gate (ADR-0009): Angular's template lint rules disappeared with
 * the migration, so the browser suite scans the rendered pages instead. Every
 * assertion runs against the real stack — no fixtures, no mocking.
 */
async function expectNoViolations(page: import('@playwright/test').Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const summary = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.map((node) => node.target.join(' ')),
  }));
  expect(summary).toEqual([]);
}

test('the landing page has no accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Book a call, no account needed' })).toBeVisible();

  await expectNoViolations(page);
});

test('the guest slot picker has no accessibility violations', async ({ page }) => {
  await page.goto('/book');
  await expect(page.getByRole('heading', { name: 'Pick a time' })).toBeVisible();
  await expect(
    page.locator('.book-page__slot-link').first().or(page.getByText('No available slots on this day.')),
  ).toBeVisible({ timeout: 10_000 });

  await expectNoViolations(page);
});

test('the confirm page has no accessibility violations', async ({ page }) => {
  const settingsResponse = await page.request.get(`${API}/api/host-settings`);
  const { timezone: hostTimeZone } = await settingsResponse.json();

  await page.goto('/book');
  await expect(page.getByRole('heading', { name: 'Pick a time' })).toBeVisible();
  const dayInput = page.getByLabel('Day');
  await dayInput.fill(futureWeekdayDate(hostTimeZone));
  await dayInput.press('Tab');

  const firstSlot = page.locator('.book-page__slot-link').first();
  await expect(firstSlot).toBeVisible({ timeout: 10_000 });

  await page.goto((await firstSlot.getAttribute('href')) ?? '/book');
  await expect(page.getByRole('heading', { name: 'Confirm your booking' })).toBeVisible();

  await expectNoViolations(page);
});

test('the host bookings page has no accessibility violations', async ({ page }) => {
  await page.goto('/host');
  await expect(page.getByRole('heading', { name: 'Upcoming bookings' })).toBeVisible();

  await expectNoViolations(page);
});

test('the host booking types page has no accessibility violations', async ({ page }) => {
  await page.goto('/host/booking-types');
  await expect(page.getByRole('heading', { name: 'Booking types' })).toBeVisible();

  await expectNoViolations(page);
});
