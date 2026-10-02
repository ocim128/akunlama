<template>
  <div class="empty-state">
    <div class="empty-state-content">
      <div class="kitten-animation-container">
        <font-awesome-icon icon="cat" size="3x" class="cat-icon-animation" />
        <img src="@/assets/sleeping-kitten-400.webp" width="400" height="400" alt="" class="sleeping-kitten">
      </div>
      <h1>No messages. Cat's napping.</h1>
      <p>Send an email to the address above. We'll keep watch and show new messages here automatically.</p>
      
      <div class="empty-refresh-info">
          <p class="last-refreshed">Last checked: {{ formattedLastRefreshed }}</p>
          <p class="countdown">Next check in: {{ countdown }}s</p>
      </div>

      <button class="refresh-button" @click="$emit('refresh')" :disabled="isRefreshing">
        <font-awesome-icon icon="sync-alt" :spin="isRefreshing" />
        Check for messages
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'EmptyInbox',
  props: {
    isRefreshing: {
      type: Boolean,
      default: false
    },
    formattedLastRefreshed: {
      type: String,
      required: true
    },
    countdown: {
      type: Number,
      required: true
    }
  }
}
</script>

<style lang="scss" scoped>
@use "../../scss/color" as *;

.empty-state { display: flex; align-items: center; justify-content: center; padding: 2rem 1.5rem; }
.empty-state-content {
  text-align: center;
  max-width: 320px;
  h1 { color: $dark-text; font-family: var(--font-display); font-size: 1.4rem; line-height: 1.3; letter-spacing: -0.04em; font-weight: 650; margin: 0 0 0.75rem; }
  p { color: $muted-text; font-size: 0.875rem; line-height: 1.75; margin: 0 0 1.5rem; }
}
.kitten-animation-container {
  position: relative;
  margin: 0 auto 1.5rem;
  width: 120px;
  .sleeping-kitten { width: 120px; height: 120px; object-fit: contain; border-radius: 24px; }
  .cat-icon-animation { position: absolute; bottom: -6px; right: -6px; width: 32px; height: 32px; padding: 8px; border-radius: 10px; background: var(--color-accent-soft); color: $primary; border: 2px solid var(--color-surface); }
}
.empty-refresh-info {
  border-top: 1px solid $gray-200;
  padding-top: 1rem;
  margin-bottom: 1.25rem;
  p { margin: 0.25rem 0; font-size: 0.75rem; }
  .countdown { color: $primary; }
}
.refresh-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 44px;
  border: 1px solid $gray-300;
  border-radius: 10px;
  padding: 0.65rem 1rem;
  color: $dark-text;
  font-size: 0.8rem;
  font-weight: 600;
  &:hover:not(:disabled) { background: $gray-100; }
  &:disabled { opacity: 0.5; }
}
</style>
