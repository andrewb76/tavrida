# ADR-009: Шифрованный канал переговоров по сделке (post-MVP)

> **Статус:** proposed · **Дата:** 2026-07-09 · **Фаза:** Phase 2+ (после стабильного core loop)

## 🎯 Контекст

После аукциона стороны договариваются о передаче и оплате **вне escrow** платформы. Публичный форум и открытые комментарии к лоту не подходят для адресов, телефонов, деталей передачи.

Нужен **приватный чат на двоих** с **сквозным шифрованием** (E2EE): сервер видит только ciphertext.

## ✅ Решение (целевое)

### Когда имеет смысл

| Этап | Действие |
|------|----------|
| **MVP** | Нет чата; email/телефон в профиле (опционально) + напоминание «договоритесь сами» |
| **Phase 2** | In-app **нешифрованный** thread при `auction.completed` (быстрый win, audit) |
| **Phase 3** | E2EE upgrade (Signal-style: Double Ratchet или MLS subset) |

E2EE **не** в MVP — высокая сложность (key backup, multi-device, legal hold, moderation).

### Модель (Phase 3)

| Компонент | Ответственность |
|-----------|----------------|
| **`deal-messaging`** (новый сервис, draft) | Комнаты `dealType+dealId`, store ciphertext, delivery WS |
| **Клиент** | Генерация ключей, encrypt/decrypt; публичные pre-keys на сервере |
| **BFF WS** | Relay `deal:{auctionId}` events |
| **Admin** | **Нет** доступа к plaintext; только metadata (created, message count) |
| **Moderation** | Report flow → block user, не расшифровка |

### Связь со сделкой

Комната создаётся при `auction.completed` / `marketplace.order_completed` для пары seller↔buyer (или provider↔customer). Закрывается после `deal_feedback.submitted` + TTL 90 дней.

### Юридически

Чат — **средство связи**, не договор. Дисклеймер в [legal-documents.md](../../01-goal/legal-documents.md). Хранение ciphertext — политика retention в Пользовательском соглашении.

## 🔄 Альтернативы

| Вариант | Почему отложено |
|---------|-----------------|
| Telegram / WhatsApp deep link | Нет контроля, нет audit trail на платформе |
| Matrix / XMPP federated | Ops overhead |
| Только email через Novu | Нет realtime, нет E2EE в продукте |

## 📌 Последствия

- Отдельная спека `deal-messaging` при старте Phase 2.
- Keto: `deal_room:{id}#member@user:{seller|buyer}`.
- Не смешивать с `forum.topicChatEnabled` / `forum.author.13topic.chatEnabled` (Pro side chat темы — сервис [`chat`](../../05-microservices/chat/requirements/analysis.md) kind=`TOPIC`).
- Не смешивать с club DIRECT/GROUP (`chat` service) — это переговоры по **сделке**, отдельный bounded context.

---

**Связано:** [deal_feedback](../../05-microservices/deal_feedback/README.md) · [legal-documents.md](../../01-goal/legal-documents.md)
