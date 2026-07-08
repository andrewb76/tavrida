# ⏪ Runbook: откат деплоя

> **Статус:** spec ready · **Версия:** 0.2

## 🎯 Когда применять

- Рост 5xx после deploy
- Критичный баг в business logic
- Failed health checks > 50% replicas

**Не откатывать** при: проблемах миграции без оценки schema state — эскалация.

## 📋 Быстрый откат (Swarm)

```bash
export PREV_SHA=abc1234   # предыдущий известный good SHA
export SERVICE=billing

docker service update \
  --image registry/tavrida/${SERVICE}:${PREV_SHA} \
  tavrida_${SERVICE}
```

Для всего stack-platform — redeploy compose с `GIT_SHA=${PREV_SHA}`.

## 🔍 Диагностика перед откатом

1. Grafana: error rate, latency ([slo](../07-observability/slo.md))
2. Sentry: новые issues с release tag
3. Dozzle / Loki: stack traces, `correlationId`
4. RabbitMQ: DLQ depth

## 🗄️ Миграции и откат

| Ситуация | Действие |
|----------|----------|
| Migration additive only (new column) | Откат кода **без** revert migration — OK |
| Migration renamed/dropped column | **Не** откатывать код без плана; forward-fix |
| Migration failed mid-deploy | Fix migration, re-run job; не deploy app |

## 📨 События / очереди

После отката: проверить DLQ (`*.dlq`), idempotent consumers — повторная обработка safe ([event-catalog](../03-architecture/event-catalog.md)).

## ✅ Post-rollback

- [ ] Sentry release marked `reverted`
- [ ] Incident note в team channel
- [ ] Postmortem если prod downtime > 15 min
- [ ] Fix forward PR с тестом

## 🔗 Связанные разделы

- [04-deployment/README.md](./README.md)
- [Observability](../07-observability/README.md)

---

**Автор:** команда разработки · **Версия:** 0.2-spec
