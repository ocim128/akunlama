<template>
  <teleport to="body">
    <transition-group name="toast-slide" tag="div" class="toast-container">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="[`toast--${toast.type}`]"
        @click="removeToast(toast.id)"
      >
        <div class="toast-icon">
          <i :class="getIcon(toast.type)"></i>
        </div>
        <div class="toast-content">
          <span class="toast-message">{{ toast.message }}</span>
        </div>
      </div>
    </transition-group>
  </teleport>
</template>

<script>
export default {
  name: 'ToastNotification',
  data() {
    return {
      toasts: [],
      nextId: 0
    }
  },
  created() {
    // Listen for toast events
    this.$eventHub.on('toast', this.showToast)
  },
  beforeUnmount() {
    this.$eventHub.off('toast', this.showToast)
  },
  methods: {
    showToast({ message, type = 'info', duration = 3000 }) {
      const id = this.nextId++
      this.toasts.push({ id, message, type })

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10)
      }

      // Auto remove after duration
      setTimeout(() => {
        this.removeToast(id)
      }, duration)
    },
    removeToast(id) {
      const index = this.toasts.findIndex(t => t.id === id)
      if (index > -1) {
        this.toasts.splice(index, 1)
      }
    },
    getIcon(type) {
      const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
      }
      return icons[type] || icons.info
    }
  }
}
</script>

<style lang="scss" scoped>
@use '@/scss/color' as *;

.toast-container {
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  pointer-events: none;
  max-width: calc(100vw - 2rem);

  @media (max-width: 768px) {
    top: calc(0.5rem + env(safe-area-inset-top, 0px));
  }
}

.toast {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  background: white;
  border-radius: 12px;
  box-shadow: 
    0 4px 20px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  pointer-events: auto;
  cursor: pointer;
  min-width: 200px;
  max-width: 100%;

  [data-theme='dark'] & {
    background: $gray-800;
    box-shadow: 
      0 4px 20px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.1);
  }

  &--success {
    .toast-icon {
      color: #10B981;
      background: rgba(16, 185, 129, 0.1);
    }
  }

  &--error {
    .toast-icon {
      color: #EF4444;
      background: rgba(239, 68, 68, 0.1);
    }
  }

  &--warning {
    .toast-icon {
      color: #F59E0B;
      background: rgba(245, 158, 11, 0.1);
    }
  }

  &--info {
    .toast-icon {
      color: #3B82F6;
      background: rgba(59, 130, 246, 0.1);
    }
  }
}

.toast-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  i {
    font-size: 0.9rem;
  }
}

.toast-message {
  font-size: 0.9rem;
  font-weight: 500;
  color: $dark-text;
  line-height: 1.4;
}

// Slide animation
.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: all 0.3s ease;
}

.toast-slide-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.toast-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.toast-slide-move {
  transition: transform 0.3s ease;
}
</style>
