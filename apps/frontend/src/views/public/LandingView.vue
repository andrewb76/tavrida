<script setup lang="ts">
import { UiButton } from '@tavrida/ui';
import { RouterLink } from 'vue-router';
import BrandLogo from '@/components/brand/BrandLogo.vue';
import CookieSettingsLink from '@/components/legal/CookieSettingsLink.vue';
import { useAuth } from '@/composables/useAuth';
import { useClubAccess } from '@/composables/useClubAccess';
import { useThemeStore } from '@/stores/theme';
import heroImage from '@/assets/backgrounds/tavrida-dark.webp';

const auth = useAuth();
const { inviteOnly } = useClubAccess();
const theme = useThemeStore();

const pillars = [
  {
    title: 'Аукционы',
    text: 'Выставляй лот, следи за ставками и сроком. Английский и голландский форматы — по правилам клуба.',
  },
  {
    title: 'Форум',
    text: 'Спроси «что это?», расскажи историю вещи, найди тех, кто уже держал похожее в руках.',
  },
  {
    title: 'Маркет услуг',
    text: 'Реставрация, экспертиза, доставка — заказы между участниками с репутацией, а не с улицы.',
  },
] as const;
</script>

<template>
  <div class="landing">
    <!-- Hero: one composition — brand, headline, line, CTAs, full-bleed visual -->
    <section
      class="landing-hero"
      aria-labelledby="landing-brand"
    >
      <div
        class="landing-hero__media"
        aria-hidden="true"
      >
        <img
          :src="heroImage"
          alt=""
          class="landing-hero__img"
          width="1920"
          height="1080"
          fetchpriority="high"
          decoding="async"
        >
        <div class="landing-hero__wash" />
      </div>

      <div class="landing-hero__copy">
        <div
          id="landing-brand"
          class="landing-hero__brand"
        >
          <BrandLogo
            variant="hero"
            theme="dark"
          />
        </div>
        <h1 class="landing-hero__title">
          Вещь обретает цену, историю и своих людей
        </h1>
        <p class="landing-hero__lead">
          <template v-if="inviteOnly">
            Закрытый клуб увлеченных историей людей — вход только по приглашению.
          </template>
          <template v-else>
            Клуб увлеченных историей людей: аукционы, форум и услуги вокруг вещей.
          </template>
        </p>

        <div class="landing-hero__actions">
          <RouterLink
            v-if="inviteOnly"
            to="/join"
          >
            <UiButton
              intent="primary"
              size="lg"
            >
              У меня есть инвайт
            </UiButton>
          </RouterLink>
          <UiButton
            v-else-if="!auth.isAuthenticated.value"
            intent="primary"
            size="lg"
            @click="auth.signUp()"
          >
            Зарегистрироваться
          </UiButton>
          <RouterLink
            v-else-if="auth.isMember.value"
            to="/app"
          >
            <UiButton
              intent="primary"
              size="lg"
            >
              Перейти в клуб
            </UiButton>
          </RouterLink>

          <RouterLink to="/about">
            <UiButton
              intent="secondary"
              size="lg"
              class="landing-hero__ghost-btn"
            >
              О клубе
            </UiButton>
          </RouterLink>

          <UiButton
            v-if="!auth.isAuthenticated.value"
            intent="ghost"
            size="lg"
            class="landing-hero__ghost-btn"
            @click="auth.signIn()"
          >
            {{ inviteOnly ? 'Уже в клубе — войти' : 'Войти' }}
          </UiButton>
        </div>
      </div>

      <a
        href="#inside"
        class="landing-hero__scroll"
        aria-label="Дальше: что внутри"
      >
        <span class="landing-hero__scroll-line" />
      </a>
    </section>

    <!-- One job: what the club is -->
    <section
      id="inside"
      class="landing-section"
      aria-labelledby="inside-title"
    >
      <div class="landing-section__inner">
        <h2
          id="inside-title"
          class="landing-section__title"
        >
          Три опоры клуба
        </h2>
        <p class="landing-section__lead">
          Не витрина и не «маркетплейс как у всех» — место, где вещь и доверие важнее декора.
        </p>

        <ul class="landing-pillars">
          <li
            v-for="(pillar, i) in pillars"
            :key="pillar.title"
            class="landing-pillar"
            :style="{ '--i': i }"
          >
            <span class="landing-pillar__index">{{ String(i + 1).padStart(2, '0') }}</span>
            <div>
              <h3 class="landing-pillar__title">
                {{ pillar.title }}
              </h3>
              <p class="landing-pillar__text">
                {{ pillar.text }}
              </p>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <!-- One job: how to join -->
    <section
      class="landing-section landing-section--ink"
      aria-labelledby="join-title"
    >
      <div class="landing-section__inner landing-join">
        <h2
          id="join-title"
          class="landing-section__title"
        >
          Как попасть
        </h2>
        <p class="landing-section__lead">
          <template v-if="inviteOnly">
            Код от участника клуба — на странице приглашения. Без инвайта регистрации нет.
          </template>
          <template v-else>
            Создай аккаунт, подтверди почту и зайди в клуб. Приглашения помогают расширять круг доверия.
          </template>
        </p>

        <ol class="landing-steps">
          <li>Получи код от участника (или открой ссылку из письма).</li>
          <li>Активируй приглашение и войди через безопасный вход.</li>
          <li>Откроются аукционы, форум, профиль и кошелёк.</li>
        </ol>

        <div class="landing-join__actions">
          <RouterLink
            v-if="inviteOnly"
            to="/join"
          >
            <UiButton
              intent="primary"
              size="lg"
            >
              Ввести инвайт
            </UiButton>
          </RouterLink>
          <UiButton
            v-else-if="!auth.isAuthenticated.value"
            intent="primary"
            size="lg"
            @click="auth.signUp()"
          >
            Создать аккаунт
          </UiButton>
          <RouterLink to="/about">
            <UiButton
              intent="secondary"
              size="lg"
            >
              Правила и миссия
            </UiButton>
          </RouterLink>
        </div>
      </div>
    </section>

    <footer class="landing-footer">
      <div class="landing-footer__inner">
        <BrandLogo
          variant="compact"
          :theme="theme.mode === 'dark' ? 'dark' : 'light'"
        />
        <p class="text-sm text-text-muted">
          Клуб увлеченных историей людей · Крым и шире
        </p>
        <nav
          class="landing-footer__nav"
          aria-label="Подвал"
        >
          <RouterLink to="/about">
            О клубе
          </RouterLink>
          <RouterLink to="/cookies">
            Политика cookie
          </RouterLink>
          <CookieSettingsLink />
          <RouterLink
            v-if="inviteOnly"
            to="/join"
          >
            Инвайт
          </RouterLink>
          <a
            href="mailto:hello@evatorg.su"
            rel="noopener"
          >Связь</a>
        </nav>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.landing {
  --landing-ink: #0b1f24;
  --landing-chalk: #f2f4f3;
  --landing-patina: #1f7a6e;
  --landing-sand: #c9b89a;
  color: var(--token-text);
}

.landing-hero {
  position: relative;
  display: grid;
  min-height: 100dvh;
  align-items: end;
  overflow: clip;
  color: var(--landing-chalk);
}

.landing-hero__media {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.landing-hero__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 40%;
  transform: scale(1.04);
  animation: landing- ken 28s ease-in-out alternate infinite;
}

.landing-hero__wash {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      180deg,
      rgb(11 31 36 / 0.55) 0%,
      rgb(11 31 36 / 0.35) 42%,
      rgb(11 31 36 / 0.88) 100%
    ),
    radial-gradient(ellipse 80% 50% at 70% 20%, rgb(31 122 110 / 0.22), transparent 55%);
}

.landing-hero__copy {
  position: relative;
  z-index: 1;
  width: min(40rem, 100%);
  padding: clamp(5.5rem, 14vh, 7rem) clamp(1rem, 4vw, 1.5rem) clamp(4rem, 10vh, 5.5rem);
  animation: landing-rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.landing-hero__brand {
  margin: 0 0 0.75rem;
}

.landing-hero__title {
  margin: 0;
  max-width: 18ch;
  font-family: var(--token-font-display, 'Unbounded', system-ui, sans-serif);
  font-size: clamp(1.35rem, 3.4vw, 1.85rem);
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1.25;
  color: rgb(242 244 243 / 0.92);
}

.landing-hero__lead {
  margin: 1rem 0 0;
  max-width: 36ch;
  font-size: 1.05rem;
  line-height: 1.55;
  color: rgb(242 244 243 / 0.72);
}

.landing-hero__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1.75rem;
}

.landing-hero__actions > a {
  display: inline-flex;
}

.landing-hero__ghost-btn {
  color: rgb(242 244 243 / 0.92) !important;
  border-color: rgb(242 244 243 / 0.35) !important;
}

.landing-hero__scroll {
  position: absolute;
  bottom: 1.25rem;
  left: 50%;
  z-index: 1;
  display: flex;
  height: 2.5rem;
  width: 1.25rem;
  align-items: flex-start;
  justify-content: center;
  border: 1px solid rgb(242 244 243 / 0.35);
  border-radius: 999px;
  transform: translateX(-50%);
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.landing-hero__scroll:hover {
  opacity: 1;
}

.landing-hero__scroll-line {
  width: 2px;
  height: 0.55rem;
  margin-top: 0.4rem;
  border-radius: 999px;
  background: rgb(242 244 243 / 0.85);
  animation: landing-scroll-dot 1.6s ease-in-out infinite;
}

.landing-section {
  padding: clamp(3.5rem, 10vh, 5.5rem) 0;
  background: color-mix(in srgb, var(--token-bg) 88%, transparent);
  backdrop-filter: blur(8px);
}

.landing-section--ink {
  background: var(--landing-ink);
  color: var(--landing-chalk);
}

.landing-section--ink .landing-section__lead,
.landing-section--ink .landing-steps {
  color: rgb(242 244 243 / 0.72);
}

.landing-section__inner {
  width: min(52rem, 100%);
  margin-inline: auto;
  padding-inline: clamp(1rem, 4vw, 1.5rem);
}

.landing-section__title {
  margin: 0;
  font-family: var(--token-font-display, 'Unbounded', system-ui, sans-serif);
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 600;
  letter-spacing: -0.02em;
}

.landing-section__lead {
  margin: 0.75rem 0 0;
  max-width: 42ch;
  font-size: 1.05rem;
  line-height: 1.55;
  color: var(--token-text-muted);
}

.landing-pillars {
  display: grid;
  gap: 0;
  margin: 2.5rem 0 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid color-mix(in srgb, var(--token-border) 80%, transparent);
}

.landing-pillar {
  display: grid;
  grid-template-columns: 3.5rem 1fr;
  gap: 1rem;
  padding: 1.35rem 0;
  border-bottom: 1px solid color-mix(in srgb, var(--token-border) 80%, transparent);
  animation: landing-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(0.08s * var(--i, 0));
  animation-timeline: view();
  animation-range: entry 10% cover 30%;
}

.landing-pillar__index {
  font-family: var(--token-font-mono, ui-monospace, monospace);
  font-size: 0.85rem;
  letter-spacing: 0.06em;
  color: var(--landing-patina);
}

.landing-pillar__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
}

.landing-pillar__text {
  margin: 0.35rem 0 0;
  max-width: 48ch;
  line-height: 1.55;
  color: var(--token-text-muted);
}

.landing-join .landing-section__title {
  color: var(--landing-chalk);
}

.landing-steps {
  margin: 1.75rem 0 0;
  padding-left: 1.15rem;
  display: grid;
  gap: 0.65rem;
  max-width: 40ch;
  line-height: 1.5;
}

.landing-join__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-top: 2rem;
}

.landing-join__actions > a {
  display: inline-flex;
}

.landing-footer {
  border-top: 1px solid var(--token-border);
  background: color-mix(in srgb, var(--token-surface) 92%, transparent);
  padding: 2rem 0 2.5rem;
}

.landing-footer__inner {
  width: min(52rem, 100%);
  margin-inline: auto;
  padding-inline: clamp(1rem, 4vw, 1.5rem);
  display: grid;
  gap: 0.35rem;
}

.landing-footer__nav {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 0.75rem;
  font-size: 0.9rem;
}

.landing-footer__nav a {
  color: var(--token-text-muted);
  text-decoration: none;
}

.landing-footer__nav a:hover {
  color: var(--token-primary);
}

@keyframes landing-rise {
  from {
    opacity: 0;
    transform: translateY(1.1rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes landing-ken {
  from {
    transform: scale(1.04) translate3d(0, 0, 0);
  }
  to {
    transform: scale(1.1) translate3d(-1.5%, -1%, 0);
  }
}

@keyframes landing-scroll-dot {
  0%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }
  50% {
    opacity: 1;
    transform: translateY(0.45rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .landing-hero__img,
  .landing-hero__copy,
  .landing-pillar,
  .landing-hero__scroll-line {
    animation: none !important;
  }

  .landing-hero__img {
    transform: none;
  }
}

@supports not (animation-timeline: view()) {
  .landing-pillar {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
</style>
