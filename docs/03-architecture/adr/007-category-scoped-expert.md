# ADR-007: Эксперт привязан к веткам категорий форума

> **Статус:** accepted · **Дата:** 2026-07-09

## 🎯 Контекст

Роль **Expert** сейчас глобальная (`platform#expert`). На практике экспертиза узкая: нумизматика, керамика, металлоискательные находки — редко «всё сразу».

Нужно:
- экспертная оценка **лотов аукциона** в своей области;
- опционально — модерация/публикация в **справочных** ветках форума ([knowledge-base](../../05-microservices/forum/knowledge-base.md)).

## ✅ Решение

### Два уровня (как у модератора)

| Уровень | UX | Keto tuple | Область |
|---------|-----|------------|---------|
| **Главный эксперт** | `Эксперт` | `platform:tavrida-lot#expert@user:{id}` | Все категории (редко; admin) |
| **Областной эксперт** | `Эксперт:category:{id}` | `category:{id}#expert@user:{id}` | Категория + **всё поддерево** |

Назначает **только Admin**. Expert **не** назначает других экспертов.

### Проверки

| Действие | Check |
|----------|-------|
| `POST /auctions/{id}/expert-appraisals` | Expert на `auction.categoryId` или platform expert |
| Создание topic в `docs-only` ветке | Expert scoped **или** moderator **или** admin |
| Бейдж «эксперт» в UI | Список категорий из Keto tuples |

### Лимит назначений (draft)

Admin UI предупреждает, если у user > **6** scoped expert tuples; soft guideline — 3–4 категории.

## 🔄 Альтернативы

| Вариант | Почему нет |
|---------|------------|
| Только global expert | Не соответствует реальности |
| Expert per auction | Слишком мелко, не масштабируется |
| Теги вместо категорий | Аукцион уже привязан к category tree |

## 📌 Последствия

- Обновить [keto-schema.md](../../09-security/keto-schema.md), [roles.md](../../01-goal/roles.md), [moderator-mapping.md](../../09-security/moderator-mapping.md) (секция expert).
- Auction: `categoryId` обязателен для expert appraisal check.
- Logto claim mirror: `Expert:CategoryId:{uuid}`.

---

**Связано:** [forum/knowledge-base.md](../../05-microservices/forum/knowledge-base.md)
