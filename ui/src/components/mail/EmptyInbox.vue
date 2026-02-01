<template>
  <div class="empty-state">
    <div class="empty-state-content">
      <div class="kitten-animation-container">
        <font-awesome-icon icon="cat" size="3x" class="cat-icon-animation" />
        <img src="@/assets/sleeping-kitten.png" alt="Sleeping Kitten" class="sleeping-kitten">
      </div>
      <h3>No messages yet</h3>
      <p>Your inbox is empty. Send an email to this address to see it appear here!</p>
      
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

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 2rem;
}

.empty-state-content {
  text-align: center;
  max-width: 400px;

  .kitten-animation-container {
    margin-bottom: 2rem;
    perspective: 1000px;
    display: flex;
    flex-direction: column;
    align-items: center;
    
    .cat-icon-animation {
      color: $primary;
      margin-bottom: 1.5rem;
      animation: gentle-float 4s ease-in-out infinite;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 48px;
      min-height: 48px;
    }

    .sleeping-kitten {
      width: 200px;
      height: auto;
      border-radius: $radius-lg;
      box-shadow: $shadow-lg;
      animation: breathing 4s ease-in-out infinite, gentle-float 6s ease-in-out infinite;
      filter: drop-shadow(0 10px 15px rgba(0, 0, 0, 0.1));
    }
  }

  h3 {
    color: $dark-text;
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    background: linear-gradient(135deg, $primary, $primary-light);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  p {
    color: $muted-text;
    line-height: 1.6;
    margin: 0 0 1.5rem 0;
  }

  .empty-refresh-info {
      margin-bottom: 2rem;
      background: var(--color-background);
      padding: 0.75rem;
      border-radius: $radius;
      border: 1px dashed $gray-200;

      p {
          margin: 0.25rem 0;
          font-size: 0.85rem;
          
          &.last-refreshed {
              color: $muted-text;
          }
          
          &.countdown {
              color: $primary;
              font-weight: 600;
          }
      }
  }
}

@keyframes breathing {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@keyframes gentle-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.refresh-button {
  background: $primary;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: $radius-lg;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 48px;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;

  &:hover:not(:disabled) {
    background: $primary-dark;
    transform: translateY(-1px);
    box-shadow: $shadow;
  }

  &:active:not(:disabled) {
    transform: scale(0.97);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .fa-spin {
    animation-duration: 1s;
  }
}

@media (max-width: 768px) {
  .empty-state {
    padding: 2rem 1rem;
  }

  .empty-state-content {
    h3 { font-size: 1.25rem; }
    p { font-size: 0.9rem; }
  }

  .kitten-animation-container {
    margin-bottom: 1.5rem;
    .sleeping-kitten { width: 100px; }
  }
}

@media (max-width: 480px) {
  .empty-state-content {
    padding: 1rem;
    h3 { font-size: 1.1rem; }
    p { font-size: 0.85rem; }
  }
  .refresh-button {
    font-size: 0.85rem;
    padding: 0.75rem 1.25rem;
  }
}
</style>
