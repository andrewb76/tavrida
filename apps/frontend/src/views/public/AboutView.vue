<script setup lang="ts">
import { UiButton } from '@tavrida/ui';
import { RouterLink } from 'vue-router';
import BrandLogo from '@/components/brand/BrandLogo.vue';
import { useClubAccess } from '@/composables/useClubAccess';
import { useThemeStore } from '@/stores/theme';

const { inviteOnly } = useClubAccess();
const theme = useThemeStore();
</script>

<template>
  <article class="about mx-auto max-w-2xl space-y-10">
    <header class="space-y-3">
      <BrandLogo
        variant="compact"
        :theme="theme.mode === 'dark' ? 'dark' : 'light'"
      />
      <h1 class="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        О клубе
      </h1>
      <p class="text-lg leading-relaxed text-text-muted">
        Место, где вещь обретает цену, историю и доверенных людей рядом.
        Географический якорь — Крым; аудитория шире: коллекционеры, краеведы, любители истории.
      </p>
    </header>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">
        Зачем мы
      </h2>
      <p class="leading-relaxed text-text-muted">
        Мы не антикварный бутик и не «маркетплейс как у всех». Здесь живут торги с понятными
        правилами, форум без снобизма и услуги вокруг вещи — реставрация, экспертиза, доставка —
        между людьми с репутацией.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">
        Что внутри
      </h2>
      <ul class="list-disc space-y-2 pl-5 leading-relaxed text-text-muted">
        <li>
          <strong class="text-text">Аукционы</strong> — английский и голландский форматы, лимиты по тарифу.
        </li>
        <li>
          <strong class="text-text">Форум</strong> — атрибуция, истории вещей, обсуждение лотов.
        </li>
        <li>
          <strong class="text-text">Профиль и доверие</strong> — рейтинг, карма, отзывы после сделок.
        </li>
        <li>
          <strong class="text-text">Маркет услуг</strong> — заказы между участниками клуба.
        </li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">
        Как попасть
      </h2>
      <p
        v-if="inviteOnly"
        class="leading-relaxed text-text-muted"
      >
        Открытой регистрации нет. Нужен код или ссылка от действующего участника.
        Лимит приглашений зависит от тарифа.
      </p>
      <p
        v-else
        class="leading-relaxed text-text-muted"
      >
        Можно зарегистрироваться самостоятельно. Приглашения от участников помогают расширять
        круг доверия и влияют на реферальный вклад.
      </p>
    </section>

    <div class="flex flex-wrap items-center gap-3 pt-2">
      <RouterLink
        v-if="inviteOnly"
        to="/join"
        class="inline-flex"
      >
        <UiButton intent="primary">
          У меня есть инвайт
        </UiButton>
      </RouterLink>
      <RouterLink
        to="/"
        class="inline-flex"
      >
        <UiButton intent="secondary">
          На главную
        </UiButton>
      </RouterLink>
    </div>
  </article>
</template>
