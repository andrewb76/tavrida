<script setup lang="ts">
import { COOKIE_CATEGORIES, COOKIE_CONSENT_VERSION } from '@/config/cookie-consent';
import { useCookieConsentStore } from '@/stores/cookieConsent';
import { UiButton } from '@tavrida/ui';
import { onMounted } from 'vue';
import { RouterLink } from 'vue-router';

const consent = useCookieConsentStore();

onMounted(() => {
  consent.init();
});
</script>

<template>
  <article class="cookies mx-auto max-w-2xl space-y-8 px-4 py-10 sm:px-6">
    <header class="space-y-3">
      <p class="text-sm text-text-muted">
        Версия {{ COOKIE_CONSENT_VERSION }} · документ L-07
      </p>
      <h1 class="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        Политика cookie
      </h1>
      <p class="text-lg leading-relaxed text-text-muted">
        Как «Таврида Лот» использует файлы cookie и похожие технологии
        (localStorage) на сайте.
      </p>
    </header>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">
        Что такое cookie
      </h2>
      <p class="leading-relaxed text-text-muted">
        Cookie — небольшие данные, которые сайт сохраняет в браузере.
        Мы также можем использовать localStorage для настроек интерфейса
        и записи вашего согласия. Это нужно, чтобы сайт помнил вход, тему
        и ваш выбор по необязательным технологиям.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">
        Категории
      </h2>
      <ul class="space-y-4">
        <li
          v-for="cat in COOKIE_CATEGORIES"
          :key="cat.id"
          class="rounded-lg border border-border bg-surface p-4"
        >
          <h3 class="font-semibold text-text">
            {{ cat.title }}
            <span
              v-if="cat.required"
              class="ml-2 text-sm font-normal text-text-muted"
            >(всегда включены)</span>
          </h3>
          <p class="mt-1 text-sm leading-relaxed text-text-muted">
            {{ cat.description }}
          </p>
        </li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">
        Правовые основания
      </h2>
      <p class="leading-relaxed text-text-muted">
        Обязательные технологии необходимы для предоставления сервиса
        (вход через Logto, безопасность, базовые настройки).
        Аналитика и маркетинг — только с согласия. Обработка персональных
        данных регулируется также
        <strong class="font-medium text-text">Политикой конфиденциальности</strong>
        (L-02), когда документ будет опубликован.
      </p>
      <p class="leading-relaxed text-text-muted">
        Вы можете изменить выбор в любой момент: кнопка ниже или ссылка
        «Cookie» в подвале сайта. При смене версии политики мы снова
        попросим подтвердить выбор.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">
        Операторы и сроки
      </h2>
      <p class="leading-relaxed text-text-muted">
        Сессионные cookie входа задаёт провайдер идентификации (Logto).
        Запись согласия хранится локально в вашем браузере до очистки данных
        или до смены версии политики. Сторонние счётчики аналитики/рекламы
        на момент этой версии не подключены.
      </p>
    </section>

    <div class="flex flex-wrap items-center gap-3 border-t border-border pt-6">
      <UiButton
        intent="primary"
        type="button"
        @click="consent.openPreferences()"
      >
        Изменить настройки cookie
      </UiButton>
      <RouterLink
        to="/about"
        class="text-sm text-primary underline-offset-2 hover:underline"
      >
        О клубе
      </RouterLink>
    </div>

    <p class="text-xs leading-relaxed text-text-muted">
      Черновик для MVP. Перед production текст утверждается юристом
      (см. чеклист в юридических документах платформы).
    </p>
  </article>
</template>
