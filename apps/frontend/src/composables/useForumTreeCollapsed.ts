import { onMounted, ref } from 'vue';

const STORAGE_KEY = 'tavrida.forum.treeCollapsed';

function readCollapsed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

function writeCollapsed(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Collapsed category ids; default expanded (empty set). */
export function useForumTreeCollapsed() {
  const collapsedIds = ref<Set<string>>(new Set());

  onMounted(() => {
    collapsedIds.value = readCollapsed();
  });

  function toggleCollapse(categoryId: string) {
    const next = new Set(collapsedIds.value);
    if (next.has(categoryId)) next.delete(categoryId);
    else next.add(categoryId);
    collapsedIds.value = next;
    writeCollapsed(next);
  }

  return { collapsedIds, toggleCollapse };
}
