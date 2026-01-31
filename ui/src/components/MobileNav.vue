<template>
  <nav class="mobile-nav" v-if="isVisible">
    <div class="nav-items">
      <!-- Home -->
      <button 
        class="nav-item" 
        :class="{ 'active': isHome }"
        @click="goHome"
      >
        <font-awesome-icon icon="home" />
        <span class="nav-label">Home</span>
      </button>

      <!-- Inbox -->
      <button 
        class="nav-item" 
        :class="{ 'active': isInbox }"
        @click="goInbox"
      >
        <font-awesome-icon icon="inbox" />
        <span class="nav-label">Inbox</span>
      </button>

      <!-- Refresh (center, prominent) -->
      <button 
        class="nav-item nav-item--primary" 
        @click="triggerRefresh"
        :disabled="isRefreshing"
      >
        <div class="refresh-button-inner">
          <font-awesome-icon icon="sync-alt" :spin="isRefreshing" />
        </div>
        <span class="nav-label">Refresh</span>
      </button>

      <!-- Copy Email -->
      <button 
        class="nav-item" 
        @click="copyEmail"
        :class="{ 'copied': isCopied }"
      >
        <font-awesome-icon :icon="isCopied ? 'check' : 'copy'" />
        <span class="nav-label">{{ isCopied ? 'Copied!' : 'Copy' }}</span>
      </button>

      <!-- New Email -->
      <button 
        class="nav-item" 
        @click="newEmail"
      >
        <font-awesome-icon icon="dice" />
        <span class="nav-label">New</span>
      </button>
    </div>
  </nav>
</template>

<script>
import config from '@/../config/apiconfig.js'

export default {
  name: 'MobileNav',
  data() {
    return {
      isRefreshing: false,
      isCopied: false,
      windowWidth: window.innerWidth
    }
  },
  computed: {
    isVisible() {
      // Only show on mobile (< 768px) and when not on landing page
      return this.windowWidth < 768 && this.$route.name !== 'Kitten Land'
    },
    isHome() {
      return this.$route.name === 'Kitten Land'
    },
    isInbox() {
      return this.$route.name === 'List' || this.$route.name === 'Message'
    },
    currentEmail() {
      return this.$route.params.email || ''
    },
    fullEmail() {
      if (!this.currentEmail) return ''
      if (this.currentEmail.includes('@')) return this.currentEmail
      return `${this.currentEmail}@${config.domain}`
    }
  },
  mounted() {
    window.addEventListener('resize', this.handleResize)
    this.$eventHub.on('refreshStart', this.onRefreshStart)
    this.$eventHub.on('refreshEnd', this.onRefreshEnd)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize)
    this.$eventHub.off('refreshStart', this.onRefreshStart)
    this.$eventHub.off('refreshEnd', this.onRefreshEnd)
  },
  methods: {
    handleResize() {
      this.windowWidth = window.innerWidth
    },
    goHome() {
      this.triggerHaptic()
      this.$router.push({ name: 'Kitten Land' })
    },
    goInbox() {
      this.triggerHaptic()
      if (this.currentEmail) {
        this.$router.push({ 
          name: 'List', 
          params: { email: this.currentEmail } 
        })
      }
    },
    triggerRefresh() {
      if (this.isRefreshing) return
      this.triggerHaptic('medium')
      this.$eventHub.emit('refresh')
    },
    onRefreshStart() {
      this.isRefreshing = true
    },
    onRefreshEnd() {
      this.isRefreshing = false
    },
    async copyEmail() {
      if (!this.fullEmail) return
      
      this.triggerHaptic()
      try {
        await navigator.clipboard.writeText(this.fullEmail)
        this.isCopied = true
        // Show toast notification
        this.$eventHub.emit('toast', {
          message: `Copied: ${this.fullEmail}`,
          type: 'success',
          duration: 2500
        })
        setTimeout(() => {
          this.isCopied = false
        }, 2000)
      } catch (err) {
        console.error('Failed to copy:', err)
        this.$eventHub.emit('toast', {
          message: 'Failed to copy email',
          type: 'error'
        })
      }
    },
    newEmail() {
      this.triggerHaptic()
      this.$router.push({ name: 'Kitten Land' })
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
@use '@/scss/color' as *;

.mobile-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  padding-bottom: env(safe-area-inset-bottom, 0);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);

  // Dark mode support
  [data-theme='dark'] & {
    background: rgba(30, 41, 59, 0.95);
    border-top-color: rgba(255, 255, 255, 0.1);
  }
}

.nav-items {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  padding: 0.5rem 0.25rem;
  max-width: 500px;
  margin: 0 auto;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  border: none;
  background: transparent;
  color: $gray-500;
  font-size: 0.65rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: $radius;
  transition: all 0.2s ease;
  min-width: 56px;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;

  i {
    font-size: 1.25rem;
    transition: transform 0.2s ease;
  }

  &:active {
    transform: scale(0.92);
  }

  &.active {
    color: #4F46E5;
    
    i {
      transform: scale(1.1);
    }
  }

  &.copied {
    color: #10B981;
  }

  // Primary action (Refresh) - elevated design
  &--primary {
    color: white;
    position: relative;
    margin-top: -1rem;

    .refresh-button-inner {
      width: 52px;
      height: 52px;
      background: linear-gradient(135deg, #10B981, #14B8A6);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
      transition: all 0.2s ease;

      i {
        font-size: 1.25rem;
        color: white;
      }
    }

    &:active .refresh-button-inner {
      transform: scale(0.92);
      box-shadow: 0 2px 10px rgba(16, 185, 129, 0.3);
    }

    &:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .nav-label {
      color: $gray-600;
      margin-top: 0.25rem;
    }
  }
}

.nav-label {
  font-size: 0.65rem;
  font-weight: 500;
  letter-spacing: 0.01em;
}
</style>
