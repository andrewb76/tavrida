<script setup lang="ts">
import { UiButton, UiModal } from '@tavrida/ui';
import { onMounted, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import {
  deleteProfileNote,
  fetchProfileNote,
  publicProfileLabel,
  saveProfileNote,
  type ProfileNote,
  type PublicProfile,
} from '@/services/profile';

const props = defineProps<{
  profile: PublicProfile;
}>();

const open = defineModel<boolean>('open', { required: true });

const loading = ref(false);
const saving = ref(false);
const note = ref<ProfileNote | null>(null);
const draft = ref('');

const label = () => publicProfileLabel(props.profile);

async function load() {
  loading.value = true;
  try {
    note.value = await fetchProfileNote(props.profile.userId);
    draft.value = note.value?.text ?? '';
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось загрузить заметку');
  } finally {
    loading.value = false;
  }
}

watch(open, (isOpen) => {
  if (isOpen) void load();
});

onMounted(() => {
  if (open.value) void load();
});

async function save() {
  const text = draft.value.trim();
  if (!text) {
    toast.error('Введите текст заметки');
    return;
  }

  saving.value = true;
  try {
    note.value = await saveProfileNote(props.profile.userId, text);
    draft.value = note.value.text;
    toast.success('Заметка сохранена');
    open.value = false;
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось сохранить');
  } finally {
    saving.value = false;
  }
}

async function remove() {
  if (!note.value) return;
  if (!window.confirm('Удалить заметку?')) return;

  saving.value = true;
  try {
    await deleteProfileNote(note.value.id);
    note.value = null;
    draft.value = '';
    toast.success('Заметка удалена');
    open.value = false;
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось удалить');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <UiModal
    v-model:open="open"
    title="Приватная заметка"
    :description="`Только вы видите эту заметку о ${label()}.`"
  >
    <p
      v-if="loading"
      class="profile-note-modal__status"
    >
      Загрузка…
    </p>
    <template v-else>
      <textarea
        v-model="draft"
        class="profile-note-modal__textarea"
        rows="6"
        maxlength="2000"
        placeholder="Например: внимательный продавец, осторожно со спорами в комментариях"
      />
      <p class="profile-note-modal__counter">
        {{ draft.length }} / 2000
      </p>
      <div class="profile-note-modal__actions">
        <UiButton
          intent="primary"
          :disabled="saving"
          @click="save"
        >
          {{ saving ? 'Сохранение…' : 'Сохранить' }}
        </UiButton>
        <UiButton
          v-if="note"
          intent="secondary"
          :disabled="saving"
          @click="remove"
        >
          Удалить
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>

<style scoped>
.profile-note-modal__status {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-muted, #666);
}

.profile-note-modal__textarea {
  width: 100%;
  resize: vertical;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 0.5rem;
  padding: 0.75rem;
  font: inherit;
  background: var(--color-bg, #fff);
}

.profile-note-modal__counter {
  margin: 0.35rem 0 0;
  font-size: 0.75rem;
  color: var(--color-text-muted, #666);
  text-align: right;
}

.profile-note-modal__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style>
