# 🔴 Редкие сценарии (~3%)

> **Группа:** rare · **ID:** S-030…S-037  
> **Индекс:** [platform-scenarios.md](../platform-scenarios.md)

Модерация, admin, штрафы, edge errors, споры. **Docs-first + targeted tests** при реализации; полный E2E не на каждый PR.

## 📏 Стандарты этой группы

| | Требование |
|---|------------|
| E2E | При merge фичи mod/admin; иначе manual checklist |
| UNIT | Penalty thresholds, Keto check matrix, error mapping |
| INT | Promote comment→topic; ban propagation; admin assign |
| Security | Review обязателен; audit log (TBD) |
| ADR | Новое поведение → ADR или update [moderator-mapping](../../09-security/moderator-mapping.md) |

---

### S-030 · Жалоба на контент

| | |
|---|---|
| **W** | Report topic/comment |
| **T** | `forum.content_reported` → mod notify |
| **Компоненты** | `forum`, `notifications` |
| **Тест** | INT |

### S-031 · Модерация (hide / pin / promote)

| | |
|---|---|
| **Актор** | Moderator scoped |
| **T** | Promote = marker + new topic ([ADR-005](../../03-architecture/adr/005-forum-terminology.md)) |
| **Компоненты** | `forum`, Keto, WS `topic.promoted` |
| **Тест** | INT Keto; E2E mod UI |

### S-032 · Экспертная оценка

| | |
|---|---|
| **Актор** | Expert |
| **T** | `auction.expert_appraisal_added` |
| **Компоненты** | `auction`, Keto |
| **Тест** | INT |

### S-033 · Admin: назначить mod / expert

| | |
|---|---|
| **T** | Tuple; **only admin** |
| **Компоненты** | BFF admin, Keto write |
| **Тест** | INT |

### S-034 · Штраф / бан (pending feedback)

| | |
|---|---|
| **W** | CRON evaluate |
| **T** | `rating.user_banned`; block bid/post |
| **Компоненты** | `rating`, `deal-feedback`, `auction`, `forum` |
| **Тест** | **UNIT** + INT check-ban |

### S-035 · Autorenew fail

| | |
|---|---|
| **T** | `subscription.expired`; Free limits |
| **Компоненты** | `plan-config`, `billing` |
| **Тест** | INT |

### S-036 · 402 / 403 / 429 (negative)

| | |
|---|---|
| **G** | Limit / balance / rate |
| **W** | Mutating action from **частых** сценариев |
| **T** | RFC 7807; UI paywall |
| **Компоненты** | BFF, plan-config, `billing` |
| **Тест** | E2E negative; UNIT plan-config — **включать в MVP gate** |

### S-037 · Спор маркета (draft)

| | |
|---|---|
| **T** | TBD |
| **Тест** | blocked |

---

## 🔗 Связанные docs

- [moderator-mapping](../../09-security/moderator-mapping.md)
- [roles.md](../roles.md)
- [security-ops](../../09-security/security-ops.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec
