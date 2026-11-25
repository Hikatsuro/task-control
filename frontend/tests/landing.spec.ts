import { expect, test } from '@playwright/test';

// The home page explains the task path with a card carousel.
test('the home page task path carousel scrolls both ways', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'О системе' })
    .getByRole('link', { name: 'Как это работает' })
    .click();
  const section = page.locator('#process');
  await expect(section).toBeInViewport();
  await expect(section.getByRole('listitem')).toHaveCount(6);
  const track = section.locator('#process-track');
  const previous = section.getByRole('button', { name: 'Предыдущий этап' });
  const next = section.getByRole('button', { name: 'Следующий этап' });
  await expect(previous).toBeDisabled();
  await next.click();
  await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
  await expect(previous).toBeEnabled();
  await previous.click();
  await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeLessThan(5);
});
