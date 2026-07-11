<script setup lang="ts">
import { UiButton } from '@tavrida/ui';
import { onMounted, ref } from 'vue';
import { toast } from 'vue-sonner';
import {
  fetchClubSettings,
  saveClubSettings,
  type ClubSettings,
} from '@/services/settings';
import { useClubAccessStore } from '@/stores/clubAccess';

const loading = ref(true);
const saving = ref(false);
const error = ref('');
const clubAccess = useClubAccessStore();

const form = ref({
  inviteOnly: true,
  validityDays: 14,
  codeType: 'SINGLE_USE' as 'SINGLE_USE' | 'MULTI_USE',
  publicSections: 'about, rules, request',
});

function applySettings(data: ClubSettings) {
  form.value.inviteOnly = data['registration.inviteOnly'] ?? true;
  form.value.validityDays = data['invite.validityDays'] ?? 14;
  form.value.codeType = data['invite.codeType'] ?? 'SINGLE_USE';
  form.value.publicSections = (data['landing.publicSections'] ?? ['about', 'rules', 'request']).join(
    ', ',
  );
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    applySettings(await fetchClubSettings());
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить настройки';
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  error.value = '';
  try {
    const sections = form.value.publicSections
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const updated = await saveClubSettings({
      'registration.inviteOnly': form.value.inviteOnly,
      'invite.validityDays': Number(form.value.validityDays),
      'invite.codeType': form.value.codeType,
      'landing.publicSections': sections,
    });
    applySettings(updated);
    clubAccess.applyPublicSettings({
      'club.registration.inviteOnly': updated['registration.inviteOnly'],
      'club.landing.publicSections': updated['landing.publicSections'],
    });
    toast.success('Настройки сохранены');
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка сохранения';
    toast.error(error.value);
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>

<template>
  <section class="space-y-4">
    <div>
      <h2 class="text-lg font-semibold">Клуб (BFF → settings)</h2>
      <p class="text-sm text-text-muted">
        Ключи домена <code class="text-xs">club.*</code> из PLATFORM-REGISTRY. Регистрация при старте BFF.
      </p>
    </div>

    <p v-if="loading" class="text-sm text-text-muted">Загрузка…</p>
    <template v-else>
      <p v-if="error" class="text-sm text-error">{{ error }}</p>
      <p v-else class="text-xs text-text-muted">
        Изменения применяются к новым инвайтам (срок и SINGLE/MULTI_USE). BFF читает settings при каждом
        <code>POST /invites</code>.
      </p>

      <form class="max-w-lg space-y-4" @submit.prevent="save">
      <p v-if="!form.inviteOnly" class="text-xs text-amber-700 dark:text-amber-400">
        Открытая регистрация: в Logto Console → Sign-in experience снимите «Disable user registration».
        Иначе кнопка «Зарегистрироваться» на лендинге откроет только вход.
      </p>

      <label class="flex items-center gap-2 text-sm">
        <input v-model="form.inviteOnly" type="checkbox" class="size-4 rounded border-border" />
        Только регистрация по инвайту
        <span class="text-text-muted">(club.registration.inviteOnly)</span>
      </label>

      <label class="block text-sm">
        <span class="text-text-muted">Срок invite (дни) — club.invite.validityDays</span>
        <input
          v-model.number="form.validityDays"
          type="number"
          min="1"
          class="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2"
        />
      </label>

      <label class="block text-sm">
        <span class="text-text-muted">Тип кода — club.invite.codeType</span>
        <select
          v-model="form.codeType"
          class="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2"
        >
          <option value="SINGLE_USE">SINGLE_USE</option>
          <option value="MULTI_USE">MULTI_USE</option>
        </select>
      </label>

      <label class="block text-sm">
        <span class="text-text-muted">Секции лендинга (через запятую)</span>
        <input
          v-model="form.publicSections"
          type="text"
          class="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 font-mono text-sm"
          placeholder="about, rules, request"
        />
      </label>

      <UiButton type="submit" intent="primary" :disabled="saving">
        {{ saving ? 'Сохранение…' : 'Сохранить' }}
      </UiButton>
      </form>
    </template>
  </section>
</template>
