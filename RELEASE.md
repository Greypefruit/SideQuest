# RELEASE.md — SideQuest

## Версия

**Release 1**

Внутренний MVP. Текущая активность зафиксирована как настольный теннис (`table_tennis`).

---

## Возможности

- **OTP авторизация** — вход по `email + одноразовый код` (TTL 10 минут, cooldown 30 секунд, до 5 попыток ввода). Профиль создаётся при первом успешном входе, новому пользователю назначается роль `player`.
- **Матчи** — создание завершённых обычных матчей со своим участием, валидация формата (BO1/BO3/BO5) и счёта, история матчей с поиском и пагинацией.
- **Elo рейтинг** — автоматический пересчёт рейтинга (K = 32) после обычных и турнирных матчей, общая таблица рейтинга, статистика игрока.
- **Турниры** — single-elimination: создание, регистрация/добавление участников, генерация сетки с сидингом и bye, ввод результатов, продвижение победителя, завершение и отмена.
- **Роли** — `player`, `organizer`, `admin` (ровно одна роль на пользователя).
- **Администрирование** — список пользователей, смена ролей, активация/деактивация, защита последнего активного администратора.

---

## Требования

- **Node.js** 20+
- **npm** 10+
- **MySQL** 8.4 (локально поднимается через Docker)
- **Docker** + Docker Compose (для локальной БД)
- **SMTP-сервер** (обязателен в production для доставки OTP; в dev есть fallback в консоль)

---

## Запуск (с нуля)

Все команды приложения выполняются из каталога `web/`. Docker Compose запускается из корня репозитория.

### 1. Поднять MySQL

Из корня репозитория:

```bash
docker compose up -d
```

Поднимется контейнер `sidequest-mysql` (MySQL 8.4) на порту `3307` хоста (→ `3306` в контейнере). Данные хранятся в volume `sidequest_mysql_data`.

### 2. Настроить переменные окружения

В каталоге `web/` создать `.env.local` на основе `.env.example`:

```bash
cd web
cp .env.example .env.local
```

Заполнить значения (см. раздел **ENV**). Как минимум: `DATABASE_URL` и `AUTH_SESSION_SECRET`.

### 3. Установить зависимости

```bash
cd web
npm install
```

### 4. Применить миграции

```bash
cd web
npx drizzle-kit migrate
```

### 5. Загрузить seed-данные (обязательно)

Приложению необходима запись активности `table_tennis` (иначе провижининг пользователя падает с ошибкой `Default activity type is missing`). Seed-файл не применяется `drizzle-kit migrate` автоматически — его нужно выполнить вручную.

Из корня репозитория:

```bash
docker compose exec -T mysql \
  mysql -usidequest -psidequest sidequest < web/drizzle-mysql/seeds/0000_seed_activity_types.sql
```

### 6. Запустить приложение

Разработка:

```bash
cd web
npm run dev
```

Production:

```bash
cd web
npm run build
npm run start
```

Приложение доступно на [http://localhost:3000](http://localhost:3000).

> В dev-режиме без настроенного SMTP код OTP выводится в консоль сервера (`[SideQuest OTP][dev fallback] <email>: <code>`).

---

## Миграции

Схема описана в `web/src/db/schema.ts`. Конфигурация — `web/drizzle.config.ts` (диалект `mysql`, выходной каталог `./drizzle-mysql`, читает `DATABASE_URL` из `.env.local`).

### Создать новую миграцию

После изменения схемы:

```bash
cd web
npx drizzle-kit generate
```

Будет создан новый SQL-файл и обновлён журнал в `drizzle-mysql/meta/`.

### Применить миграции

```bash
cd web
npx drizzle-kit migrate
```

### Просмотр данных (опционально)

```bash
cd web
npx drizzle-kit studio
```

> Правила проекта: схему менять только через миграции, не редактировать уже применённые миграции, не удалять историю миграций.

---

## ENV

Файл `web/.env.local`. Обязательные и опциональные переменные:

| Переменная | Обязательна | Назначение |
|---|---|---|
| `DATABASE_URL` | **Да** | Строка подключения MySQL. Локально: `mysql://sidequest:sidequest@localhost:3307/sidequest` |
| `AUTH_SESSION_SECRET` | **Да в production** | Секрет для подписи сессионного cookie (HMAC). В production отсутствие приводит к ошибке запуска; в dev используется временный dev-секрет |
| `SMTP_HOST` | Да в production | Хост SMTP-сервера для отправки OTP |
| `SMTP_PORT` | Да в production | Порт SMTP (целое положительное число) |
| `SMTP_SECURE` | Да в production | `true` или `false` |
| `SMTP_USER` | Да в production | Логин SMTP |
| `SMTP_PASSWORD` | Да в production | Пароль SMTP |
| `OTP_EMAIL_FROM` | Да в production | Адрес отправителя, напр. `"SideQuest <no-reply@example.com>"` |
| `OTP_EMAIL_REPLY_TO` | Нет | Reply-To адрес |

> Если SMTP-набор (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `OTP_EMAIL_FROM`) не задан полностью: в dev код OTP логируется в консоль, в production отправка письма завершается ошибкой. Секреты не хранить в коде и не коммитить в репозиторий.

### Внешние сервисы

- **MySQL** — основная база данных (локально через Docker).
- **SMTP-сервер** — доставка OTP-кодов по email (внешний почтовый сервис в production).

Других внешних сервисов Release 1 не использует.

---

## Резервное копирование (Backup)

Логический дамп через `mysqldump` в контейнере. Из корня репозитория:

```bash
docker compose exec -T mysql \
  mysqldump -usidequest -psidequest --databases sidequest \
  > sidequest_backup_$(date +%Y%m%d_%H%M%S).sql
```

Полный дамп (под root, со всеми объектами):

```bash
docker compose exec -T mysql \
  mysqldump -uroot -psidequest_root --databases sidequest \
  > sidequest_full_backup.sql
```

> Рекомендуется делать backup перед каждым деплоем и перед применением миграций. Файлы дампа содержат данные — хранить вне репозитория.

---

## Восстановление (Restore)

Восстановление из дампа в работающий контейнер MySQL. Из корня репозитория:

```bash
docker compose exec -T mysql \
  mysql -uroot -psidequest_root < sidequest_backup_YYYYMMDD_HHMMSS.sql
```

Если дамп не содержит `CREATE DATABASE`, сначала убедитесь, что база `sidequest` существует, и восстановите в неё:

```bash
docker compose exec -T mysql \
  mysql -usidequest -psidequest sidequest < sidequest_backup_YYYYMMDD_HHMMSS.sql
```

После восстановления проверьте, что присутствует seed-активность `table_tennis` (раздел «Запуск», шаг 5) и приложение поднимается.
