# План миграции аукциона WebID 2016 → Tavrida Auction Service

## Исходные данные

### Старая система (WebID 2016)
- **Платформа**: PHP + MariaDB 10.6
- **БД**: `aukc19` (prefix: `w16_`)
- **Код**: `/home/andrew/archive/aukc/webid2016/`
- **Изображения**: `uploaded/` — 7634 директорий, 551MB, формат `.dir.part` (1MB чанки)

### Данные для миграции
| Таблица | Записей |
|---------|---------|
| `w16_auctions` | **1,148** |
| `w16_bids` | **4,474** |
| `w16_users` | **1,607** |
| `w16_categories` | **57** |
| `w16_winners` | **14,196** |
| `w16_feedbacks` | **25,882** |

### Новая система (Tavrida)
- **Платформа**: NestJS + TypeORM + PostgreSQL
- **Схема**: `auction` в БД `tavrida_lot`
- **Текущие данные**: 30 тестовых лотов, 36 ставок

---

## Синхронизация пользователей

### Три отдельные базы пользователей

| Система | Пользователей | С email |
|---------|---------------|---------|
| PunBB Forum | 2,556 | 2,552 |
| WebID Auction | 1,607 | 1,607 |
| Logto (новая) | 2,583 | 2,574 |

### Пересечение по email

```
Forum ∩ Logto:     2,552 (99.8% форума в Logto)
Forum only:            4 (0.2% форума НЕ в Logto)

Auction ∩ Logto:     648 (40.3% аукциона в Logto)
Auction only:        959 (59.7% аукциона НЕ в Logto)

Logto only:         1,926 (Logto пользователей без ауккаунта аукциона)
```

### Выводы

1. **Logto импортирован из PunBB** — 2,552 из 2,556 пользователей совпадают по email
2. **Аукцион был отдельной системой** — только 648 из 1,607 пользователей аукциона имеют аккаунт в Logto
3. **959 пользователей аукциона потеряны** — у них нет аккаунта в Logto
4. **Создать заглушки** — для 959 пользователей аукциона нужно создать dummy-аккаунты в Logto

### Решение

**Для миграции аукционов**:
1. Создать dummy-аккаунты в Logto для 959 auction-only пользователей
2. Маппинг: `w16_users.id` → `Logto user ID` (по email)
3. Для пользователей без email в Logto: создать заглушку `auction_{old_id}@legacy.tavridalot.ru`

**Таблица маппинга**:
```sql
CREATE TABLE auction.user_id_mapping (
  old_id INT PRIMARY KEY,
  new_id VARCHAR(128) NOT NULL,  -- Logto user ID
  is_dummy BOOLEAN DEFAULT FALSE
);
```

---

## Ссылки на аукцион в форуме

### Формат ссылок

| Формат | Количество |
|--------|------------|
| `http://evpatorg.com/item.php?id=` | 5,225 |
| `https://evpatorg.com/item.php?id=` | 4,750 |
| Относительные `item.php?id=` | 23 |
| Текстовые упоминания "auction" | 1,618 |
| **Итого** | **~10,000** |

### Примеры ссылок

BBCode:
- `[url]http://evpatorg.com/item.php?id=16944&mode=1[/url]`
- `[url=http://evpatorg.com/item.php?id=598[/url]`
- `[url]https://evpatorg.com/item.php?id=863&mode=1[/url]`

### Новый формат URL

**Старый**: `http(s)://evpatorg.com/item.php?id={old_auction_id}`
**Новый**: `https://tavridalot.ru/auction/{new_auction_uuid}`

### Миграция ссылок

**Шаг 1**: Создать таблицу маппинга auction IDs
```sql
CREATE TABLE auction.id_mapping (
  old_id INT PRIMARY KEY,
  new_id UUID NOT NULL
);
```

**Шаг 2**: Обновить ссылки в forum posts
```sql
-- Для каждой ссылки:
-- 1. Извлечь old_id из URL
-- 2. Найти new_id через auction.id_mapping
-- 3. Заменить URL

-- Пример миграции (псевдокод):
UPDATE punbb_forum.posts 
SET message = REPLACE(message, 
  'http://evpatorg.com/item.php?id=' || old_id,
  'https://tavridalot.ru/auction/' || new_id
)
WHERE message LIKE '%evpatorg.com/item.php?id=' || old_id || '%';
```

**Шаг 3**: Обработать все форматы
- `http://evpatorg.com/item.php?id=X` → `https://tavridalot.ru/auction/UUID`
- `https://evpatorg.com/item.php?id=X` → `https://tavridalot.ru/auction/UUID`
- `item.php?id=X` → `https://tavridalot.ru/auction/UUID`

**Шаг 4**: Обработать `&mode=1` и другие параметры
- `item.php?id=X&mode=1` → `https://tavridalot.ru/auction/UUID`

---

## Этапы миграции

### Этап 0: Подготовка (ГОТОВО ✅)
- [x] Запущен MariaDB контейнер с данными
- [x] SQL dump создан: `/tmp/aukc19_dump.sql` (1685 строк)
- [x] Данные проанализированы
- [x] Синхронизация пользователей изучена

### Этап 1: Пользователи (1-2 дня)
**Действия**:
1. Создать dummy-аккаунты в Logto для 959 auction-only пользователей
2. Создать таблицу маппинга `auction.user_id_mapping`
3. Заполнить маппинг по email

### Этап 2: Категории (1 день)
**57 категорий** с иерархией.

**Действия**:
1. Создать миграцию `CreateAuctionCategories`
2. Таблица `auction.category`:
   ```sql
   CREATE TABLE auction.category (
     id UUID PRIMARY KEY,
     parent_id UUID REFERENCES auction.category(id),
     old_id INT NOT NULL,
     slug VARCHAR(64) NOT NULL,
     title VARCHAR(128) NOT NULL,
     description TEXT DEFAULT '',
     sort_order INT DEFAULT 0,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```
3. Импортировать 57 категорий

### Этап 3: Аукционы (2-3 дня)
**1,148 аукционов** для миграции.

**Маппинг полей**:
```
w16_auctions.id          → (генерировать UUID)
w16_auctions.user        → auction.seller_id (через user_id_mapping)
w16_auctions.title       → auction.title
w16_auctions.description → auction.description
w16_auctions.category    → auction.category_id (через category маппинг)
w16_auctions.minimum_bid → auction.starting_price
w16_auctions.current_bid → auction.current_price
w16_auctions.increment   → auction.bid_increment
w16_auctions.reserve_price → auction.reserve_price
w16_auctions.starts      → auction.starts_at (Unix timestamp → ISO 8601)
w16_auctions.ends        → auction.ends_at
w16_auctions.auction_type → auction.type (1→ENGLISH, 2→DUTCH)
w16_auctions.num_bids    → auction.bid_count
```

**Статусы**:
```
closed=0, starts > now     → SCHEDULED
closed=0, starts <= now, ends > now → ACTIVE
closed=1                   → ENDED
suspended=9                → CANCELLED
```

**Создать таблицу маппинга IDs**:
```sql
CREATE TABLE auction.id_mapping (
  old_id INT PRIMARY KEY,
  new_id UUID NOT NULL
);
```

### Этап 4: Ставки (1-2 дня)
**4,474 ставок** для миграции.

**Маппинг полей**:
```
w16_bids.id       → (генерировать UUID)
w16_bids.auction  → bid.auction_id (через auction.id_mapping)
w16_bids.bidder   → bid.bidder_id (через user_id_mapping)
w16_bids.bid      → bid.amount
```

**Определение winning bid**: Последняя ставка с наивысшей суммой.

### Этап 5: Изображения (2-3 дня)
**7,634 директории** с изображениями (551MB).

**Процесс**:
1. Восстановить изображения из чанков
2. Загрузить в MinIO `auction-images` bucket
3. Обновить `auction.images` в БД

### Этап 6: Обновление ссылок в форуме (1-2 дня)
**~10,000 ссылок** для обновления.

**Процесс**:
1. Извлечь все `item.php?id=X` из forum posts
2. Заменить на `https://tavridalot.ru/auction/{UUID}`
3. Обработать все форматы URL
4. Проверить корректность замен

### Этап 7: Верификация (1-2 дня)
- Проверить количество аукционов, ставок, изображений
- Проверить работу фронтенда с мигрированными данными
- Проверить статусы аукционов
- Проверить отображение изображений
- Проверить работу ссылок в форуме

---

## Оценка времени

| Этап | Время |
|------|-------|
| Подготовка | ✅ Готово |
| Пользователи | 1-2 дня |
| Категории | 1 день |
| Аукционы | 2-3 дня |
| Ставки | 1-2 дня |
| Изображения | 2-3 дня |
| Ссылки в форуме | 1-2 дня |
| Верификация | 1-2 дня |
| **Итого** | **8-13 дней** |

---

## Риски

1. **Изображения могут быть повреждены** — `.dir.part` чанки могут содержать неполные данные
2. **959 пользователей аукциона потеряны** — нет аккаунта в Logto
3. **Ссылки в форуме могут сломаться** — если маппинг IDs не точный
4. **Временные метки** — WebID использует Unix timestamps, Tavrida — ISO 8601

---

## Команда для миграции

```bash
# 1. Запуск MariaDB (если остановлен)
docker run -d --name tavrida_mariadb_export \
  -e MARIADB_ROOT_PASSWORD=punbb_forum \
  -v /home/andrew/archive/dc-forum/db:/bitnami \
  -p 3307:3306 \
  mariadb:10.6 --datadir=/bitnami/mariadb/data --innodb-doublewrite=0

# 2. Экспорт данных
docker exec tavrida_mariadb_export mysqldump -u root -ppunbb_forum aukc19 > /tmp/aukc19_dump.sql

# 3. Импорт в PostgreSQL (после создания миграций)
psql -h localhost -U postgres -d tavrida_lot -f /tmp/aukc19_import.sql

# 4. Обновление ссылок в форуме
# (SQL запросы для замены URL в forum posts)
```

---

## Статус изображений аукционов

### Ситуация
- **1,148 лотов** мигрировано из WeBid
- **853 лота** имели только имена файлов (например `o_1d33leg781m961l8r1gvb19aoipdd.jpg`) без полного URL
- **23 лота** имеют реальные S3 URL (созданы через новый UI)
- **0 лотов** имеют восстановленные из Wayback Machine

### Попытка восстановления через Wayback Machine
- **46 уникальных имен файлов** найдено в архиве Wayback Machine (из 1,144 в БД)
- Wayback Machine был **офлайн** во время попытки восстановления (503 Temporarily Offline)
- Скрипт восстановления сохранён: `scripts/recover-wayback-images.mjs`

### Результат
- 853 лотов с битыми URL **очищены** (пустой массив `[]`)
- Плейсхолдер 🏺 показывается для лотов без изображений
- 23 лота с реальными S3 URL **сохранены**

### Для повторной попытки восстановления
```bash
# Запустить на сервере max
ssh max
docker run -d --name image-recovery --network tavrida-dev_tavrida_net \
  -v /tmp/image-recovery:/app -v /tmp/recoverable.txt:/tmp/recoverable.txt \
  -w /app node:20-alpine sh -c \
  'npm init -y > /dev/null 2>&1 && npm install pg @aws-sdk/client-s3 2>/dev/null && node recover.mjs'
docker logs -f image-recovery
```

---

## Следующие шаги

1. **Создать dummy-аккаунты в Logto** для 959 auction-only пользователей
2. **Создать маппинг user IDs** — приоритет
3. **Создать миграцию категорий** — следующий шаг
4. **Написать скрипт миграции аукционов** — основная работа
5. **Восстановить изображения из Wayback Machine** (когда будет стабильный доступ)
