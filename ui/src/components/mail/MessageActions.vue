<template>
  <div class="message-actions">
    <div class="actions-left">
      <button class="action-btn" @click="$emit('back')" title="Back to inbox">
        <font-awesome-icon icon="arrow-left" />
        <span>Back</span>
      </button>
      <button class="action-btn" @click="$emit('refresh')" :disabled="isRefreshing" title="Refresh message">
        <font-awesome-icon icon="sync-alt" :spin="isRefreshing" />
        <span>Refresh</span>
      </button>
    </div>
    <div class="actions-right">
      <button 
        class="action-btn action-btn--icon" 
        @click="$emit('copy')" 
        title="Copy email content"
        :aria-label="showCopiedFeedback ? 'Email content copied' : 'Copy email content'"
        :class="{ 'copied': showCopiedFeedback }"
      >
        <font-awesome-icon :icon="showCopiedFeedback ? 'check' : 'copy'" />
        <span class="action-tooltip">{{ showCopiedFeedback ? 'Copied!' : 'Copy' }}</span>
      </button>
      <button class="action-btn action-btn--icon" @click="$emit('print')" title="Print email" aria-label="Print email">
        <font-awesome-icon icon="print" />
        <span class="action-tooltip">Print</span>
      </button>
      <button class="action-btn action-btn--icon" @click="$emit('download')" title="Download as HTML" aria-label="Download email as HTML">
        <font-awesome-icon icon="download" />
        <span class="action-tooltip">Download</span>
      </button>
    </div>
    <span class="sr-only" role="status">{{ showCopiedFeedback ? 'Email content copied.' : '' }}</span>
  </div>
</template>

<script>
export default {
  name: 'MessageActions',
  props: {
    isRefreshing: Boolean,
    showCopiedFeedback: Boolean
  }
}
</script>

<style lang="scss" scoped>
@use "../../scss/color" as *;

.message-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  flex-shrink: 0;
  .actions-left, .actions-right { display: flex; gap: 0.5rem; }
}
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-width: 44px;
  min-height: 44px;
  padding: 0.5rem 0.75rem;
  background: var(--color-surface);
  border: 1px solid $gray-200;
  border-radius: 8px;
  color: $muted-text;
  font-size: 0.75rem;
  position: relative;
  &:hover:not(:disabled) { background: $gray-100; color: $dark-text; }
  &:disabled { opacity: 0.5; }
  &.copied { color: $primary; background: var(--color-accent-soft); }
}
.action-tooltip {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
@media (max-width: 767px) {
  .message-actions { padding: 0.75rem 1rem; }
  .actions-left .action-btn span { display: none; }
}
</style>
