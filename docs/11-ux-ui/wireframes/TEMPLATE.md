# 📐 Шаблон wireframe (глобальный)

> **Стандарт (принято):** каждый экран = **Содержание** + **ASCII** + **Component tree**  
> **Format lab:** [format-lab/W03-lot-page-formats.md](./format-lab/W03-lot-page-formats.md)

Скопируйте блок ниже для нового экрана **WXX**.

---

## WXX — {Название экрана}

**Route:** `{path}` · **ID:** WXX · **MVP:** ✅ | ⏳

### Содержание экрана

| Зона | Элементы | Поведение |
|------|----------|-----------|
| | | |

**States:** loading · empty · error · …

**Roles:** member · owner · moderator · …

**API / WS:** `GET …` · WS `channel` · …

### ASCII

```
┌─────────────────────────────────────┐
│                                     │
└─────────────────────────────────────┘
```

### Component tree

```yaml
PageName:
  - AppHeader
  - …
```

### 🔗 Docs

- [service](../../05-microservices/…/README.md)

---

**Не включаем в каждый экран:** Mermaid layout, zone matrix, HTML gray-box (только format-lab / ключевые reference).
