# Media upload (BFF + MinIO)

> **Статус:** implemented (MVP) · presigned PUT через BFF

## Область

Единый контур загрузки файлов для **аукциона** (фото лотов), **форума** (вложения) и **marketplace** (портфолио услуг). Клиент не обращается к MinIO напрямую за credentials — только за presigned URL от BFF.

## Бакеты

| Domain | Bucket | Read |
|--------|--------|------|
| `auction` | `auction-images` | public |
| `forum` | `forum-attachments` | public |
| `marketplace` | `marketplace-portfolio` | public |

Публичный URL: `{MEDIA_PUBLIC_BASE_URL}/{bucket}/users/{userId}/{uploadId}/{filename}`

## Лимиты (plan-config)

| Domain | Ключи |
|--------|-------|
| auction | `auction.seller.image.countMax`, `auction.seller.image.sizeMaxMb` |
| forum | `forum.author.attachment.countMax`, `forum.author.attachment.sizeMaxMb` |
| marketplace | `marketplace.seller.portfolio.itemMax`, `marketplace.seller.portfolio.image.sizeMaxMb` |

## API (BFF `/api/v1/media`)

| Method | Path | Auth | Описание |
|--------|------|------|----------|
| GET | `/limits?domain=auction\|forum\|marketplace` | JWT | Лимиты тарифа |
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
- **Marketplace:** `portfolio_item.imageUrl` — URL после confirm (`domain=marketplace`).

## Image proxy (imgproxy)

Для превью и галерей браузер грузит **уменьшенные** копии через [imgproxy](https://docs.imgproxy.net/) — оригиналы остаются в MinIO.

| Env (root `.env.local`) | Назначение |
|-------------------------|------------|
| `VITE_IMAGE_PROXY_URL` | Публичный URL imgproxy (`http://localhost:8080`) |
| `VITE_IMAGE_PROXY_FETCH_BASE_URL` | Origin, с которого imgproxy тянет файлы (`http://minio:9000` в docker) |
| `VITE_MEDIA_PUBLIC_BASE_URL` | Должен совпадать с `MEDIA_PUBLIC_BASE_URL` — для rewrite URL |

Локально: `docker compose -f docker/compose/infra.local.yml up -d` поднимает `imgproxy` на `:8080`.

- Проксируются только URL из наших бакетов (`parseMediaUrl`).
- Формат imgproxy: base64-encoded source URL (без `/plain/` — тот режим для percent-encoded URL).
- Внешние аватары (Logto CDN) идут напрямую.
- Без `VITE_IMAGE_PROXY_URL` фронт использует сырые MinIO URL (как раньше).
- Production: подписанные URL imgproxy (`IMGPROXY_KEY` / `IMGPROXY_SALT`) — TODO.

Утилита: `@tavrida/object-storage` → `buildImageProxyUrl`; фронт → `proxiedMediaUrl()`.

## Пакет

`@tavrida/object-storage` — paths, mime whitelist, URL validation (общий для BFF, auction, forum).
