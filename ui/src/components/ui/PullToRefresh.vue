<template>
  <div 
    class="pull-to-refresh" 
    ref="scrollContainer"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <!-- Pull-to-refresh indicator - Centered overlay style -->
    <transition name="pull-fade">
      <div 
        v-if="pullDistance > 20 || isRefreshingPull"
        class="pull-refresh-overlay"
      >
        <div class="pull-refresh-card" :class="{ 'ready': isPullReady, 'refreshing': isRefreshingPull }">
          <div class="pull-spinner">
            <font-awesome-icon :icon="isRefreshingPull ? 'sync-alt' : (isPullReady ? 'arrow-up' : 'arrow-down')" :spin="isRefreshingPull" />
          </div>
          <span class="pull-label">
            {{ isRefreshingPull ? 'Refreshing...' : (isPullReady ? 'Release!' : 'Pull down') }}
          </span>
        </div>
      </div>
    </transition>

    <!-- Main content wrapper that moves when pulling -->
    <div class="pull-content-wrapper" :style="{ transform: `translateY(${Math.min(pullDistance * 0.3, 30)}px)` }">
      <slot></slot>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PullToRefresh',
  props: {
    isRefreshing: {
      type: Boolean,
      default: false
    },
    threshold: {
      type: Number,
      default: 60
    }
  },
  data() {
    return {
      pullStartY: 0,
      pullDistance: 0,
      isPullReady: false,
      isRefreshingPull: false
    }
  },
  watch: {
    isRefreshing(newVal) {
      if (!newVal && this.isRefreshingPull) {
        // Small delay to show completion
        setTimeout(() => {
          this.resetPull()
        }, 300)
      }
    }
  },
  methods: {
    handleTouchStart(e) {
      const scrollContainer = this.$refs.scrollContainer
      // Only enable pull-to-refresh when at top of scroll
      if (scrollContainer && scrollContainer.scrollTop === 0) {
        this.pullStartY = e.touches[0].clientY
      }
    },
    handleTouchMove(e) {
      if (this.pullStartY === 0 || this.isRefreshingPull) return
      
      const scrollContainer = this.$refs.scrollContainer
      if (scrollContainer && scrollContainer.scrollTop > 0) {
        this.pullStartY = 0
        this.pullDistance = 0
        return
      }

      const currentY = e.touches[0].clientY
      const diff = currentY - this.pullStartY
      
      if (diff > 0) {
        // Apply resistance to pull (slower as you pull further)
        this.pullDistance = Math.min(diff * 0.5, 100)
        this.isPullReady = this.pullDistance >= this.threshold
        
        // Prevent scroll while pulling
        if (this.pullDistance > 10) {
          e.preventDefault()
        }
      }
    },
    handleTouchEnd() {
      if (this.isPullReady && !this.isRefreshingPull) {
        this.triggerPullRefresh()
      } else {
        this.resetPull()
      }
    },
    async triggerPullRefresh() {
      this.isRefreshingPull = true
      this.pullDistance = this.threshold
      
      // Haptic feedback if supported
      this.triggerHaptic('medium')
      
      // Trigger refresh in parent
      this.$emit('refresh')
    },
    resetPull() {
      this.pullDistance = 0
      this.isPullReady = false
      this.isRefreshingPull = false
      this.pullStartY = 0
    },
    triggerHaptic(type = 'light') {
      if ('vibrate' in navigator) {
        const patterns = {
          light: [10],
          medium: [20],
          heavy: [30]
        }
        navigator.vibrate(patterns[type] || patterns.light)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@use "../../scss/color" as *;

.pull-to-refresh {
  height: 100%;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e0 transparent;
  position: relative;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #cbd5e0;
    border-radius: 3px;
    
    &:hover {
      background: #a0aec0;
    }
  }
}

.pull-refresh-overlay {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  pointer-events: none;
}

.pull-refresh-card {
  background: white;
  border-radius: 24px;
  padding: 0.75rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  box-shadow: 
    0 4px 20px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  animation: pulseGlow 1.5s ease-in-out infinite;

  &.ready {
    background: linear-gradient(135deg, #4F46E5, #6366F1);
    color: white;

    .pull-spinner {
      background: rgba(white, 0.2);
      color: white;
    }
  }

  &.refreshing {
    background: $primary;
    color: white;

    .pull-spinner {
      background: rgba(white, 0.2);
      color: white;
    }
  }
}

.pull-spinner {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: $gray-100;
  color: $primary;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;

  i {
    font-size: 0.9rem;
  }
}

.pull-label {
  font-weight: 600;
  font-size: 0.9rem;
}

@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05); }
  50% { box-shadow: 0 6px 30px rgba(79, 70, 229, 0.25), 0 0 0 1px rgba(79, 70, 229, 0.1); }
}

.pull-fade-enter-active,
.pull-fade-leave-active {
  transition: all 0.2s ease;
}

.pull-fade-enter-from,
.pull-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.pull-content-wrapper {
  transition: transform 0.1s ease-out;
  will-change: transform;
}
</style>
