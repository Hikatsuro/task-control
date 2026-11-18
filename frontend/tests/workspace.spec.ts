import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function login(page: Page, id = 'u1') {
  await page.goto('/login');
  await page.locator(`input[name="profile"][value="${id}"]`).check();
  await page.getByRole('button', { name: 'Войти в рабочее пространство' }).click();
  await expect(page).toHaveURL(/\/app$/);
}

test('создание проекта и задачи, фильтры, сохранение после перезагрузки', async ({ page }) => {
  await login(page);
  await page.goto('/app/projects/new');
  await page.getByLabel('Название проекта').fill('Проверка полного сценария');
  await page.getByRole('combobox', { name: 'Заказчик', exact: true }).selectOption('c1');
  await page.locator('input[name="members"][value="u2"]').check();
  await page.getByRole('button', { name: 'Создать проект', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Проверка полного сценария' })).toBeVisible();
  await page.getByRole('link', { name: /Проверка полного сценария/ }).click();
  await page.getByRole('link', { name: 'Создать задачу' }).click();
  await page.getByLabel('Название', { exact: false }).fill('Сквозная задача для проверки');
  await page.getByLabel('Исполнитель').selectOption('u2');
  await page
    .getByLabel('Описание')
    .fill('Создано автоматической проверкой пользовательского сценария.');
  await page.getByRole('button', { name: 'Создать задачу', exact: true }).click();
  await page.getByRole('link', { name: 'Сквозная задача для проверки', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Сквозная задача для проверки', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Сквозная задача для проверки', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Взять в работу', exact: true }).click();
  await page.getByRole('button', { name: 'Отправить на проверку', exact: true }).click();
  await page.getByRole('button', { name: 'Принять работу', exact: true }).click();
  await expect(page.getByText('Результат принят руководителем.', { exact: true })).toBeVisible();
});
test('роль сотрудника: свои задачи, передача на проверку и отказ чужой карточке', async ({
  page,
}) => {
  await login(page, 'u2');
  await page.goto('/app/tasks/t1');
  await expect(page.getByRole('heading', { name: 'Нет доступа', exact: true })).toBeVisible();
  await page.goto('/app/tasks/t6');
  await page.getByRole('button', { name: 'Взять в работу', exact: true }).click();
  await page.getByRole('button', { name: 'Отправить на проверку', exact: true }).click();
  await expect(
    page.getByText('Результат ожидает проверки руководителя.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Принять работу', exact: true })).toHaveCount(0);
  await page.goto('/app/users');
  await expect(page.getByRole('heading', { name: 'Нет доступа', exact: true })).toBeVisible();
});
test('возврат, комментарий и локальное вложение', async ({ page }) => {
  await login(page);
  await page.goto('/app/tasks/t4');
  await page.getByRole('button', { name: 'Вернуть на доработку', exact: true }).click();
  await page.getByLabel('Причина возврата').fill('Добавить проверку обязательных полей.');
  await page.getByRole('dialog').getByRole('button', { name: 'Вернуть на доработку' }).click();
  await page.getByRole('button', { name: /Комментарии/ }).click();
  await page
    .getByLabel('Комментарий', { exact: true })
    .fill('Комментарий сохраняется после обновления страницы.');
  await page.getByRole('button', { name: 'Отправить комментарий' }).click();
  await expect(
    page.getByText('Комментарий сохраняется после обновления страницы.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Файлы ·/ }).click();
  await page.getByLabel('Добавить файл').setInputFiles({
    name: 'result.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('TaskControl attachment'),
  });
  await expect(page.getByText('result.txt', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: /Файлы ·/ }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать result.txt' }).click();
  expect((await download).suggestedFilename()).toBe('result.txt');
  await page.getByRole('link', { name: 'Вся история задачи', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'История задачи', exact: true })).toBeVisible();
  await expect(
    page.getByText(/На проверке → В работе\. Добавить проверку обязательных полей/),
  ).toBeVisible();
});
test('администратор создаёт и блокирует пользователя', async ({ page }) => {
  await login(page, 'u4');
  await page.goto('/app/users/new');
  await page.getByLabel('Отображаемое имя').fill('Тестовый участник');
  await page.getByRole('textbox', { name: 'Логин', exact: true }).fill('qa-member');
  await page.getByRole('textbox', { name: 'Почта', exact: true }).fill('qa@example.com');
  await page.getByRole('button', { name: 'Сохранить пользователя' }).click();
  const row = page.getByRole('row').filter({ hasText: 'Тестовый участник' });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Блокировать', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Подтвердить' }).click();
  await expect(row.getByText('Заблокирован', { exact: true })).toBeVisible();
  await page.goto('/login');
  await expect(page.getByText('Тестовый участник', { exact: true })).toHaveCount(0);
});
test('Excel выгружается, интеграции остаются демонстрационными', async ({ page }, testInfo) => {
  await login(page);
  await page.goto('/app/reports');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать Excel' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.xlsx$/);
  await file.saveAs(testInfo.outputPath('report.xlsx'));
  await page.goto('/app/billing/checkout');
  await page.getByRole('button', { name: 'Смоделировать успешную оплату' }).click();
  await expect(
    page.getByText('Демонстрационный тариф включён локально. Денежных списаний нет.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.goto('/app/assistant');
  await page.getByRole('button', { name: 'Какие задачи просрочены?' }).click();
  await expect(page.getByText('TaskControl · демосводка', { exact: true })).toBeVisible();
});
test('все рабочие страницы открываются без ошибок JavaScript', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page);
  for (const path of [
    '/app/projects',
    '/app/projects/p1',
    '/app/projects/p1?tab=about',
    '/app/projects/p1?tab=members',
    '/app/tasks',
    '/app/board',
    '/app/calendar',
    '/app/clients',
    '/app/clients/c1',
    '/app/team',
    '/app/team/u2',
    '/app/notifications',
    '/app/profile',
    '/app/profile/security',
    '/app/settings',
    '/app/settings/notifications',
    '/app/reports',
    '/app/assistant',
    '/app/forecast',
    '/app/billing',
    '/app/billing/checkout',
    '/app/help',
    '/app/help/roles',
    '/app/help/screens',
    '/app/help/states',
    '/app/help/components',
    '/app/help/requirements',
  ]) {
    await page.goto(path);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.getByText('Не удалось открыть страницу', { exact: true })).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('формы заказчика и отдела сохраняют изменения', async ({ page }) => {
  await login(page);
  await page.goto('/app/clients/new');
  await page
    .getByRole('textbox', { name: 'Название организации или Ф. И. О.', exact: true })
    .fill('Новый заказчик QA');
  await page
    .getByRole('textbox', { name: 'Электронная почта', exact: true })
    .fill('client@example.com');
  await page.getByRole('button', { name: 'Сохранить заказчика' }).click();
  await page.getByRole('link', { name: 'Новый заказчик QA', exact: true }).click();
  await page.getByRole('link', { name: 'Редактировать', exact: true }).click();
  await page.getByRole('textbox', { name: 'Контактное лицо', exact: true }).fill('Контакт QA');
  await page.getByRole('button', { name: 'Сохранить заказчика' }).click();
  await expect(page.getByText('Контакт QA', { exact: true })).toBeVisible();
  await login(page, 'u4');
  await page.goto('/app/departments/new');
  await page.getByRole('textbox', { name: 'Название', exact: true }).fill('Проектная группа QA');
  await page.locator('input[name="members"][value="u2"]').check();
  await page.getByRole('button', { name: 'Сохранить отдел' }).click();
  await expect(
    page.getByRole('heading', { name: 'Проектная группа QA', exact: true }),
  ).toBeVisible();
  await page.goto('/app/users');
  await expect(
    page
      .getByRole('row')
      .filter({ hasText: 'malisiousintenttttt' })
      .getByText('Проектная группа QA', { exact: true }),
  ).toBeVisible();
});

test('Kanban меняет статус перетаскиванием', async ({ page }) => {
  await login(page);
  await page.goto('/app/board');
  const handle = page.getByRole('button', {
    name: 'Переместить задачу «Подготовить AI-инструмент чтения задач»',
  });
  const source = await handle.boundingBox();
  const lane = page
    .locator('.board-lane')
    .filter({ has: page.getByRole('heading', { name: 'В работе', exact: true }) });
  const target = await lane.boundingBox();
  if (!source || !target) throw new Error('Карточка или колонка недоступна');
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(source.x + source.width / 2 + 12, source.y + source.height / 2, {
    steps: 3,
  });
  await page.mouse.move(target.x + target.width / 2, target.y + 80, { steps: 15 });
  await page.mouse.up();
  await expect(
    lane.getByRole('link', { name: 'Подготовить AI-инструмент чтения задач', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    lane.getByRole('link', { name: 'Подготовить AI-инструмент чтения задач', exact: true }),
  ).toBeVisible();
});

test('на узком экране нет прокрутки всего документа по горизонтали', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await login(page);
  for (const path of [
    '/',
    '/app',
    '/app/projects',
    '/app/tasks',
    '/app/board',
    '/app/calendar',
    '/app/tasks/t4',
    '/app/reports',
    '/app/assistant',
    '/app/help/screens',
  ]) {
    await page.goto(path);
    await expect(page.getByText('Не удалось открыть страницу', { exact: true })).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      path,
    ).toBe(true);
  }
  await page.goto('/app/projects');
  await page.getByRole('button', { name: 'Открыть меню' }).click();
  await page
    .getByRole('navigation', { name: 'Основная навигация' })
    .getByRole('link', { name: 'Задачи', exact: true })
    .click();
  await expect(page).toHaveURL(/\/app\/tasks$/);
});
