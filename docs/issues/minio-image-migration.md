# Issue: Полный перенос картинок MinIO со старого диска на новый

## Описание

При переносе Docker data-root с `/var/lib/docker` (sda2, корневой диск) на `/mnt/data/docker` (sdb3, новый диск) копирование MinIO данных было прервано из-за критического I/O давления (92% wa). Картинки forum-images могут быть частично утрачены.

## Текущее состояние

| Диск | Путь | Статус |
|------|------|--------|
| **Старый (sda2)** | `/var/lib/docker/volumes/tavrida-dev_minio_data/_data/` | ✅ Полный объём (~500+ MB, 69,647 картинок) |
| **Новый (sdb3)** | `/mnt/data/docker/volumes/tavrida-dev_minio_data/_data/` | ⚠️ Частично скопировано (~1.2 GB из ~500+ MB) |

**Примечание:** копирование началось 2026-09-09 ~22:05 UTC и было прервано kill -9 через ~45 минут из-за I/O давления. Текущее содержимое нового диска может содержать неполные/broken данные.

## Bucket forum-images

- **Bucket:** `forum-images`
- **URL:** `https://s3.tavridalot.ru/forum-images/`
- **Access policy:** public (download без авторизации)
- **Содержимое:** 69,647 локальных PunBB картинок + 18,845 перезаписанных URL + 392 Wayback-recovered

## План переноса

### Шаг 1: Остановить MinIO и все сервисы, использующие S3
```bash
ssh max
echo sin | sudo -S docker service scale tavrida-dev_minio=0
echo sin | sudo -S docker service scale tavrida-dev_imgproxy=0
```

### Шаг 2: Дождаться полной стабилизации I/O
```bash
# Проверять пока wa% не упадёт до <5%
echo sin | sudo -S vmstat 1 5
```

### Шаг 3: Копировать данные (ночью, без нагрузки)
```bash
# Удалить частично скопированные данные
echo sin | sudo -S rm -rf /mnt/data/docker/volumes/tavrida-dev_minio_data/_data

# Копировать с сохранением прав (rsync предпочтительнее cp)
echo sin | sudo -S rsync -avh --progress \
  /var/lib/docker/volumes/tavrida-dev_minio_data/_data/ \
  /mnt/data/docker/volumes/tavrida-dev_minio_data/_data/
```

### Шаг 4: Проверить целостность
```bash
# Сравнить количество файлов
echo sin | sudo -S find /var/lib/docker/volumes/tavrida-dev_minio_data/_data/forum-images -type f | wc -l
echo sin | sudo -S find /mnt/data/docker/volumes/tavrida-dev_minio_data/_data/forum-images -type f | wc -l

# Сравнить размеры
echo sin | sudo -S du -sh /var/lib/docker/volumes/tavrida-dev_minio_data/_data/
echo sin | sudo -S du -sh /mnt/data/docker/volumes/tavrida-dev_minio_data/_data/
```

### Шаг 5: Перезапустить MinIO и imgproxy
```bash
echo sin | sudo -S docker service scale tavrida-dev_minio=1
echo sin | sudo -S docker service scale tavrida-dev_imgproxy=1
```

### Шаг 6: Верификация
- Открыть несколько картинок в форуме
- Проверить upload новой картинки
- Проверить avatar'ы пользователей (Logto storage)

## Рекомендации

1. **Выполнять ночью** (03:00-06:00 UTC) когда минимальная нагрузка
2. **Использовать `rsync`** вместо `cp -a` для идемпотентности
3. **Не запускать minio/imgproxy** пока копирование не завершится
4. **Создать snapshot** minio bucket перед копированием (если есть бэкап mechanism)
5. **После переноса** — удалить старый volume на sda2 чтобы освободить место:
   ```bash
   echo sin | sudo -S rm -rf /var/lib/docker/volumes/tavrida-dev_minio_data/
   ```

## Приоритет

**Medium** — контент отображается частично (новые картинки работают через MinIO, старые могут быть broken). Форум функционален, но некоторые старые изображения могут не загружаться.
