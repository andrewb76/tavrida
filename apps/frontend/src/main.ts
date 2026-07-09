import { createLogto } from '@logto/vue';
import { createPinia } from 'pinia';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { createApp } from 'vue';
import { createI18n } from 'vue-i18n';
import App from './App.vue';
import './assets/main.css';
import { createLogtoConfig } from './config/logto';
import { router } from './router';

const i18n = createI18n({
  legacy: false,
  locale: 'ru',
  fallbackLocale: 'ru',
  messages: { ru: {} },
});

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

const logtoConfig = createLogtoConfig();
if (logtoConfig) {
  app.use(createLogto, logtoConfig);
}

app.use(router);
app.use(VueQueryPlugin);
app.use(i18n);

app.mount('#app');

import { useThemeStore } from './stores/theme';
useThemeStore().init();
