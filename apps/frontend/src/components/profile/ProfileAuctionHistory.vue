<script setup lang="ts">
defineProps<{ userId: string }>();
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
