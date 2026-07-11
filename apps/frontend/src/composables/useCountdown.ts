import { computed, onUnmounted, ref } from 'vue';

export function useCountdown(endsAt: () => string | null | undefined) {
  const now = ref(Date.now());
  let timer: ReturnType<typeof setInterval> | undefined;

  const remainingMs = computed(() => {
    const raw = endsAt();
    if (!raw) return 0;
    return Math.max(0, new Date(raw).getTime() - now.value);
  });

  function start() {
    if (timer) return;
    timer = setInterval(() => {
      now.value = Date.now();
    }, 1000);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = undefined;
  }

  onUnmounted(stop);

  return { remainingMs, start, stop, tick: () => { now.value = Date.now(); } };
}
