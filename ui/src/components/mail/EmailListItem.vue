<template>
  <div 
    class="email-item"
    role="button"
    tabindex="0"
    :aria-label="(message.read_at === null ? 'Unread: ' : '') + (message.message.headers.subject || 'No subject') + ', from ' + senderEmail"
    :aria-current="selected ? 'true' : undefined"
    @keydown.enter.prevent="$emit('select', message)"
    @keydown.space.prevent="$emit('select', message)"
    @click="handleClick($event)"
    :class="{ 'email-item--read': message.read_at !== null, 'email-item--selected': selected }"
  >
    <div class="email-avatar" :style="{ backgroundColor: avatarColor }">
      <span class="avatar-initials">{{ initials }}</span>
    </div>
    
    <div class="email-content">
      <div class="email-header">
        <div class="email-sender">{{ senderEmail }}</div>
        <div class="email-time">{{ timeAgo }}</div>
      </div>
      <div class="email-subject selectable-text" @click.stop>{{ message.message.headers.subject || '(No Subject)' }}</div>
      <div class="email-preview selectable-text" v-if="message.preview" @click.stop>{{ message.preview }}</div>
    </div>

    <div class="email-actions">
      <span class="unread-badge" v-if="message.read_at === null" title="Unread"></span>
      <font-awesome-icon icon="chevron-right" />
    </div>
  </div>
</template>

<script>
import dayjs from 'dayjs'

export default {
  name: 'EmailListItem',
  emits: ['select'],
  props: {
    selected: Boolean,
    message: {
      type: Object,
      required: true
    }
  },
  computed: {
    senderEmail() {
      const sender = this.message.message.headers.from
      let emails = sender.match(/[^@<\s]+@[^@\s>]+/g)
      if (emails) {
        return emails[0]
      }
      return sender
    },
    timeAgo() {
      let now = dayjs()
      let theDate = dayjs(this.message.timestamp * 1000)
      let diff = now.diff(theDate, 'day')
      
      if (diff === 0) {
        let hoursDiff = now.diff(theDate, 'hour')
        if (hoursDiff < 1) {
          let minutesDiff = now.diff(theDate, 'minute')
          return minutesDiff < 1 ? 'Just now' : `${minutesDiff}m ago`
        }
        return `${hoursDiff}h ago`
      } else if (diff === 1) {
        return 'Yesterday'
      } else if (diff < 7) {
        return `${diff} days ago`
      } else {
        return theDate.format('DD MMM')
      }
    },
    avatarColor() {
      const colors = [
        '#4338CA', '#6D28D9', '#047857', '#0E7490', '#1D4ED8', '#BE185D'
      ]
      
      const email = this.senderEmail
      let hash = 0
      for (let i = 0; i < email.length; i++) {
        hash = email.charCodeAt(i) + ((hash << 5) - hash)
      }
      
      return colors[Math.abs(hash) % colors.length]
    },
    initials() {
      const sender = this.message.message.headers.from
      if (!sender) return '?'
      
      const nameMatch = sender.match(/^([^<]+)</)
      if (nameMatch && nameMatch[1].trim()) {
        const name = nameMatch[1].trim()
        const parts = name.split(/\s+/)
        if (parts.length >= 2) {
          return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        }
        return name.substring(0, 2).toUpperCase()
      }
      
      const email = this.senderEmail
      if (email) {
        const username = email.split('@')[0]
        const cleanName = username.replace(/^(noreply|no-reply|info|support|hello|contact|admin)[-_]?/i, '')
        return (cleanName.substring(0, 2) || username.substring(0, 2)).toUpperCase()
      }
      
      return '?'
    }
  },
  methods: {
    handleClick(event) {
      if (event.target.classList.contains('selectable-text')) {
        return
      }
      this.$emit('select', this.message)
    }
  }
}
</script>

<style lang="scss" scoped>
@use "../../scss/color" as *;

.email-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 0.85rem;
  border-bottom: 1px solid $gray-200;
  cursor: pointer;
  transition: background 0.15s ease;
  min-height: 88px;
  touch-action: manipulation;
  &:last-child { border-bottom: none; }
  &:hover { background: $gray-50; }
  &:active { background: $gray-100; }
  &:focus-visible { outline-offset: -3px; }
  &--selected { background: var(--color-accent-soft); box-shadow: inset 3px 0 $primary; &:hover { background: var(--color-accent-soft); } }
  &--read .email-sender { font-weight: 500; }
  &--read .email-subject { color: $muted-text; font-weight: 400; }
}
.email-avatar { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 36px; height: 36px; color: white; border-radius: 11px; font-size: 0.75rem; font-weight: 650; }
.avatar-initials { user-select: none; }
.email-content { flex: 1; min-width: 0; }
.email-header { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.25rem; }
.email-sender { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.8rem; font-weight: 650; color: $dark-text; }
.email-time { color: $muted-text; font-size: 0.65rem; flex-shrink: 0; white-space: nowrap; }
.email-subject { color: $dark-text; font-size: 0.875rem; font-weight: 550; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.email-preview { color: $muted-text; font-size: 0.75rem; line-height: 1.5; margin-top: 0.25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.selectable-text { cursor: text; user-select: text; }
.email-actions { display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0; color: $muted-text; font-size: 0.65rem; }
.unread-badge { width: 6px; height: 6px; border-radius: 50%; background: $primary; }
@media (max-width: 360px) {
  .email-item { gap: 0.5rem; padding: 1rem 0.65rem; }
  .email-header { flex-wrap: wrap; gap: 0; }
}
</style>
