<script setup lang="ts">
import { UiButton } from '@tavrida/ui';
import { onMounted, ref } from 'vue';
import { toast } from 'vue-sonner';
import {
  deleteScalarKey,
  fetchChatSettings,
  fetchClubSettings,
  fetchForumSettings,
  fetchScalarRegistry,
  saveChatSettings,
  saveClubSettings,
  saveForumSettings,
  type ClubSettings,
  type ScalarRegistryEntry,
} from '@/services/scalarConfigAdmin';
import { useClubAccessStore } from '@/stores/clubAccess';

const loading = ref(true);
const saving = ref(false);
const savingForum = ref(false);
const savingChat = ref(false);
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

const forumForm = ref({
  editWindowMinutes: 10,
  voteChangeWindowMinutes: 3,
});

const chatForm = ref({
  spawnCopyHistoryMax: 100,
  editWindowMinutes: 15,
  deleteOwnWindowMinutes: 60,
  lengthHardMax: 10000,
  authorJoinOnPublish: true,
  joinOnComment: true,
  selfAutoCreate: true,
  markReadOnOpen: true,
  defaultFilter: 'ALL' as 'ALL' | 'DIRECT' | 'GROUP' | 'TOPIC',
  leaveKeepsHistory: true,
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
    const [club, forum, chat, rows] = await Promise.all([
      fetchClubSettings(),
      fetchForumSettings(),
      fetchChatSettings(),
      fetchScalarRegistry(),
    ]);
    applySettings(club);
    forumForm.value.editWindowMinutes = forum['edit.windowMinutes'] ?? 10;
    forumForm.value.voteChangeWindowMinutes = forum['vote.changeWindowMinutes'] ?? 3;
    chatForm.value.spawnCopyHistoryMax = chat['spawn.copyHistoryMax'] ?? 100;
    chatForm.value.editWindowMinutes = chat['message.editWindowMinutes'] ?? 15;
    chatForm.value.deleteOwnWindowMinutes = chat['message.deleteOwnWindowMinutes'] ?? 60;
    chatForm.value.lengthHardMax = chat['message.lengthHardMax'] ?? 10000;
    chatForm.value.authorJoinOnPublish = chat['topic.authorJoinOnPublish'] ?? true;
    chatForm.value.joinOnComment = chat['topic.joinOnComment'] ?? true;
    chatForm.value.selfAutoCreate = chat['dm.selfAutoCreate'] ?? true;
    chatForm.value.markReadOnOpen = chat['unread.markReadOnOpen'] ?? true;
    chatForm.value.defaultFilter =
      (chat['list.defaultFilter'] as typeof chatForm.value.defaultFilter) ?? 'ALL';
    chatForm.value.leaveKeepsHistory = chat['group.leaveKeepsHistory'] ?? true;
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

async function saveForum() {
  savingForum.value = true;
  error.value = '';
  try {
    const updated = await saveForumSettings({
      'edit.windowMinutes': Number(forumForm.value.editWindowMinutes),
      'vote.changeWindowMinutes': Number(forumForm.value.voteChangeWindowMinutes),
    });
    forumForm.value.editWindowMinutes = updated['edit.windowMinutes'] ?? 10;
    forumForm.value.voteChangeWindowMinutes = updated['vote.changeWindowMinutes'] ?? 3;
    registry.value = await fetchScalarRegistry();
    toast.success('Настройки форума сохранены');
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка сохранения форума';
    toast.error(error.value);
  } finally {
    savingForum.value = false;
  }
}

async function saveChat() {
  savingChat.value = true;
  error.value = '';
  try {
    const updated = await saveChatSettings({
      'spawn.copyHistoryMax': Number(chatForm.value.spawnCopyHistoryMax),
      'message.editWindowMinutes': Number(chatForm.value.editWindowMinutes),
      'message.deleteOwnWindowMinutes': Number(chatForm.value.deleteOwnWindowMinutes),
      'message.lengthHardMax': Number(chatForm.value.lengthHardMax),
      'topic.authorJoinOnPublish': chatForm.value.authorJoinOnPublish,
      'topic.joinOnComment': chatForm.value.joinOnComment,
      'dm.selfAutoCreate': chatForm.value.selfAutoCreate,
      'unread.markReadOnOpen': chatForm.value.markReadOnOpen,
      'list.defaultFilter': chatForm.value.defaultFilter,
      'group.leaveKeepsHistory': chatForm.value.leaveKeepsHistory,
    });
    chatForm.value.spawnCopyHistoryMax = updated['spawn.copyHistoryMax'] ?? 100;
    chatForm.value.editWindowMinutes = updated['message.editWindowMinutes'] ?? 15;
    chatForm.value.deleteOwnWindowMinutes = updated['message.deleteOwnWindowMinutes'] ?? 60;
    chatForm.value.lengthHardMax = updated['message.lengthHardMax'] ?? 10000;
    chatForm.value.authorJoinOnPublish = updated['topic.authorJoinOnPublish'] ?? true;
    chatForm.value.joinOnComment = updated['topic.joinOnComment'] ?? true;
    chatForm.value.selfAutoCreate = updated['dm.selfAutoCreate'] ?? true;
    chatForm.value.markReadOnOpen = updated['unread.markReadOnOpen'] ?? true;
    chatForm.value.defaultFilter =
      (updated['list.defaultFilter'] as typeof chatForm.value.defaultFilter) ?? 'ALL';
    chatForm.value.leaveKeepsHistory = updated['group.leaveKeepsHistory'] ?? true;
    registry.value = await fetchScalarRegistry();
    toast.success('Настройки чата сохранены');
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка сохранения чата';
    toast.error(error.value);
  } finally {
    savingChat.value = false;
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

    <section class="space-y-4">
      <h3 class="font-medium">
        Форум
      </h3>
      <p class="text-sm text-text-muted">
        Ключ <code class="text-xs">forum.edit.windowMinutes</code> — владелец sync: forum (BFF).
      </p>

      <form
        v-if="!loading"
        class="max-w-lg space-y-4"
        @submit.prevent="saveForum"
      >
        <label class="block text-sm">
          <span class="text-text-muted">Окно редактирования поста/комментария (минуты)</span>
          <input
            v-model.number="forumForm.editWindowMinutes"
            type="number"
            min="-1"
            step="1"
            class="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2"
          >
        </label>
        <p class="text-xs text-text-muted">
          <code>0</code> — редактирование запрещено,
          <code>-1</code> — без ограничения по времени,
          положительное число — сколько минут после публикации можно править свой текст.
        </p>
        <label class="block text-sm">
          <span class="text-text-muted">Окно смены +/- голоса (минуты)</span>
          <input
            v-model.number="forumForm.voteChangeWindowMinutes"
            type="number"
            min="-1"
            step="1"
            class="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2"
          >
        </label>
        <p class="text-xs text-text-muted">
          Ключ <code class="text-xs">forum.vote.changeWindowMinutes</code>.
          С момента первого голоса:
          <code>0</code> — нельзя менять,
          <code>-1</code> — всегда,
          иначе N минут (сменить +↔− или снять).
        </p>
        <UiButton
          type="submit"
          intent="primary"
          :disabled="savingForum"
        >
          {{ savingForum ? 'Сохранение…' : 'Сохранить форум' }}
        </UiButton>
      </form>
    </section>

    <section class="space-y-4">
      <h3 class="font-medium">
        Чаты
      </h3>
      <p class="text-sm text-text-muted">
        Ключи <code class="text-xs">chat.*</code> — sync при старте BFF. Тарифные флаги и лимиты —
        во вкладке <strong>Чаты</strong> в plan-config (в т.ч.
        <code class="text-xs">forum.author.13topic.chatEnabled</code> на вкладке Форум).
      </p>

      <form
        v-if="!loading"
        class="max-w-lg space-y-4"
        @submit.prevent="saveChat"
      >
        <label class="block text-sm">
          <span class="text-text-muted">Spawn: max копируемой истории</span>
          <input
            v-model.number="chatForm.spawnCopyHistoryMax"
            type="number"
            min="0"
            class="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2"
          >
        </label>
        <label class="block text-sm">
          <span class="text-text-muted">Окно правки сообщения (мин)</span>
          <input
            v-model.number="chatForm.editWindowMinutes"
            type="number"
            min="-1"
            class="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2"
          >
        </label>
        <label class="block text-sm">
          <span class="text-text-muted">Окно удаления своего сообщения (мин)</span>
          <input
            v-model.number="chatForm.deleteOwnWindowMinutes"
            type="number"
            min="-1"
            class="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2"
          >
        </label>
        <label class="block text-sm">
          <span class="text-text-muted">Жёсткий max длины сообщения</span>
          <input
            v-model.number="chatForm.lengthHardMax"
            type="number"
            min="1"
            class="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2"
          >
        </label>
        <label class="block text-sm">
          <span class="text-text-muted">Фильтр списка по умолчанию</span>
          <select
            v-model="chatForm.defaultFilter"
            class="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2"
          >
            <option value="ALL">ALL</option>
            <option value="DIRECT">DIRECT</option>
            <option value="GROUP">GROUP</option>
            <option value="TOPIC">TOPIC</option>
          </select>
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input
            v-model="chatForm.authorJoinOnPublish"
            type="checkbox"
            class="size-4 rounded border-border"
          >
          Автор темы → TOPIC при publish
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input
            v-model="chatForm.joinOnComment"
            type="checkbox"
            class="size-4 rounded border-border"
          >
          Join TOPIC при комментарии
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input
            v-model="chatForm.selfAutoCreate"
            type="checkbox"
            class="size-4 rounded border-border"
          >
          Автосоздание заметок (self-DM)
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input
            v-model="chatForm.markReadOnOpen"
            type="checkbox"
            class="size-4 rounded border-border"
          >
          Mark read при открытии
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input
            v-model="chatForm.leaveKeepsHistory"
            type="checkbox"
            class="size-4 rounded border-border"
          >
          История остаётся после leave
        </label>
        <UiButton
          type="submit"
          intent="primary"
          :disabled="savingChat"
        >
          {{ savingChat ? 'Сохранение…' : 'Сохранить чат' }}
        </UiButton>
      </form>
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
