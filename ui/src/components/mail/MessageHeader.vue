<template>
  <div class="message-header">
    <!-- Loading Skeleton -->
    <div v-if="loading" class="header-skeleton">
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
        '#4F46E5', '#7C3AED', '#EC4899', '#EF4444', '#F97316',
        '#F59E0B', '#10B981', '#14B8A6', '#06B6D4', '#3B82F6',
        '#8B5CF6', '#6366F1', '#D946EF', '#0EA5E9', '#22C55E'
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

.message-header {
  background: var(--color-surface);
  border-bottom: 1px solid $gray-200;
  box-shadow: $shadow-sm;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}

.message-subject {
  padding: 0.75rem 1rem 0.5rem;
  border-bottom: 1px solid $gray-100;
  h1 { margin: 0; font-size: 1.25rem; font-weight: 600; color: $dark-text; line-height: 1.3; }
}

.message-meta {
  padding: 0.5rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.sender-info { display: flex; align-items: flex-start; gap: 1rem; flex: 1; }

.sender-avatar {
  width: 48px;
  height: 48px;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-weight: 600;
  font-size: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.sender-details { flex: 1; min-width: 0; }
.sender-name {
  color: $dark-text;
  margin-bottom: 0.25rem;
  .sender-email { color: $muted-text; font-weight: normal; margin-left: 0.5rem; }
}

.recipients {
  color: $muted-text;
  font-size: 0.9rem;
  .label { margin-right: 0.5rem; }
  .recipient-list { color: $dark-text; }
}

.message-date { color: $muted-text; font-size: 0.9rem; text-align: right; flex-shrink: 0; margin-left: 1rem; }

@media (max-width: 768px) {
  .message-subject { padding: 1rem; h1 { font-size: 1.25rem; } }
  .message-meta { padding: 1rem; flex-direction: column; gap: 1rem; }
  .sender-avatar { width: 40px; height: 40px; }
  .sender-name { font-size: 0.9rem; }
  .recipients, .message-date { font-size: 0.8rem; }
  .message-date { text-align: left; margin-left: 0; }
}

// Skeleton styles
.header-skeleton { padding: 1rem; }
.skeleton-subject { height: 28px; background: $gray-200; border-radius: 6px; width: 60%; margin-bottom: 24px; animation: pulse 2s infinite; }
.skeleton-meta { display: flex; gap: 16px; animation: pulse 2s infinite; }
.skeleton-avatar { width: 48px; height: 48px; border-radius: 50%; background: $gray-200; }
.skeleton-info { flex: 1; display: flex; flex-direction: column; gap: 8px; justify-content: center; }
.skeleton-line { height: 16px; background: $gray-200; border-radius: 4px; &.w-40 { width: 40%; } &.w-20 { width: 20%; } }

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
</style>
