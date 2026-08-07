docker api (решение проблемы аркестрации и зависимостей на уровне приложений кластера)
  - получить список сервисов
  - показать mirmind диаграмму зависимостей
  - шаред модуль готовности сервиса с учетом зависимостей
  - шаред модуль healthcheck учитывает зависимости


```mermaid
    A[Start] --> B[forum offline]
    B --> C[banking offline]
    B --> D[hooks online]
    B --> E[scalar options offline]
    B --> F[plan options online]
    B --> G[wss online]
```