<template>
  <div class="message-header">
    <!-- Loading Skeleton -->
    <div v-if="loading" class="header-skeleton" role="status" aria-label="Loading message">
      <div class="skeleton-subject"></div>
      <div class="skeleton-meta">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-info">
          <div class="skeleton-line w-40"></div>
          <div class="skeleton-line w-20"></div>
        </div>
      </div>
    </div>

    <!-- Actual Content -->
    <template v-else>
      <div class="message-subject">
        <h1>{{ emailContent.subject || '(No Subject)' }}</h1>
      </div>
      
      <div class="message-meta">
        <div class="sender-info">
          <div class="sender-avatar" :style="{ backgroundColor: avatarColor }">
            <span class="avatar-initials">{{ initials }}</span>
          </div>
          <div class="sender-details">
            <div class="sender-name">
              <strong>{{ emailContent.name || defaultName }}</strong>
              <span class="sender-email">&lt;{{ emailContent.emailAddress }}&gt;</span>
            </div>
            <div class="recipients">
              <span class="label">to:</span>
              <span class="recipient-list">{{ emailContent.recipients }}</span>
            </div>
          </div>
        </div>
        <div class="message-date">{{ formattedDate }}</div>
      </div>
    </template>
  </div>
</template>

<script>
import dayjs from 'dayjs'

export default {
  name: 'MessageHeader',
  props: {
    loading: Boolean,
    emailContent: {
      type: Object,
      required: true
    }
  },
  computed: {
    avatarColor() {
      const colors = [
        '#4338CA', '#6D28D9', '#047857', '#0E7490', '#1D4ED8', '#BE185D'
      ]
      const email = this.emailContent.emailAddress
      if (!email) return colors[0]
      let hash = 0
      for (let i = 0; i < email.length; i++) {
        hash = email.charCodeAt(i) + ((hash << 5) - hash)
      }
      return colors[Math.abs(hash) % colors.length]
    },
    initials() {
      const name = this.emailContent.name
      const email = this.emailContent.emailAddress
      if (name && name.trim()) {
        const parts = name.trim().split(/\s+/)
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        return name.substring(0, 2).toUpperCase()
      }
      if (!email) return '?'
      const username = email.split('@')[0]
      return username.substring(0, 2).toUpperCase()
    },
    defaultName() {
      const email = this.emailContent.emailAddress
      if (!email) return 'Unknown'
      let parts = email.split('@')
      return parts[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    },
    formattedDate() {
      const dateString = this.emailContent.Date
      if (!dateString) return 'Unknown time'
      let date = dayjs(dateString)
      if (!date.isValid()) return 'Unknown time'
      let now = dayjs()
      let diff = now.diff(date, 'days')
      if (diff === 0) return `Today, ${date.format('h:mm A')}`
      if (diff === 1) return `Yesterday, ${date.format('h:mm A')}`
      if (diff < 7) return date.format('dddd, h:mm A')
      return date.format('MMM DD, YYYY [at] h:mm A')
    }
  }
}
</script>

<style lang="scss" scoped>
@use "../../scss/color" as *;

.message-header { background: var(--color-surface); border-bottom: 1px solid $gray-200; flex-shrink: 0; }
.message-subject {
  padding: 1.75rem 1.5rem 1rem;
  h1 { margin: 0; color: $dark-text; font-size: clamp(1.25rem, 2vw, 1.65rem); font-weight: 650; line-height: 1.35; letter-spacing: -0.035em; overflow-wrap: anywhere; }
}
.message-meta { padding: 0 1.5rem 1.5rem; display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.sender-info { display: flex; align-items: flex-start; gap: 0.75rem; flex: 1; min-width: 0; }
.sender-avatar { display: grid; place-items: center; width: 40px; height: 40px; flex-shrink: 0; border-radius: 12px; color: white; font-size: 0.8rem; font-weight: 600; }
.sender-details { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.sender-name { color: $dark-text; font-size: 0.875rem; .sender-email { display: block; color: $muted-text; font-size: 0.75rem; } }
.recipients { color: $muted-text; font-size: 0.75rem; margin-top: 0.25rem; .label { margin-right: 0.25rem; } }
.message-date { color: $muted-text; font-size: 0.75rem; }
.header-skeleton { padding: 1.5rem; }
.skeleton-subject { height: 28px; background: $gray-200; border-radius: 6px; width: 60%; margin-bottom: 24px; animation: pulse 2s infinite; }
.skeleton-meta { display: flex; gap: 16px; animation: pulse 2s infinite; }
.skeleton-avatar { width: 40px; height: 40px; border-radius: 12px; background: $gray-200; }
.skeleton-info { flex: 1; display: flex; flex-direction: column; gap: 8px; justify-content: center; }
.skeleton-line { height: 16px; background: $gray-200; border-radius: 4px; &.w-40 { width: 40%; } &.w-20 { width: 20%; } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
@media (max-width: 767px) {
  .message-subject { padding: 1.25rem 1rem 1rem; }
  .message-meta { padding: 0 1rem 1rem; }
}
</style>
