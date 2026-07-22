import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getChatsUnread, type ChatUnread } from '@/services/chats';

export const useChatsStore = defineStore('chats', () => {
  const unread = ref<ChatUnread>({ chatsWithUnread: 0, totalUnreadMessages: 0 });
  const loading = ref(false);

  async function refreshUnread() {
    loading.value = true;
    try {
      unread.value = await getChatsUnread();
    } catch {
      /* badge is best-effort */
    } finally {
      loading.value = false;
    }
  }

  return { unread, loading, refreshUnread };
});
