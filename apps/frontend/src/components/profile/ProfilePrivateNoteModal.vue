<script setup lang="ts">
import { UiButton } from '@tavrida/ui';
import { nextTick, onUnmounted, ref, watch } from 'vue';
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
const emit = defineEmits<{
  'note-changed': [note: ProfileNote | null];
}>();

const loading = ref(false);
const saving = ref(false);
const note = ref<ProfileNote | null>(null);
const draft = ref('');
const dialogRef = ref<HTMLDialogElement | null>(null);

const label = () => publicProfileLabel(props.profile);

let modalLoadGeneration = 0;
let prefetchGeneration = 0;

function close() {
  dialogRef.value?.close();
}

function onDialogClose() {
  if (open.value) {
    open.value = false;
  }
}

function onDialogCancel(event: Event) {
  if (saving.value) {
    event.preventDefault();
  }
}

function onDialogClick(event: MouseEvent) {
  if (event.target === dialogRef.value && !saving.value) {
    close();
  }
}

async function loadForModal(userId: string) {
  const generation = ++modalLoadGeneration;
  loading.value = true;
  note.value = null;
  draft.value = '';
  try {
    const loaded = await fetchProfileNote(userId);
    if (generation !== modalLoadGeneration || userId !== props.profile.userId) return;
    note.value = loaded;
    draft.value = note.value?.text ?? '';
    emit('note-changed', note.value);
  } catch (e) {
    if (generation !== modalLoadGeneration) return;
    toast.error(e instanceof Error ? e.message : 'Не удалось загрузить заметку');
  } finally {
    if (generation === modalLoadGeneration) loading.value = false;
  }
}

async function prefetchPresence(userId: string) {
  const generation = ++prefetchGeneration;
  try {
    const loaded = await fetchProfileNote(userId);
    if (generation !== prefetchGeneration || userId !== props.profile.userId) return;
    emit('note-changed', loaded);
  } catch {
    /* card stays without badge */
  }
}

watch(open, async (isOpen) => {
  if (typeof document === 'undefined') return;

  await nextTick();
  const dialog = dialogRef.value;

  if (isOpen) {
    dialog?.showModal();
    document.body.style.overflow = 'hidden';
    void loadForModal(props.profile.userId);
  } else {
    if (dialog?.open) dialog.close();
    document.body.style.overflow = '';
    modalLoadGeneration += 1;
    note.value = null;
    draft.value = '';
    loading.value = false;
  }
});

watch(
  () => props.profile.userId,
  (userId) => {
    emit('note-changed', null);
    void prefetchPresence(userId);
    if (open.value) void loadForModal(userId);
  },
  { immediate: true },
);

onUnmounted(() => {
  if (typeof document === 'undefined') return;
  document.body.style.overflow = '';
});

async function save() {
  const text = draft.value.trim();
  if (!text) {
    toast.error('Введите текст заметки');
    return;
  }

  saving.value = true;
  const userId = props.profile.userId;
  try {
    const saved = await saveProfileNote(userId, text);
    if (userId !== props.profile.userId) return;
    note.value = saved;
    draft.value = note.value.text;
    emit('note-changed', note.value);
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
    emit('note-changed', null);
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
  <Teleport to="body">
    <dialog
      v-if="open"
      ref="dialogRef"
      class="profile-note-overlay"
      aria-labelledby="profile-note-title"
      @close="onDialogClose"
      @cancel="onDialogCancel"
      @click="onDialogClick"
    >
      <div
        class="profile-note-overlay__panel"
        @click.stop
      >
        <button
          type="button"
          class="profile-note-overlay__close"
          aria-label="Закрыть"
          @click="close"
        >
          ✕
        </button>

        <h2
          id="profile-note-title"
          class="profile-note-overlay__title"
        >
          Приватная заметка
        </h2>
        <p class="profile-note-overlay__description">
          Только вы видите эту заметку о {{ label() }}.
        </p>

        <p
          v-if="loading"
          class="profile-note-modal__status"
        >
          Загрузка…
        </p>
        <template v-else>
          <label class="profile-note-modal__field">
            Текст заметки
            <textarea
              v-model="draft"
              class="profile-note-modal__textarea"
              rows="6"
              maxlength="2000"
              placeholder="Например: внимательный продавец, осторожно со спорами в комментариях"
            />
          </label>
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
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.profile-note-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: none;
  height: 100%;
  max-height: none;
  margin: 0;
  padding: 1rem;
  border: none;
  background: transparent;
}

.profile-note-overlay::backdrop {
  background: rgb(0 0 0 / 50%);
}

.profile-note-overlay__panel {
  position: relative;
  z-index: 1;
  width: min(100%, 28rem);
  border-radius: 0.5rem;
  border: 1px solid var(--color-border, #ddd);
  background: var(--color-surface, #fff);
  padding: 1.5rem;
  box-shadow: 0 10px 40px rgb(0 0 0 / 20%);
}

.profile-note-overlay__close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  color: var(--color-text-muted, #666);
  padding: 0.25rem 0.5rem;
  cursor: pointer;
}

.profile-note-overlay__close:hover {
  background: var(--color-bg, #f5f5f5);
  color: var(--color-text, #111);
}

.profile-note-overlay__title {
  margin: 0 2rem 0.35rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text, #111);
}

.profile-note-overlay__description {
  margin: 0 0 1rem;
  font-size: 0.875rem;
  color: var(--color-text-muted, #666);
}

.profile-note-modal__status {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-muted, #666);
}

.profile-note-modal__field {
  display: grid;
  gap: 0.35rem;
  font-size: 0.875rem;
}

.profile-note-modal__textarea {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 0.5rem;
  padding: 0.75rem;
  font: inherit;
  background: var(--color-bg, #fff);
  color: var(--color-text, #111);
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
