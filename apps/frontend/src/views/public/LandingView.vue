<script setup lang="ts">
import { UiButton } from '@tavrida/ui';
import { RouterLink } from 'vue-router';
import { useAuth } from '@/composables/useAuth';

const auth = useAuth();
</script>

<template>
  <section class="space-y-8">
    <div class="space-y-4 text-center sm:text-left">
      <h1 class="text-3xl font-semibold sm:text-4xl">Клуб находок Крыма</h1>
      <p class="max-w-xl text-lg text-text-muted">
        Закрытое сообщество коллекционеров и любителей истории — только по приглашению.
      </p>
      <div class="flex flex-wrap justify-center gap-3 sm:justify-start">
        <RouterLink to="/join">
          <UiButton intent="primary" size="lg">У меня есть инвайт</UiButton>
        </RouterLink>
        <RouterLink to="/about">
          <UiButton intent="secondary" size="lg">О клубе</UiButton>
        </RouterLink>
        <UiButton
          v-if="!auth.isAuthenticated.value"
          intent="ghost"
          size="lg"
          @click="auth.signIn()"
        >
          Войти
        </UiButton>
      </div>
    </div>
    <p class="text-center text-xs text-text-muted sm:text-left">W01 · Visitor landing</p>
  </section>
</template>
