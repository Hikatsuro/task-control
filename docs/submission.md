# Сдача Milestone 1

## Что добавить до публикации

- Подтвердить роли и исправить их в README, презентации, Ганте и задачах при необходимости.
- Указать контакт тимлида на слайде и в README. Если будете публиковать репозиторий открыто, используйте контакт, который можно показывать публично.
- Получить GitHub-логины участников и преподавателя. Уточнить время сдачи и даты остальных этапов.

## Репозиторий

1. Создать репозиторий `task-control` в аккаунте команды или тимлида. Для работы с Git ниже оставьте новый репозиторий пустым.
2. Распаковать архив и открыть терминал **внутри** папки `task-control-milestone-1`.
3. Выполнить команды и подставить владельца репозитория в URL. Если Git запросит имя и почту для коммита, настроить их для этого репозитория.

```bash
git init -b main
git add .
git commit -m "Add Milestone 1 project materials"
git remote add origin https://github.com/OWNER/task-control.git
git push -u origin main
git switch -c dev
git push -u origin dev
```

4. В **Settings → Collaborators** пригласить участников и преподавателя. Попросить принять приглашение. Проверить доступ к приватному репозиторию с другого аккаунта.
5. Договориться, кто из команды что правит. Каждый участник делает свой осмысленный коммит или PR и обновляет назначенные ему задачи.

## Трекер и ссылки

1. Создать GitHub Project с колонками Todo, In Progress и Done. Проверить, что преподаватель видит сам Project.
2. Перенести B1–B8 из `docs/milestone-2-issues.md` в Issues, назначить исполнителей и добавить в Project. Вставить ссылку на Project в README.
3. Сдать **три ссылки**: репозиторий, GitHub Project, `docs/gantt.pdf` в репозитории. Презентация `docs/milestone-1-pitch.pdf` уже лежит в `docs/`.
4. Прогнать выступление 5–7 минут. Подготовить ответы на вопросы о данных для модели, оплате и ролях.

[Приглашение в репозиторий](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/inviting-collaborators-to-a-personal-repository) · [Доступ к GitHub Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/managing-your-project/managing-access-to-your-projects)
