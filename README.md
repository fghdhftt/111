# Проверка контрагента для Bitrix24 CRM

Приложение для Bitrix24 CRM: проверка контрагентов по ИНН через [Checko API](https://checko.ru/integration/api), AI-анализ рисков через [VibeCode AI Router](https://vibecode.bitrix24.tech) и отображение результатов во вкладке карточки **сделки** и **лида**.

## Возможности

- Вкладка **«Проверка контрагента»** в карточках CRM (сделка, лид)
- Получение данных из Checko: реквизиты, финансы, судебные дела, исполнительные производства
- AI-анализ через модель `bitrix/google/gemma-4-26B-A4B-it`
- Кнопка **«Проверить контрагента»** для ручного запуска проверки
- Сохранение результата в пользовательское поле CRM
- Запись в таймлайн сделки/лида
- Кэширование результата на 24 часа

## Структура проекта

```
/
├── backend/          # Node.js + Express API
├── frontend/         # React + TypeScript виджет вкладки CRM
├── shared/           # Общие типы и константы
├── bitrix-app/       # Манифест локального приложения
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Требования

- Node.js 20+
- Docker и Docker Compose (для деплоя)
- Аккаунт [Checko](https://checko.ru) с API-ключом
- Аккаунт [Bitrix24 VibeCode](https://vibecode.bitrix24.tech)
- Портал Bitrix24 с правами на установку REST-приложений

## Переменные окружения

Скопируйте `.env.example` в `.env` и заполните значения:

| Переменная | Описание |
|---|---|
| `CHECKO_API_KEY` | API-ключ Checko |
| `VIBECODE_API_KEY` | API-ключ VibeCode (`vibe_api_…`) для AI Router |
| `APP_URL` | Публичный URL приложения после деплоя |
| `BITRIX_CLIENT_ID` | Client ID OAuth-приложения Bitrix24 |
| `BITRIX_CLIENT_SECRET` | Client Secret OAuth-приложения |
| `BITRIX_INN_FIELD_DEAL` | Поле ИНН в сделке (по умолчанию `UF_CRM_INN`) |
| `BITRIX_INN_FIELD_LEAD` | Поле ИНН в лиде |
| `BITRIX_RESULT_FIELD_DEAL` | Поле для JSON-результата в сделке |
| `BITRIX_RESULT_FIELD_LEAD` | Поле для JSON-результата в лиде |
| `CACHE_TTL_HOURS` | Время жизни кэша (по умолчанию 24) |

> **Безопасность:** не храните ключи в коде. Используйте только `.env` или секреты платформы деплоя. Если ключи были опубликованы — перевыпустите их.

> **VibeCode:** для встраивания вкладки в интерфейс Bitrix24 нужен ключ авторизации `vibe_app_…` (раздел «Ключи авторизации»). Ключ `vibe_api_…` используется для AI Router и серверных вызовов API.

## Локальная разработка

```bash
# Установка зависимостей
npm install

# Сборка shared
npm run build -w shared

# Запуск backend + frontend
npm run dev
```

- Backend: `http://localhost:3000`
- Frontend (dev): `http://localhost:5173`

## Сборка

```bash
npm run build
npm start
```

## Деплой через Docker

```bash
cp .env.example .env
# отредактируйте .env

docker compose up -d --build
```

Проверка: `GET /api/health`

## Деплой в VibeCode

1. Войдите в [кабинет VibeCode](https://vibecode.bitrix24.tech).
2. Создайте сервер и получите URL вида `https://app-xxx.vibecode.bitrix24.tech`.
3. Укажите этот URL в `APP_URL` в `.env`.
4. Загрузите проект и выполните деплой:

```bash
# Пример (уточните ID сервера в кабинете VibeCode)
curl -X POST "https://vibecode.bitrix24.tech/v1/infra/servers/{SERVER_ID}/deploy" \
  -H "Authorization: Bearer YOUR_VIBECODE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"source":"git","repository":"YOUR_REPO_URL"}'
```

Документация платформы: `https://vibecode.bitrix24.tech/v1/me`

## Установка в Bitrix24

### 1. Создайте локальное приложение

1. Bitrix24 → **Разработчикам** → **Другое** → **Локальное приложение**.
2. Тип: **Серверное**, с использованием REST API.
3. Включите scope: `crm`, `placement`.
4. **Путь вашего обработчика:** `{APP_URL}/placement/`
5. **Путь для первоначальной установки:** `{APP_URL}/install/`
6. Скопируйте `client_id` и `client_secret` в `.env`.

### 2. Установите приложение на портал

Откройте `{APP_URL}/install/authorize` — пройдёт OAuth и автоматически зарегистрируются вкладки:

- `CRM_DEAL_DETAIL_TAB` — «Проверка контрагента»
- `CRM_LEAD_DETAIL_TAB` — «Проверка контрагента»

### 3. Настройте поле ИНН в CRM

Создайте пользовательское поле **ИНН** в сделках и лидах (или укажите существующее поле в `.env`).

При установке приложение попытается создать поле `UF_CRM_CHECKO_RESULT` для хранения JSON-результата.

## Использование

1. Откройте карточку сделки или лида.
2. Перейдите на вкладку **«Проверка контрагента»**.
3. Убедитесь, что в карточке заполнен **ИНН**.
4. Нажмите **«Проверить контрагента»**.

Приложение:

1. Прочитает ИНН из поля CRM
2. Запросит данные в Checko (компания, финансы, суды, ФССП)
3. Выполнит AI-анализ через VibeCode
4. Обновит вкладку
5. Сохранит результат в пользовательское поле
6. Добавит запись в таймлайн

## API Backend

### `POST /api/check`

Запуск проверки контрагента.

```json
{
  "entityType": "deal",
  "entityId": 123,
  "forceRefresh": true,
  "auth": {
    "domain": "your-portal.bitrix24.ru",
    "accessToken": "..."
  }
}
```

### `POST /api/saved`

Загрузка сохранённого результата из поля CRM.

### `GET /api/health`

Проверка работоспособности сервиса.

## Архитектура

```mermaid
flowchart LR
  CRM[Bitrix24 CRM] --> Tab[Вкладка React]
  Tab --> API[Backend API]
  API --> Checko[Checko API]
  API --> AI[VibeCode AI Router]
  API --> Cache[Кэш 24ч]
  API --> CRMFields[Поля CRM + Таймлайн]
```

## Лицензия

MIT
