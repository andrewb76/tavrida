<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { getAuction, type AuctionDetail } from '@/services/auctions';

const props = defineProps<{ userId: string }>();

const auctionIds = ref<string[]>([]);
const auctions = ref<Map<string, AuctionDetail>>(new Map());
const loading = ref(false);

onMounted(() => {
  // Placeholder: will be populated when sellerId-based auction listing is available
  // For now, this component shows the structure for future use
});
</script>

<template>
  <div class="profile-auction-history">
    <p class="profile-auction-history__empty">
      История аукционов будет доступна позже
    </p>
  </div>
</template>

<style scoped>
.profile-auction-history__empty {
  color: var(--color-text-muted, #999);
  font-size: 0.9rem;
  text-align: center;
  padding: 2rem 0;
}
</style>
