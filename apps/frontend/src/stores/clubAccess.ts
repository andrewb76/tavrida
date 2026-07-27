import { defineStore } from 'pinia';
import { ref } from 'vue';

const DEFAULT_SECTIONS = ['about', 'rules', 'request'];
const DEFAULT_ASPECT_WIDTH = 4;
const DEFAULT_ASPECT_HEIGHT = 3;

export const useClubAccessStore = defineStore('clubAccess', () => {
  const loaded = ref(false);
  const inviteOnly = ref(true);
  const landingPublicSections = ref<string[]>([...DEFAULT_SECTIONS]);
  const lotImageAspectWidth = ref(DEFAULT_ASPECT_WIDTH);
  const lotImageAspectHeight = ref(DEFAULT_ASPECT_HEIGHT);

  function applyPublicSettings(data: {
    'club.registration.inviteOnly'?: boolean;
    'club.landing.publicSections'?: string[];
    'auction.lot.image.aspectWidth'?: number;
    'auction.lot.image.aspectHeight'?: number;
  }) {
    inviteOnly.value = data['club.registration.inviteOnly'] ?? true;
    landingPublicSections.value = data['club.landing.publicSections'] ?? [...DEFAULT_SECTIONS];
    lotImageAspectWidth.value =
      data['auction.lot.image.aspectWidth'] ?? DEFAULT_ASPECT_WIDTH;
    lotImageAspectHeight.value =
      data['auction.lot.image.aspectHeight'] ?? DEFAULT_ASPECT_HEIGHT;
    loaded.value = true;
  }

  return {
    loaded,
    inviteOnly,
    landingPublicSections,
    lotImageAspectWidth,
    lotImageAspectHeight,
    applyPublicSettings,
  };
});
