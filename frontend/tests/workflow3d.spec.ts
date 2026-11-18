import { expect, test } from '@playwright/test';

test('3D workflow supports scroll, stage buttons, review and rework', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/workflow#process');
  const scene = page.locator('#process');
  await expect
    .poll(() => scene.evaluate((element) => Math.round(element.getBoundingClientRect().top)))
    .toBe(0);
  await expect(scene.locator('.workflow-viewport')).toHaveAttribute('data-renderer', 'webgl', {
    timeout: 30000,
  });
  await expect(scene.locator('canvas')).toBeVisible();
  await scene.getByRole('button', { name: /Проверка/ }).click();
  await expect(
    scene.getByRole('heading', { name: 'Результат возвращается на проверку.' }),
  ).toBeVisible();
  await scene.getByRole('button', { name: 'Показать возврат на доработку' }).click();
  await expect(scene).toHaveAttribute('data-rework', 'true');
  await expect(scene.getByText('На доработке', { exact: true })).toBeVisible();
  await scene.getByRole('button', { name: 'Снова на проверку' }).click();
  await expect(scene).toHaveAttribute('data-rework', 'false');
  await scene.getByRole('button', { name: /04 Приёмка/ }).click();
  await expect(scene.getByRole('heading', { name: 'Готово — после приёмки.' })).toBeVisible();
  await scene.getByRole('button', { name: /Назначение/ }).click();
  await expect(scene).toHaveAttribute('data-stage', '0');
  await expect
    .poll(() => scene.evaluate((element) => Math.round(element.getBoundingClientRect().top)))
    .toBe(0);
  await page.mouse.wheel(0, 800);
  await expect(scene).not.toHaveAttribute('data-stage', '0');
  expect(errors).toEqual([]);
});

test('compact reduced-motion workflow and simplified view stay usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/workflow');
  const scene = page.locator('#process');
  await scene.getByRole('button', { name: /04 Приёмка/ }).click();
  await expect(scene.getByRole('heading', { name: 'Готово — после приёмки.' })).toBeVisible();
  await scene.getByRole('button', { name: 'Упрощённый вид' }).click();
  await expect(scene.locator('canvas')).toHaveCount(0);
  await expect(scene.getByLabel('Схема движения задачи')).toBeVisible();
  await scene.getByRole('button', { name: /Проверка/ }).click();
  await scene.getByRole('button', { name: 'Показать возврат на доработку' }).click();
  await expect(scene).toHaveAttribute('data-rework', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await scene.getByRole('button', { name: 'Показать 3D' }).click();
  await expect(scene.locator('canvas')).toBeVisible();
});

test('the previous workflow remains usable when model requests fail', async ({ page }) => {
  await page.route('**/models/people-local/*.glb', (route) =>
    route.fulfill({ status: 404, body: 'Missing local model' }),
  );
  await page.goto('/workflow#process');
  const scene = page.locator('#process');
  await expect(scene.locator('.workflow-viewport')).toHaveAttribute(
    'data-renderer',
    /simple|webgl/,
    {
      timeout: 30000,
    },
  );
  await scene.getByRole('button', { name: /02 Выполнение/ }).click();
  await expect(scene.getByRole('heading', { name: 'Контекст остаётся рядом.' })).toBeVisible();
});
