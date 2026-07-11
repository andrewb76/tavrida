# W17 — Интеграции / Webhooks

---

## W17 — Список hooks и редактор

**Route:** `/profile/integrations` · **ID:** W17 · **MVP:** ⏳ (Basic+)

> Доступ: `webhooks.member.userScope.enabled`. Лимит hooks: `webhooks.member.endpoint.max`. Спека: [webhooks](../../05-microservices/webhooks/README.md).

### Содержание экрана

| Зона | Элементы | Поведение |
|------|----------|-----------|
| Header | «Интеграции», счётчик `N / limit` | Paywall W16 если Free или лимит исчерпан |
| List | Карточки hooks: name, URL (masked), enabled toggle, event count | `GET /webhooks` |
| Empty | CTA «Добавить hook» | — |
| Create / Edit drawer | Форма hook | `POST` / `PATCH /webhooks/{id}` |
| Form: basics | Name, URL (HTTPS), enabled | Валидация SSRF на BFF |
| Form: events | **Чекбоксы** по `GET /webhooks/event-types` | Только зарегистрированные типы; ≥1 обязателен; `description` + tooltip schema |
| Form: secret | Read-only после create; кнопка «Скопировать» / rotate | Secret один раз при создании |
| Form: advanced (collapsible) | Per-event timeout overrides | Опционально |
| Delivery log | Таб / ссылка с карточки hook | `GET /webhooks/{id}/deliveries` — redacted preview |
| Replay | Кнопка на failed delivery | Лимит `webhooks.member.replay.dailyMax` |

**States:** loading · empty · paywall (Free) · limit reached · validation errors (URL, no events selected).

**API:** `GET /webhooks/event-types`, `GET|POST|PATCH|DELETE /webhooks`, `GET /webhooks/{id}/deliveries`

### ASCII — список

```
┌─────────────────────────────────────┐
│ Интеграции              1 / 2 hooks │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ CRM webhook          [●] on    │ │
│ │ https://***.example/hooks       │ │
│ │ 3 события · журнал →            │ │
│ └─────────────────────────────────┘ │
│ [ + Добавить hook ]                 │
└─────────────────────────────────────┘
```

### ASCII — редактор (drawer)

```
┌─────────────────────────────────────┐
│ Новый hook                      [×] │
├─────────────────────────────────────┤
│ Название                            │
│ [ CRM Notion sync              ]    │
│ URL (HTTPS)                         │
│ [ https://hooks.example/tavrida  ]  │
│                                     │
│ События (из каталога платформы)     │
│ ☑ auction.bid_placed                │
│ ☑ auction.completed                 │
│ ☐ rating.user_banned                │
│                                     │
│ [▼ Дополнительно]                   │
│                                     │
│ [ Сохранить ]                       │
└─────────────────────────────────────┘
```

### Component tree

```
IntegrationsView.vue
├── IntegrationsHeader.vue          # title + limit badge
├── WebhookList.vue
│   └── WebhookCard.vue             # toggle, edit, deliveries link
├── WebhookEditorDrawer.vue
│   ├── WebhookBasicsForm.vue       # name, url, enabled
│   ├── WebhookEventChecklist.vue   # event-types from API
│   └── WebhookSecretPanel.vue      # create-only / rotate
└── WebhookDeliveriesPanel.vue      # optional nested route or tab
```

---

**Автор:** команда разработки · **Версия:** 0.1-spec
