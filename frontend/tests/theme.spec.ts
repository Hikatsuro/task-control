import { expect, test } from '@playwright/test';

async function openAppearance(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Войти в рабочее пространство' }).click();
  await page.goto('/app/settings');
  await expect(page.getByRole('heading', { name: 'Внешний вид', exact: true })).toBeVisible();
}

test('тема сохраняется, действует на всех маршрутах и синхронизируется между вкладками', async ({
  page,
  context,
}) => {
  await openAppearance(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('radio', { name: /Тёмная/ }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(21, 24, 19)');
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
  await expect(page.getByRole('radio', { name: /Тёмная/ })).toBeChecked();
  await page.reload();
  await expect(page.getByRole('radio', { name: /Тёмная/ })).toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem('taskcontrol.theme.v1'))).toBe('dark');

  const otherTab = await context.newPage();
  await otherTab.goto('/');
  await expect(otherTab.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(otherTab.locator('.landing-header')).toHaveCSS(
    'background-color',
    'rgb(34, 39, 31)',
  );
  await otherTab.goto('/login');
  await expect(otherTab.locator('.auth-page')).toHaveCSS('background-color', 'rgb(34, 39, 31)');

  await page.goto('/app/reports');
  await expect(page.locator('.panel').first()).toHaveCSS('background-color', 'rgb(34, 39, 31)');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.locator('html')).toHaveCSS('color', 'rgb(32, 35, 31)');
  await page.emulateMedia({ media: 'screen' });

  await page.goto('/app/settings');
  await page.getByRole('radio', { name: /Светлая/ }).check();
  await expect(otherTab.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(otherTab.locator('.auth-page')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.reload();
  await expect(page.getByRole('radio', { name: /Светлая/ })).toBeChecked();
  await otherTab.close();
});

test('запрет записи настройки не мешает сменить тему и показывает честное сообщение', async ({
  page,
}) => {
  await openAppearance(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'taskcontrol.theme.v1') throw new DOMException('Storage denied', 'SecurityError');
      original.call(this, key, value);
    };
  });
  await page.getByRole('radio', { name: /Тёмная/ }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByText(/Тема применена, но браузер не разрешил её сохранить/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole('radio', { name: /Светлая/ })).toBeChecked();
});

test('сохранённая тема применяется ещё до загрузки React', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('taskcontrol.theme.v1', 'dark'));
  await page.route(/\/src\/main\.tsx(?:\?.*)?$/, (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('#root')).toBeEmpty();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#151813');
});
