# Используем многоступенчатую сборку
FROM node:22-alpine AS builder
WORKDIR /app

# Устанавливаем pnpm
RUN npm install -g pnpm

# Копируем файлы монорепо (корневые и все package.json)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/ ./apps/
COPY packages/ ./packages/

# Устанавливаем все зависимости для всех пакетов
RUN pnpm install --frozen-lockfile

# Собираем только нужный пакет (и его зависимости)
RUN pnpm --filter @app/config-service build

# Проверяем, что сборка создала dist
RUN ls -la ./apps/config-service/dist

# Финальный образ
FROM node:22-alpine
WORKDIR /app

# Копируем собранный код и зависимости из builder
COPY --from=builder /app/apps/config-service/dist ./dist
COPY --from=builder /app/apps/config-service/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
# Копируем локальные пакеты, если они нужны (например, config-client)
COPY --from=builder /app/packages/config-client ./node_modules/@app/config-client

EXPOSE 3000
CMD ["node", "dist/main"]