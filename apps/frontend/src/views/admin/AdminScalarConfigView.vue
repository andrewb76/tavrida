<script setup lang="ts">
import { UiButton } from '@tavrida/ui';
import { onMounted, ref } from 'vue';
import { toast } from 'vue-sonner';
import {
  deleteScalarKey,
  fetchClubSettings,
  fetchScalarRegistry,
  saveClubSettings,
  type ClubSettings,
  type ScalarRegistryEntry,
} from '@/services/scalarConfigAdmin';
import { useClubAccessStore } from '@/stores/clubAccess';

const loading = ref(true);
const saving = ref(false);
const deletingKey = ref<string | null>(null);
const error = ref('');
const registry = ref<ScalarRegistryEntry[]>([]);
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
    const [club, rows] = await Promise.all([fetchClubSettings(), fetchScalarRegistry()]);
    applySettings(club);
    registry.value = rows;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить scalar-config';
  } finally {
    loading.value = false;
  }
}

async function removeKey(entry: ScalarRegistryEntry) {
  if (!window.confirm(`Удалить ключ ${entry.key} и его значение?`)) return;

  deletingKey.value = entry.key;
  error.value = '';
  try {
    await deleteScalarKey(entry.key);
    registry.value = await fetchScalarRegistry();
    toast.success(`Удалён: ${entry.key}`);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка удаления';
    toast.error(error.value);
  } finally {
    deletingKey.value = null;
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
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
  <section class="space-y-8">
    <div>
      <h2 class="text-lg font-semibold">
        Конфиг (scalar-config)
      </h2>
      <p class="text-sm text-text-muted">
        Скалярный реестр: ключи регистрируют сервисы через <code>sync</code> при старте. Зависшие
        ключи не удаляются автоматически.
      </p>
    </div>

    <section class="space-y-4">
      <h3 class="font-medium">
        Клуб (значения)
      </h3>
      <p class="text-sm text-text-muted">
        Ключи <code class="text-xs">club.*</code> — владелец sync: BFF.
      </p>

      <p
        v-if="loading"
        class="text-sm text-text-muted"
      >
        Загрузка…
      </p>
      <template v-else>
        <p
          v-if="error"
          class="text-sm text-error"
        >
          {{ error }}
        </p>
        <p
          v-else
          class="text-xs text-text-muted"
        >
          Изменения применяются к новым инвайтам (срок и SINGLE/MULTI_USE). BFF читает scalar-config
          при каждом <code>POST /invites</code>.
        </p>

        <form
          class="max-w-lg space-y-4"
          @submit.prevent="save"
        >
          <p
            v-if="!form.inviteOnly"
            class="text-xs text-amber-700 dark:text-amber-400"
          >
            Открытая регистрация: в Logto Console → Sign-in experience снимите «Disable user
            registration». Иначе кнопка «Зарегистрироваться» на лендинге откроет только вход.
          </p>

          <label class="flex items-center gap-2 text-sm">
            <input
              v-model="form.inviteOnly"
              type="checkbox"
              class="size-4 rounded border-border"
            >
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
            >
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
            >
          </label>

          <UiButton
            type="submit"
            intent="primary"
            :disabled="saving"
          >
            {{ saving ? 'Сохранение…' : 'Сохранить' }}
          </UiButton>
        </form>
      </template>
    </section>

    <section
      v-if="!loading"
      class="space-y-4"
    >
      <h3 class="font-medium">
        Реестр ключей
      </h3>
      <p class="text-xs text-text-muted">
        Линейный список (одно значение на ключ). Статус «Зависший» — ключ есть в БД, но сервис
        больше не передаёт его в sync-манифесте.
      </p>

      <div class="overflow-x-auto rounded-lg border border-border">
        <table class="min-w-full text-sm">
          <thead class="bg-bg text-left text-text-muted">
            <tr>
              <th class="px-3 py-2 font-medium">
                Ключ
              </th>
              <th class="px-3 py-2 font-medium">
                Сервис
              </th>
              <th class="px-3 py-2 font-medium">
                Значение
              </th>
              <th class="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="entry in registry"
              :key="entry.key"
              class="border-t border-border"
              :class="entry.syncStatus === 'stale' ? 'bg-amber-500/5' : ''"
            >
              <td class="px-3 py-2">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-mono text-xs">{{ entry.key }}</span>
                  <span
                    v-if="entry.syncStatus === 'stale'"
                    class="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-800 dark:text-amber-300"
                  >
                    Зависший
                  </span>
                </div>
                <div class="text-xs text-text-muted">
                  {{ entry.type }} · {{ entry.description }}
                </div>
              </td>
              <td class="px-3 py-2 text-xs">
                {{ entry.service }}
              </td>
              <td class="px-3 py-2 font-mono text-xs">
                {{ formatValue(entry.value) }}
              </td>
              <td class="px-3 py-2">
                <UiButton
                  v-if="entry.syncStatus === 'stale'"
                  intent="secondary"
                  size="sm"
                  :disabled="deletingKey === entry.key"
                  @click="removeKey(entry)"
                >
                  {{ deletingKey === entry.key ? '…' : 'Удалить' }}
                </UiButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
