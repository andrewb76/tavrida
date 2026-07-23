<script setup lang="ts">
import { COOKIE_CATEGORIES, defaultPrefs, type CookieCategoryPrefs } from '@/config/cookie-consent';
import { useCookieConsentStore } from '@/stores/cookieConsent';
import { UiButton } from '@tavrida/ui';
import { onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

const consent = useCookieConsentStore();
const customize = ref(false);
const draft = ref<CookieCategoryPrefs>(defaultPrefs(false));

onMounted(() => {
  consent.init();
  syncDraft();
});

watch(
  () => consent.showBanner,
  (visible) => {
    if (!visible) {
      customize.value = false;
      return;
    }
    syncDraft();
    if (consent.consumeOpenCustomizeFirst()) {
      customize.value = true;
    }
  },
);

function syncDraft() {
  draft.value = consent.record?.categories
    ? { ...consent.record.categories, necessary: true }
    : defaultPrefs(false);
}

function openCustomize() {
  syncDraft();
  customize.value = true;
}

function saveCustom() {
  consent.save({ ...draft.value, necessary: true });
  customize.value = false;
}

function acceptAll() {
  customize.value = false;
  consent.acceptAll();
}

function rejectOptional() {
  customize.value = false;
  consent.rejectOptional();
}
</script>

<template>
  <div
    v-if="consent.showBanner"
    class="cookie-banner"
    role="dialog"
    aria-modal="false"
    aria-labelledby="cookie-banner-title"
    aria-describedby="cookie-banner-desc"
  >
    <div class="cookie-banner__panel">
      <div class="cookie-banner__copy">
        <h2
          id="cookie-banner-title"
          class="cookie-banner__title"
        >
          Мы используем cookie
        </h2>
        <p
          id="cookie-banner-desc"
          class="cookie-banner__text"
        >
          Обязательные cookie нужны для входа и работы сайта.
          Аналитику и маркетинг включаем только с вашего согласия.
          Подробности —
          <RouterLink
            :to="{ name: 'cookies' }"
            class="cookie-banner__link"
          >
            в политике cookie
          </RouterLink>.
        </p>
      </div>

      <div
        v-if="customize"
        class="cookie-banner__customize"
      >
        <fieldset
          v-for="cat in COOKIE_CATEGORIES"
          :key="cat.id"
          class="cookie-banner__cat"
        >
          <label class="cookie-banner__cat-label">
            <input
              v-if="cat.id === 'analytics'"
              v-model="draft.analytics"
              type="checkbox"
              class="cookie-banner__check"
            >
            <input
              v-else-if="cat.id === 'marketing'"
              v-model="draft.marketing"
              type="checkbox"
              class="cookie-banner__check"
            >
            <input
              v-else
              type="checkbox"
              checked
              disabled
              class="cookie-banner__check"
            >
            <span>
              <strong>{{ cat.title }}</strong>
              <span class="cookie-banner__cat-desc">{{ cat.description }}</span>
            </span>
          </label>
        </fieldset>
      </div>

      <div class="cookie-banner__actions">
        <template v-if="customize">
          <UiButton
            intent="primary"
            size="sm"
            type="button"
            @click="saveCustom"
          >
            Сохранить выбор
          </UiButton>
          <UiButton
            intent="secondary"
            size="sm"
            type="button"
            @click="customize = false"
          >
            Назад
          </UiButton>
        </template>
        <template v-else>
          <UiButton
            intent="primary"
            size="sm"
            type="button"
            @click="acceptAll"
          >
            Принять все
          </UiButton>
          <UiButton
            intent="secondary"
            size="sm"
            type="button"
            @click="rejectOptional"
          >
            Только необходимые
          </UiButton>
          <UiButton
            intent="ghost"
            size="sm"
            type="button"
            @click="openCustomize"
          >
            Настроить
          </UiButton>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cookie-banner {
  position: fixed;
  inset-inline: 0;
  bottom: 0;
  z-index: 80;
  padding: 0.75rem;
  pointer-events: none;
}

.cookie-banner__panel {
  pointer-events: auto;
  margin: 0 auto;
  max-width: 42rem;
  display: grid;
  gap: 0.875rem;
  padding: 1rem 1.125rem;
  border: 1px solid var(--color-border, #d6d3d1);
  border-radius: 12px;
  background: var(--color-surface, #fff);
  color: var(--color-text, #111);
  box-shadow: 0 -8px 32px rgb(0 0 0 / 0.12);
}

.cookie-banner__title {
  margin: 0 0 0.35rem;
  font-size: 1rem;
  font-weight: 650;
  line-height: 1.3;
}

.cookie-banner__text {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.45;
  color: var(--color-text-muted, #57534e);
}

.cookie-banner__link {
  color: var(--color-primary, #2563eb);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.cookie-banner__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.cookie-banner__customize {
  display: grid;
  gap: 0.75rem;
}

.cookie-banner__cat {
  margin: 0;
  padding: 0;
  border: none;
}

.cookie-banner__cat-label {
  display: flex;
  gap: 0.625rem;
  align-items: flex-start;
  font-size: 0.8125rem;
  line-height: 1.4;
  cursor: pointer;
}

.cookie-banner__check {
  margin-top: 0.2rem;
  flex: none;
}

.cookie-banner__cat-desc {
  display: block;
  margin-top: 0.15rem;
  color: var(--color-text-muted, #57534e);
  font-weight: 400;
}

@media (min-width: 640px) {
  .cookie-banner {
    padding: 1rem 1.25rem;
  }

  .cookie-banner__panel {
    padding: 1.125rem 1.25rem;
  }
}
</style>
