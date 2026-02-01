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
        :class="{ 'copied': showCopiedFeedback }"
      >
        <font-awesome-icon :icon="showCopiedFeedback ? 'check' : 'copy'" />
        <span class="action-tooltip">{{ showCopiedFeedback ? 'Copied!' : 'Copy' }}</span>
      </button>
      <button class="action-btn action-btn--icon" @click="$emit('print')" title="Print email">
        <font-awesome-icon icon="print" />
        <span class="action-tooltip">Print</span>
      </button>
      <button class="action-btn action-btn--icon" @click="$emit('download')" title="Download as HTML">
        <font-awesome-icon icon="download" />
        <span class="action-tooltip">Download</span>
      </button>
    </div>
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
  padding: 0 1rem 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  
  .actions-left, .actions-right { display: flex; gap: 0.5rem; }
}

.action-btn {
  background: $gray-100;
  border: 1px solid $gray-300;
  color: $gray-700;
  padding: 0.5rem 1rem;
  border-radius: $radius;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  min-height: 44px;
  min-width: 44px;

  &:hover:not(:disabled) { background: $gray-200; color: $gray-800; }
  &:active:not(:disabled) { transform: scale(0.97); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }

  &--icon {
    padding: 0.5rem 0.75rem;
    .action-tooltip {
      display: none;
      position: absolute;
      bottom: -2rem;
      left: 50%;
      transform: translateX(-50%);
      background: $gray-800;
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: $radius;
      font-size: 0.75rem;
      white-space: nowrap;
      z-index: 10;
    }
    &:hover .action-tooltip { display: block; }
  }
}

.action-btn.copied {
  background: $success;
  border-color: $success;
  color: white;
}

@media (max-width: 768px) {
  .message-actions {
    padding: 0 1rem 1rem;
    .actions-left { display: none; }
    .action-btn { flex: 1; justify-content: center; }
  }
}

@media (max-width: 480px) {
  .action-btn span { display: none; }
}
</style>
