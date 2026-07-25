# Инструменты которые можно/полезно подключить к репозиторию

## CodeReview

(https://tproger.ru/translations/8-tools-for-code-review)

## Test results (GitHub)

- Action: [EnricoMi/publish-unit-test-result-action](https://github.com/EnricoMi/publish-unit-test-result-action) `@v2.24.0`
- Workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) · job `test`
- Runner: `scripts/node-test.mjs` → `test-results/junit.xml` в каждом пакете
- Где смотреть: PR check **Test Results**, комментарий к PR, artifact `junit-test-results`
- Badge (как в [marketplace](https://github.com/marketplace/actions/publish-test-results)): JSON → `emibcn/badge-action` → SVG на ветке `badges` (без `GIST_TOKEN`)
  - Markdown: `![Tests](https://raw.githubusercontent.com/andrewb76/tavrida/badges/badge.svg)`
  - Обновляется только на push в `master` (после зелёного/красного Test)
  - Альтернатива через Gist: secret `GIST_TOKEN` + `andymckay/append-gist-action` — см. marketplace docs
