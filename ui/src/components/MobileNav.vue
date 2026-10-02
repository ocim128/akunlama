<template>
  <nav class="mobile-nav" v-if="isVisible" aria-label="Mobile inbox actions">
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
        aria-label="Refresh inbox"
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
        :aria-label="isCopied ? 'Email address copied' : 'Copy email address'"
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
import config from '@/../config/apiconfig'

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
@use "../scss/color" as *;

.mobile-nav { position: fixed; bottom: 0; left: 0; right: 0; z-index: 1000; background: var(--color-surface); border-top: 1px solid $gray-200; padding-bottom: env(safe-area-inset-bottom, 0px); }
.nav-items { display: flex; align-items: center; justify-content: space-around; height: 76px; max-width: 500px; margin: 0 auto; padding: 0.5rem; }
.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-width: 48px;
  min-height: 52px;
  padding: 0.5rem;
  border-radius: 10px;
  color: $muted-text;
  svg { font-size: 1.1rem; }
  &:hover { background: $gray-100; }
  &:active { background: var(--color-accent-soft); }
  &.active, &.copied { color: $primary; }
  &:disabled { opacity: 0.5; }
}
.nav-item--primary {
  gap: 0.2rem;
  .refresh-button-inner { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 10px; background: var(--color-action); color: white; }
}
.nav-label { font-size: 0.65rem; font-weight: 600; }
</style>
