<template>
  <div class="nav-email-section">
    <form @submit.prevent="handleSubmit" class="email-form">
      <div class="email-input-group">
        <input 
          class="email-input" 
          name="email" 
          aria-label="email" 
          type="text" 
          v-model="internalEmail" 
          id="nav-email-input"
          placeholder="Enter email name"
        />
        <div 
          class="domain-suffix" 
          id="nav-domain" 
          :title="'Click to copy: ' + fullEmail"
          @click="copyEmail"
        >
          @{{ domain }}
        </div>
      </div>
      <div class="action-buttons">
        <button type="submit" class="go-btn">
          <font-awesome-icon icon="paper-plane" />
          <span class="btn-text">Go</span>
        </button>
        <button type="button" class="refresh-btn" @click="$emit('refresh')" :disabled="isRefreshing">
          <font-awesome-icon icon="sync-alt" :spin="isRefreshing" />
          <span class="btn-text">Refresh</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import config from '@/../config/apiconfig'

export default {
  name: 'EmailInputGroup',
  emits: ['submit-email', 'refresh', 'update:email'],
  props: {
    email: {
      type: String,
      default: ''
    },
    isRefreshing: Boolean
  },
  data() {
    return {
      internalEmail: this.email
    }
  },
  computed: {
    domain() {
      return config.domain
    },
    fullEmail() {
      if (this.internalEmail.includes('@' + config.domain)) {
        return this.internalEmail
      }
      return this.internalEmail + '@' + config.domain
    }
  },
  watch: {
    email(newVal) {
      this.internalEmail = newVal
    },
    internalEmail(newVal) {
      this.$emit('update:email', newVal)
    }
  },
  methods: {
    handleSubmit() {
      if (!this.internalEmail.trim()) return
      this.$emit('submit-email', this.internalEmail)
    },
    copyEmail() {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(this.fullEmail).then(() => {
          this.showCopyFeedback()
        }).catch(() => {})
      }
    },
    showCopyFeedback() {
      const domainEl = document.getElementById('nav-domain')
      if (!domainEl) return
      
      domainEl.classList.add('copied')
      
      const tooltip = document.createElement('div')
      tooltip.className = 'copy-tooltip'
      tooltip.textContent = 'Copied!'
      domainEl.appendChild(tooltip)
      
      setTimeout(() => {
        tooltip.style.transition = 'opacity 0.3s ease'
        tooltip.style.opacity = '0'
        setTimeout(() => {
          tooltip.remove()
          domainEl.classList.remove('copied')
        }, 300)
      }, 2000)
    }
  }
}
</script>

<style lang="scss" scoped>
@use "../../scss/color" as *;

.nav-email-section {
  flex: 1;
  margin: 0;
}

.email-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
  }
}

.email-input-group {
  display: flex;
  background: var(--color-surface);
  border: 1px solid $gray-300;
  border-radius: $radius-lg;
  overflow: hidden;
  transition: all 0.2s ease;
  flex: 1;

  &:focus-within {
    border-color: $primary;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }

  .email-input {
    flex: 1;
    border: none;
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
    color: $dark-text;
    background: transparent;
    outline: none;

    &::placeholder { color: $gray-400; }
  }

  .domain-suffix {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    background: $gray-50;
    color: $muted-text;
    font-weight: 500;
    border-left: 1px solid $gray-200;
    cursor: pointer;
    user-select: all;
    position: relative;
    transition: all 0.2s ease;
    font-size: 0.9rem;
    min-height: 44px;

    &:hover { background: $gray-100; color: $primary; }
    &.copied { background: $success; color: white; }
  }
}

:deep(.copy-tooltip) {
  position: absolute;
  top: -2.5rem;
  left: 50%;
  transform: translateX(-50%);
  background: $gray-800;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: $radius;
  font-size: 0.75rem;
  white-space: nowrap;
  z-index: 50;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-top-color: $gray-800;
  }
}

.action-buttons {
  display: flex;
  gap: 0.5rem;

  button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-radius: $radius-lg;
    font-weight: 500;
    transition: all 0.2s ease;
    cursor: pointer;
    border: none;
    font-size: 0.9rem;
    min-height: 44px;

    &:disabled { opacity: 0.6; cursor: not-allowed; }
    &:active:not(:disabled) { transform: scale(0.95); }
  }

  .go-btn {
    background: $primary;
    color: white;
    &:hover:not(:disabled) { background: $primary-dark; transform: translateY(-1px); }
  }
  .refresh-btn {
    background: linear-gradient(135deg, #10B981, #14B8A6);
    color: white;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
    &:hover:not(:disabled) { background: linear-gradient(135deg, #059669, #0D9488); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4); }
  }
}

@media (max-width: 768px) {
  .action-buttons { display: none; }
  .email-input-group { border-radius: 8px; }
  .email-input { font-size: 0.9rem; padding: 0.6rem 0.75rem; }
  .domain-suffix { font-size: 0.8rem; padding: 0.6rem 0.5rem; }
}

@media (max-width: 480px) {
  .email-input { font-size: 0.85rem; padding: 0.5rem; }
  .domain-suffix { font-size: 0.75rem; padding: 0.5rem 0.4rem; }
}
</style>
