<template>
  <div 
    class="email-item" 
    @click="handleClick($event)"
    :class="{ 'email-item--read': message.read_at !== null }"
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
  props: {
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
        '#4F46E5', '#7C3AED', '#EC4899', '#EF4444', '#F97316',
        '#F59E0B', '#10B981', '#14B8A6', '#06B6D4', '#3B82F6',
        '#8B5CF6', '#6366F1', '#D946EF', '#0EA5E9', '#22C55E'
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
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid $gray-100;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 56px;
  -webkit-tap-highlight-color: rgba($primary, 0.1);
  touch-action: manipulation;
  
  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: $gray-50;
    transform: translateX(2px);
  }

  &:active {
    background: $gray-100;
    transform: scale(0.99);
  }

  &--read {
    opacity: 0.7;
  }
}

.email-avatar {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.75rem;
  font-weight: 600;
  font-size: 0.85rem;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  transition: transform 0.2s ease;

  .avatar-initials {
    user-select: none;
  }

  .email-item:hover & {
    transform: scale(1.05);
  }
}

.email-content {
  flex: 1;
  min-width: 0;
}

.email-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.25rem;
}

.email-sender {
  font-weight: 600;
  color: $dark-text;
  font-size: 0.9rem;
}

.email-time {
  color: $muted-text;
  font-size: 0.8rem;
  flex-shrink: 0;
  margin-left: 1rem;
}

.email-subject {
  font-weight: 500;
  color: $dark-text;
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  
  &.selectable-text {
    cursor: text;
    user-select: text;
    
    &:hover {
      text-decoration: underline;
      text-decoration-color: $gray-300;
    }
  }
}

.email-preview {
  display: block;
  color: $muted-text;
  font-size: 0.85rem;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 0.25rem;
  
  &.selectable-text {
    cursor: text;
    user-select: text;
  }
}

.email-actions {
  flex-shrink: 0;
  color: $gray-400;
  margin-left: 1rem;
  transition: color 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  .unread-badge {
    width: 8px;
    height: 8px;
    background: $primary;
    border-radius: 50%;
    animation: pulse-glow 2s ease-in-out infinite;
  }

  .email-item:hover & {
    color: $primary;
  }
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba($primary, 0.4); }
  50% { box-shadow: 0 0 0 4px rgba($primary, 0); }
}

@media (max-width: 768px) {
  .email-item {
    padding: 0.75rem;
    min-height: 56px;
  }

  .email-avatar {
    width: 36px;
    height: 36px;
    margin-right: 0.75rem;
  }

  .email-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.25rem;
  }

  .email-time {
    margin-left: 0;
    align-self: flex-start;
    font-size: 0.7rem;
  }

  .email-sender { font-size: 0.9rem; }
  .email-subject { font-size: 0.85rem; }
  .email-preview {
    font-size: 0.8rem;
    -webkit-line-clamp: 1;
  }
}

@media (max-width: 480px) {
  .email-item {
    padding: 0.6rem;
  }

  .email-avatar {
    width: 32px;
    height: 32px;
    margin-right: 0.5rem;
  }
}
</style>
