<template>
  <div class="nav-email-section">
    <form @submit.prevent="handleSubmit" class="email-form">
      <div class="email-input-group">
        <input 
          class="email-input" 
          name="email" 
          aria-label="Email name"
          autocomplete="off"
          autocapitalize="none"
          spellcheck="false"
          type="text" 
          v-model="internalEmail" 
          id="nav-email-input"
          placeholder="Enter email name"
        />
        <button
          type="button"
          class="domain-suffix" 
          id="nav-domain"
          :class="{ copied: isCopied }"
          :disabled="!internalEmail.trim()"
          :aria-label="isCopied ? 'Email address copied' : 'Copy email address'"
          :title="'Click to copy: ' + fullEmail"
          @click="copyEmail"
        >
          {{ isCopied ? 'Copied!' : '@' + domain }}
        </button>
      </div>
      <div class="action-buttons">
        <button type="submit" class="go-btn" :disabled="!internalEmail.trim()" aria-label="Open inbox">
          <font-awesome-icon icon="paper-plane" />
          <span class="btn-text">Go</span>
        </button>
        <button type="button" class="refresh-btn" @click="$emit('refresh')" :disabled="isRefreshing">
          <font-awesome-icon icon="sync-alt" :spin="isRefreshing" />
          <span class="btn-text">Refresh</span>
        </button>
      </div>
    </form>
    <p v-if="copyError" class="copy-error" role="alert">{{ copyError }}</p>
    <span class="sr-only" role="status">{{ isCopied ? 'Email address copied.' : '' }}</span>
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
      internalEmail: this.email,
      isCopied: false,
      copyError: '',
      copyTimer: null
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
  beforeUnmount() {
    clearTimeout(this.copyTimer)
  },
  methods: {
    handleSubmit() {
      if (!this.internalEmail.trim()) return
      this.$emit('submit-email', this.internalEmail)
    },
    async copyEmail() {
      if (!this.internalEmail.trim()) return
      this.copyError = ''
      try {
        await navigator.clipboard.writeText(this.fullEmail)
        clearTimeout(this.copyTimer)
        this.isCopied = true
        this.copyTimer = setTimeout(() => { this.isCopied = false }, 2000)
      } catch (_) {
        this.isCopied = false
        this.copyError = 'Unable to copy. Select the address and copy it manually.'
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@use "../../scss/color" as *;

.nav-email-section { flex: 1; min-width: 0; }
.email-form { display: flex; align-items: center; gap: 0.75rem; width: 100%; }
.email-input-group {
  display: flex;
  flex: 1;
  min-width: 0;
  background: var(--color-background);
  border: 1px solid $gray-300;
  border-radius: 10px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  &:focus-within { border-color: $primary; box-shadow: 0 0 0 3px var(--color-accent-soft); }
}
.email-input {
  flex: 1;
  width: 0;
  min-width: 0;
  min-height: 44px;
  border: none;
  border-radius: 10px 0 0 10px;
  padding: 0.65rem 0.75rem;
  font-size: 1rem;
  color: $dark-text;
  background: transparent;
  outline: none;
  &::placeholder { color: $muted-text; }
}
.domain-suffix {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 0.75rem;
  max-width: 55%;
  overflow-wrap: anywhere;
  border-left: 1px solid $gray-200;
  border-radius: 0 10px 10px 0;
  font-size: 0.8rem;
  font-weight: 500;
  color: $primary;
  min-height: 44px;
  &:hover:not(:disabled), &.copied { background: var(--color-accent-soft); }
  &:focus-visible { outline-offset: -4px; }
}
.action-buttons {
  display: flex;
  gap: 0.5rem;
  button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.65rem 1rem;
    border-radius: 10px;
    font-weight: 600;
    font-size: 0.8rem;
    min-height: 44px;
    min-width: 44px;
    &:disabled { opacity: 0.5; }
  }
  .go-btn { background: var(--color-action); color: white; &:hover:not(:disabled) { background: var(--color-action-hover); } }
  .refresh-btn { background: var(--color-surface); border: 1px solid $gray-300; color: $muted-text; &:hover:not(:disabled) { background: $gray-100; } }
}
.copy-error { color: $muted-text; margin: 0.5rem 0 0; font-size: 0.75rem; }
@media (max-width: 767px) {
  .email-form { gap: 0.5rem; }
  .action-buttons .refresh-btn { display: none; }
  .action-buttons .btn-text { display: none; }
  .action-buttons button { padding: 0.65rem; }
  .domain-suffix { padding: 0.5rem; font-size: 0.75rem; }
}
</style>
