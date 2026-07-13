/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_MOCK?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_WS_URL?: string;
  readonly VITE_LOGTO_ENDPOINT?: string;
  readonly VITE_LOGTO_APP_ID?: string;
  readonly VITE_LOGTO_API_RESOURCE?: string;
  readonly VITE_IMAGE_PROXY_URL?: string;
  readonly VITE_IMAGE_PROXY_FETCH_BASE_URL?: string;
  readonly VITE_MEDIA_PUBLIC_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}
