# Media upload (BFF + MinIO)

> **Статус:** implemented (MVP) · presigned PUT через BFF

## Область

Единый контур загрузки файлов для **аукциона** (фото лотов) и **форума** (вложения к темам/комментариям). Клиент не обращается к MinIO напрямую за credentials — только за presigned URL от BFF.

## Бакеты

| Domain | Bucket | Read |
|--------|--------|------|
| `auction` | `auction-images` | public |
| `forum` | `forum-attachments` | public |

Публичный URL: `{MEDIA_PUBLIC_BASE_URL}/{bucket}/users/{userId}/{uploadId}/{filename}`

## Лимиты (plan-config)

| Domain | Ключи |
|--------|-------|
| auction | `auction.seller.image.countMax`, `auction.seller.image.sizeMaxMb` |
| forum | `forum.author.attachment.countMax`, `forum.author.attachment.sizeMaxMb` |

## API (BFF `/api/v1/media`)

| Method | Path | Auth | Описание |
|--------|------|------|----------|
| GET | `/limits?domain=auction\|forum` | JWT | Лимиты тарифа |
| POST | `/upload-intents` | JWT | Создать сессию + presigned PUT |
| POST | `/upload-intents/:id/confirm` | JWT | Подтвердить после PUT |
| DELETE | `/upload-intents/:id` | JWT | Отменить pending |

### POST `/upload-intents`

```json
{
  "domain": "forum",
  "filename": "photo.jpg",
  "contentType": "image/jpeg",
  "sizeBytes": 120000
}
```

Ответ:

```json
{
  "uploadId": "uuid",
  "presignedPutUrl": "https://…",
  "publicUrl": "http://localhost:9000/forum-attachments/users/…",
  "expiresAt": "2026-07-12T12:00:00Z"
}
```

## Хранение сессий

Таблица `bff.media_upload_intent` — статусы `pending | ready | expired`.

## Доменные данные

- **Auction:** `images: string[]` — только URL после confirm.
- **Forum:** `attachments: MediaAttachment[]` + опционально картинки в markdown `body`.

## Пакет

`@tavrida/object-storage` — paths, mime whitelist, URL validation (общий для BFF, auction, forum).
