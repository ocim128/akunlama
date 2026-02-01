<template>
  <transition name="slide-up">
    <div v-if="showPrompt" class="install-prompt">
      <div class="install-content">
        <div class="install-icon">
          <img src="@/assets/logo_no_text.svg" alt="Akunlama" />
        </div>
        <div class="install-text">
          <h4>Install Akunlama</h4>
          <p>Add to home screen for quick access</p>
        </div>
        <div class="install-actions">
          <button class="btn-dismiss" @click="dismissPrompt">
            Later
          </button>
          <button class="btn-install" @click="installApp">
            <font-awesome-icon icon="download" />
            Install
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'InstallPrompt',
  data() {
    return {
      deferredPrompt: null,
      showPrompt: false,
      hasBeenDismissed: false
    }
  },
  mounted() {
    // Check if already dismissed or installed
    if (localStorage.getItem('pwa-install-dismissed')) {
      const dismissedTime = parseInt(localStorage.getItem('pwa-install-dismissed'), 10)
      // Don't show again for 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        this.hasBeenDismissed = true
      }
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return
    }

    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', this.handleInstallPrompt)

    // Listen for successful installation
    window.addEventListener('appinstalled', this.handleAppInstalled)
  },
  beforeUnmount() {
    window.removeEventListener('beforeinstallprompt', this.handleInstallPrompt)
    window.removeEventListener('appinstalled', this.handleAppInstalled)
  },
  methods: {
    handleInstallPrompt(e) {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault()
      // Stash the event so it can be triggered later
      this.deferredPrompt = e

      // Show our custom prompt after a delay (let user interact first)
      if (!this.hasBeenDismissed) {
        setTimeout(() => {
          this.showPrompt = true
        }, 30000) // 30 seconds delay
      }
    },
    handleAppInstalled() {
      this.showPrompt = false
      this.deferredPrompt = null
      
      // Show success toast
      this.$eventHub.emit('toast', {
        message: 'App installed successfully! 🎉',
        type: 'success',
        duration: 4000
      })
    },
    async installApp() {
      if (!this.deferredPrompt) return

      // Show the install prompt
      this.deferredPrompt.prompt()

      // Wait for the user to respond
      const { outcome } = await this.deferredPrompt.userChoice

      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
      } else {
        console.log('User dismissed the install prompt')
      }

      this.deferredPrompt = null
      this.showPrompt = false
    },
    dismissPrompt() {
      this.showPrompt = false
      this.hasBeenDismissed = true
      localStorage.setItem('pwa-install-dismissed', Date.now().toString())
    }
  }
}
</script>

<style lang="scss" scoped>
@use "../scss/color" as *;

.install-prompt {
  position: fixed;
  bottom: calc(80px + env(safe-area-inset-bottom, 0px));
  left: 1rem;
  right: 1rem;
  z-index: 999;
  
  @media (min-width: 768px) {
    bottom: 2rem;
    left: auto;
    right: 2rem;
    max-width: 380px;
  }
}

.install-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 16px;
  box-shadow: 
    0 10px 40px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(0, 0, 0, 0.05);

  [data-theme='dark'] & {
    background: $gray-800;
    box-shadow: 
      0 10px 40px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.1);
  }
}

.install-icon {
  width: 48px;
  height: 48px;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.install-text {
  flex: 1;
  min-width: 0;

  h4 {
    margin: 0 0 0.25rem;
    font-size: 1rem;
    font-weight: 600;
    color: $dark-text;
  }

  p {
    margin: 0;
    font-size: 0.85rem;
    color: $muted-text;
  }
}

.install-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-dismiss {
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: none;
  color: $muted-text;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: $radius;
  transition: all 0.2s ease;

  &:hover {
    background: $gray-100;
    color: $dark-text;
  }

  &:active {
    transform: scale(0.95);
  }
}

.btn-install {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #4F46E5, #6366F1);
  border: none;
  color: white;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: $radius;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
  }

  &:active {
    transform: scale(0.95);
  }

  i {
    font-size: 0.8rem;
  }
}

// Slide up animation
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
