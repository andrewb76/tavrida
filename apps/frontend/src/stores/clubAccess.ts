import { defineStore } from 'pinia';
import { ref } from 'vue';

const DEFAULT_SECTIONS = ['about', 'rules', 'request'];

export const useClubAccessStore = defineStore('clubAccess', () => {
  const loaded = ref(false);
  const inviteOnly = ref(true);
  const landingPublicSections = ref<string[]>([...DEFAULT_SECTIONS]);

  function applyPublicSettings(data: {
    'club.registration.inviteOnly'?: boolean;
    'club.landing.publicSections'?: string[];
  }) {
    inviteOnly.value = data['club.registration.inviteOnly'] ?? true;
    landingPublicSections.value = data['club.landing.publicSections'] ?? [...DEFAULT_SECTIONS];
    loaded.value = true;
  }

  return { loaded, inviteOnly, landingPublicSections, applyPublicSettings };
});
