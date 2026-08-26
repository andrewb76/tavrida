# 👁️ Сервис: presence

> **Статус:** draft · **Версия:** 0.1 · **Schema:** — (Redis + InfluxDB, без PostgreSQL) · **Port:** 3017  
> **Код:** `services/presence` (`@tavrida/presence`)

## 🎯 Назначение

**Presence** отслеживает статус пользователей (online / away / offline) в реальном времени и предоставляет эту информацию другим микросервисам платформы (чат, форум, аукцион). Собирает историю изменений статусов для аналитики.

Сервис **вспомогательный и не критичный** — не влияет на основную бизнес-логику. Требования к доступности: 99%.

## 📖 Термины

| Термин | Определение |
|--------|-------------|
| **Статус** | Текущее состояние пользователя: `online`, `away`, `offline`. |
| **Heartbeat** | Периодический сигнал от клиента, подтверждающий активность. |
| **Last seen** | Время последнего heartbeat или изменения статуса. |
| **Visibility** | Состояние вкладки браузера (`visible` / `hidden`) — сигнал для away. |
| **Сессия** | Логическая единица активности (в MVP агрегируется, не отслеживается по устройствам). |

## 🗄️ Хранилища данных

### PostgreSQL — НЕ используется

Сервис **не имеет PostgreSQL-схемы**. Данные хранятся в Redis (текущий статус) и InfluxDB (история). Это обосновано природой данных: key-value для real-time + time-series для аналитики. См. [ADR-001](../../03-architecture/adr/001-database-schema-per-service.md) — исключение для вспомогательных сервисов.

### Redis — текущий статус

| Ключ | TTL | Описание |
|------|-----|----------|
| `presence:{user_id}` | — | Hash: `{ status, last_seen, visibility }` |

### InfluxDB — история и аналитика

| Measurement | Tags | Fields | Описание |
|-------------|------|--------|----------|
| `presence_change` | `user_id`, `status` | `value` (1) | Сырые события изменения статуса |
| `presence_snapshot` | `status` | `count` | Периодические снапшоты количества online |
| `session_duration` | `user_id` | `duration_seconds` | Агрегированные длительности сессий |

**Retention:** сырые события — 60 дней; агрегаты daily/monthly — 1 год.

## 🔌 API

Общие принципы: REST, JSON. Заголовок `X-Service-Name` указывает вызывающий сервис. Доверенная сеть (без дополнительной авторизации). Идентификатор пользователя — UUID.

### 6.1. Отправка heartbeat

```
POST /internal/v1/presence/heartbeat
```

```json
{
  "user_id": "uuid",
  "visibility": "visible",
  "last_activity_at": "2024-05-01T12:00:00Z"
}
```

| Поле | Обязательность | Описание |
|------|----------------|----------|
| `user_id` | да | UUID пользователя |
| `visibility` | нет | `visible` (по умолчанию) или `hidden` — Page Visibility API |
| `last_activity_at` | нет | ISO8601 — время последнего взаимодействия на клиенте (mouse/keyboard/touch) |

Ответ: `204 No Content`.

**Логика обновления:**
1. Запись в Redis: `status=online`, `last_seen=now`, `visibility`.
2. Если предыдущий статус был другим — событие в InfluxDB.

### 6.2. Получение статуса одного пользователя

```
GET /internal/v1/presence/{user_id}
```

Ответ:
```json
{
  "user_id": "uuid",
  "status": "online",
  "last_seen": "2024-05-01T12:34:56Z"
}
```

Если данных нет — `status: "offline"`, `last_seen: null`.

### 6.3. Получение статусов списка пользователей (batch)

```
POST /internal/v1/presence/batch
```

```json
{
  "user_ids": ["uuid1", "uuid2"]
}
```

Ограничение: до 1000 ID за запрос.

Ответ:
```json
{
  "presences": [
    { "user_id": "uuid1", "status": "online", "last_seen": "..." },
    { "user_id": "uuid2", "status": "offline", "last_seen": null }
  ]
}
```

### 6.4. Оповещение о скрытии вкладки (опционально)

```
POST /internal/v1/presence/visibility
```

```json
{
  "user_id": "uuid",
  "visibility": "hidden"
}
```

BFF вызывает при `visibilitychange` → `hidden` на клиенте. Presence-сервис может немедленно перевести пользователя в `away` (если прошёл `away_after_seconds` от `last_activity_at`).

## 📡 WebSocket

Presence не имеет собственного WS. Интеграция с клиентом — через BFF по текущим правилам:

- BFF проксирует heartbeat от клиента в Presence-сервис.
- BFF запрашивает статусы для отображения в UI (чат, список участников).
- Опционально: BFF публикует изменения статусов в WS-каналы (`user:{id}`) при получении событий от Presence.

## ⚙️ Переменные scalar-config

| Ключ | Тип | Default | Scope | Описание |
|------|-----|---------|-------|----------|
| `presence.heartbeat.intervalSeconds` | number | `30` | global | Интервал отправки heartbeat клиентом (сек) |
| `presence.heartbeat.onlineTimeoutSeconds` | number | `90` | global | Время без heartbeat до offline (сек) |
| `presence.heartbeat.awayAfterSeconds` | number | `300` | global | Время без активности до away (сек) |
| `presence.snapshot.intervalSeconds` | number | `60` | global | Интервал периодических снапшотов (сек) |
| `presence.analytics.rawRetentionDays` | number | `60` | global | Срок хранения сырых событий в InfluxDB (дни) |

> Все параметры: `is_tariffable = false`. Сервис не зависит от тарифов — это технический сервис.

## 💳 Переменные plan-config

Отсутствуют. Presence — технический сервис, не зависит от тарифных планов.

## 📨 События (produce / consume)

**Не публикует** и **не потребляет** RabbitMQ-события. Presence — query-based сервис: статусы запрашиваются по HTTP.

## 🔗 Взаимодействие

| Сервис | Направление | Протокол | Описание |
|--------|-------------|----------|----------|
| BFF | → Presence | HTTP | Прокси heartbeat от клиента, запрос статусов |
| Chat | ← Presence | HTTP | Отображение статуса собеседника |
| Forum | ← Presence | HTTP | Отображение статуса автора в теме |
| Auction | ← Presence | HTTP | Индикатор активности ставки |
| InfluxDB | → Presence | Influx API | Запись событий и снапшотов |
| Redis | ←→ Presence | Redis protocol | Чтение/запись текущих статусов |
| scalar-config | ← Presence | HTTP (sync) | Регистрация параметров при старте |

## 🔒 Безопасность

- **Внутренний сервис** — нет прямого доступа извне. Все запросы через BFF.
- Идентификация по заголовку `X-Service-Name` (доверенная сеть).
- Хранятся только `user_id`, статус, `last_seen` — без персональных данных.
- Дополнительная авторизация не требуется.
- Доступ к Redis/InfluxDB — только из internal network.

## 🌍 Окружение

| Переменная | Секрет | Default | Описание |
|------------|--------|---------|----------|
| `PORT` / `PRESENCE_PORT` | нет | `3017` | HTTP |
| `REDIS_URL` | **да** | `redis://localhost:6379` | Текущие статусы |
| `INFLUXDB_URL` | нет | `http://localhost:8086` | История и аналитика |
| `INFLUXDB_TOKEN` | **да** | — | InfluxDB API token |
| `INFLUXDB_ORG` | нет | `tavrida` | InfluxDB organization |
| `INFLUXDB_BUCKET` | нет | `presence` | InfluxDB bucket |
| `SCALAR_CONFIG_URL` | нет | `http://localhost:3008` | Sync scalar-config параметров |
| `INTERNAL_SERVICE_TOKEN` | **да (prod)** | — | Shared Bearer `/internal/v1/*` |

> Полный реестр: [PLATFORM-SECRETS.md](../../02-infrastructure/PLATFORM-SECRETS.md).

## 📎 Связанные разделы

- [MICROSERVICE-SPEC](../MICROSERVICE-SPEC.md)
- [PLATFORM-REGISTRY](../PLATFORM-REGISTRY.md)
- [PLATFORM-SECRETS](../../02-infrastructure/PLATFORM-SECRETS.md)
- [ADR-001](../../03-architecture/adr/001-database-schema-per-service.md) — исключение: no PG schema
- [10-data/README.md](../../10-data/README.md)
- [naming.md](../../13-maintenance/naming.md)

---

**Автор:** команда разработки · **Версия:** 0.1-draft
