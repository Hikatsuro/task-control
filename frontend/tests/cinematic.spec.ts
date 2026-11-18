import { expect, test } from '@playwright/test';

test('the home page document story follows scrolling and can be reversed', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Как это работает' }).click();
  const story = page.locator('#process');
  await expect(story).toHaveAttribute('data-renderer', 'webgl', {
    timeout: 60000,
  });
  const nav = page.getByRole('navigation', { name: 'Этапы согласования документа' });
  await nav.getByRole('button', { name: /Результат/ }).click();
  await expect(page.locator('.cine-story')).toHaveAttribute('data-chapter', '5');
  await expect(async () =>
    expect(
      Number(await page.locator('.cine-visual canvas').getAttribute('data-scene-phase')),
    ).toBeGreaterThan(4.95),
  ).toPass();
  await nav.getByRole('button', { name: /Назначение/ }).click();
  await expect(page.getByRole('button', { name: 'Назначить', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Назначить', exact: true }).click();
  await expect(page.locator('.cine-story')).toHaveAttribute('data-chapter', '2');
  const beforeWheel = await page.evaluate(() => window.scrollY);
  await page.mouse.move(150, 400);
  await page.mouse.wheel(0, -3000);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(beforeWheel - 100);
  await expect(page.locator('.cine-story')).toHaveAttribute('data-chapter', /[01]/);
  await nav.getByRole('button', { name: /Начало/ }).click();
  await expect(page.locator('.cine-story')).toHaveAttribute('data-chapter', '0');
  await story.getByRole('link', { name: 'Для команды' }).click();
  await expect(page.locator('#team')).toBeInViewport();
});

test('the simplified mode keeps the document story usable', async ({ page }) => {
  await page.goto('/cinematic');
  await expect(page.locator('.cine-story')).toHaveAttribute('data-renderer', 'webgl', {
    timeout: 60000,
  });
  await page.getByRole('button', { name: 'Упрощённый вид', exact: true }).click();
  await expect(page.locator('.cine-story')).toHaveAttribute('data-renderer', 'simple', {
    timeout: 60000,
  });
  await page
    .getByRole('navigation', { name: 'Этапы согласования документа' })
    .getByRole('button', { name: /Проверка/ })
    .click();
  await page.getByRole('button', { name: 'Принять документ', exact: true }).click();
  await expect(page.locator('.cine-story')).toHaveAttribute('data-chapter', '4');
  await expect(page.getByRole('button', { name: 'Показать 3D', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Показать 3D', exact: true }).click();
  await expect(page.locator('.cine-story')).toHaveAttribute('data-renderer', 'webgl', {
    timeout: 60000,
  });
});
