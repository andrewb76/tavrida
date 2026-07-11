import { storeToRefs } from 'pinia';
import { useClubAccessStore } from '@/stores/clubAccess';

export function useClubAccess() {
  const store = useClubAccessStore();
  return storeToRefs(store);
}
