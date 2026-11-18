import { expect, test } from '@playwright/test';

test('поиск и фильтры сохраняются при переключении списка и доски', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Войти в рабочее пространство' }).click();
  await page.goto('/app/tasks');
  await page.getByRole('combobox', { name: 'Фильтр по проекту' }).selectOption('p1');
  await page.getByRole('combobox', { name: 'Фильтр по статусу' }).selectOption('new');
  await page.getByRole('textbox', { name: 'Поиск задачи' }).fill('AI-инструмент');
  await expect(page.locator('.task-table tbody tr')).toHaveCount(1);
  await page.getByRole('link', { name: 'Kanban', exact: true }).click();
  await expect(page.locator('.board-card')).toHaveCount(1);
  await expect(page.getByRole('textbox', { name: 'Поиск задачи' })).toHaveValue('AI-инструмент');
  await page.reload();
  await expect(page.locator('.board-card')).toHaveCount(1);
  await page.getByRole('link', { name: 'Список', exact: true }).click();
  await expect(page.locator('.task-table tbody tr')).toHaveCount(1);
  await expect(page.getByRole('combobox', { name: 'Фильтр по статусу' })).toHaveValue('new');
});
