<template>
  <pull-to-refresh 
    ref="pull"
    :is-refreshing="refreshing" 
    @refresh="refreshList"
  >
    <!-- Advisory notice -->
    <div class="advisory-banner">
      <div class="advisory-content">
        <font-awesome-icon icon="cat" />
        <span>🐱 Meow! This is for fun emails only - not for banking or your secret catnip orders! Our kittens are judgmental about boring stuff.</span>
      </div>
    </div>

    <!-- Skeleton loading state -->
    <skeleton-loader v-if="refreshing" :count="4" />

    <!-- Email list -->
    <div class="email-list-container" v-if="listOfMessages.length > 0 && !refreshing">
      <div class="email-list-header">
        <div class="header-main">
          <h3>
            <font-awesome-icon icon="inbox" />
            Inbox ({{listOfMessages.length}})
          </h3>
          <div class="refresh-info">
            <span class="last-refreshed">Last checked: {{formattedLastRefreshed}}</span>
            <span class="countdown">Next update in: {{countdown}}s</span>
          </div>
        </div>
        <button class="refresh-btn-inline" @click="refreshList" :disabled="refreshing">
          <font-awesome-icon icon="sync-alt" :spin="refreshing" />
          Refresh Now
        </button>
      </div>
      
      <div class="email-list">
        <email-list-item 
          v-for="msg in listOfMessages" 
          :key="msg.url"
          :message="msg"
          @select="getMessage"
        />
      </div>
    </div>

    <!-- Empty state -->
    <empty-inbox 
      v-if="listOfMessages.length == 0 && !refreshing"
      :is-refreshing="refreshing"
      :formatted-last-refreshed="formattedLastRefreshed"
      :countdown="countdown"
      @refresh="refreshList"
    />
  </pull-to-refresh>
</template>

<script>
import 'normalize.css'
import config from '@/../config/apiconfig'
import axios from 'axios'
import dayjs from 'dayjs'
import PullToRefresh from '../ui/PullToRefresh.vue'
import SkeletonLoader from '../ui/SkeletonLoader.vue'
import EmailListItem from './EmailListItem.vue'
import EmptyInbox from './EmptyInbox.vue'

export default {
  name: 'MessageList',
  components: {
    PullToRefresh,
    SkeletonLoader,
    EmailListItem,
    EmptyInbox
  },
  data: () => {
    return {
      listOfMessages: [],
      refreshing: false,
      lastRefreshed: dayjs(),
      countdown: 10,
      countdownTimer: null
    }
  },
  computed: {
    formattedLastRefreshed () {
      return this.lastRefreshed.format('HH:mm:ss')
    }
  },
  watch: {
    '$route.params.email'(newEmail) {
      if (newEmail) {
        this.getMessageList()
      }
    }
  },
  mounted () {
    let currentEmail = this.$route.params.email
    if (currentEmail === '') {
      this.$router.push({name: 'Kitten Land'})
    }

    this.getMessageList()
    
    // Auto-refresh every 10 seconds
    this.countdownTimer = window.setInterval(() => {
      if (this.countdown > 0) {
        this.countdown--
      } else {
        this.refreshList()
      }
    }, 1000)

    this.$eventHub.on('refreshInbox', this.getMessageList)
    this.$eventHub.on('refresh', this.getMessageList)
  },
  beforeUnmount () {
    window.clearInterval(this.countdownTimer)
    this.$eventHub.off('refreshInbox', this.getMessageList)
    this.$eventHub.off('refresh', this.getMessageList)
  },
  methods: {
    getInboxRecipientCandidates (email) {
      const trimmedEmail = Array.isArray(email) ? (email[0] || '') : (email || '')
      const recipient = trimmedEmail.trim()
      if (!recipient || recipient.includes('@')) {
        return [recipient]
      }
      return [recipient, `${recipient}@${config.domain}`]
    },

    async fetchMessageListForCandidates (recipients) {
      let lastError = null

      for (const recipient of recipients) {
        try {
          const res = await axios.get(config.apiUrl + '/list?recipient=' + encodeURIComponent(recipient))
          if (!Array.isArray(res.data) || res.data.length > 0 || recipient.includes('@')) {
            return res
          }
        } catch (e) {
          lastError = e
        }
      }

      if (lastError) {
        throw lastError
      }

      return { data: [] }
    },

    refreshList () {
      if (this.refreshing) return
      this.refreshing = true
      this.$eventHub.emit('refreshStart')
      this.getMessageList()
    },
    
    getMessageList () {
      this.refreshing = true
      this.$eventHub.emit('refreshStart')
      
      const recipients = this.getInboxRecipientCandidates(this.$route.params.email)
      this.fetchMessageListForCandidates(recipients)
        .then(res => {
          this.listOfMessages = res.data
          this.refreshing = false
          this.lastRefreshed = dayjs()
          this.countdown = 10 // Reset countdown
          this.$eventHub.emit('refreshEnd')
        }).catch((e) => {
          this.refreshing = false
          this.lastRefreshed = dayjs()
          this.countdown = 10 // Reset countdown even on error
          this.$eventHub.emit('refreshEnd')
          console.error('Failed to fetch messages:', e)
        })
    },

    getMessage (msg) {
      this.$router.push({
        name: 'Message',
        params: {
          region: msg.storage.region,
          key: msg.storage.key
        }
      })
    }
  }
}
</script>

<style lang="scss">
  @use "../../scss/color" as *;

  .advisory-banner {
    background: linear-gradient(135deg, #FEF3C7, #FCD34D);
    border: 1px solid #F59E0B;
    border-radius: $radius;
    margin: 0.5rem auto;
    padding: 0.4rem 0.6rem;
    max-width: 600px;
    width: calc(100% - 1rem);

    .advisory-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      color: #92400E;
      font-size: 0.8rem;
      text-align: center;

      svg {
        color: #F59E0B;
        font-size: 0.9rem;
        flex-shrink: 0;
      }

      span {
        flex: 1;
      }
    }
  }

  .email-list-container {
    margin: 0.75rem;

    @media (min-width: 1024px) {
      margin: 1rem 0.5rem;
    }
  }

  .email-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid $gray-200;
    margin-bottom: 0.75rem;

    .header-main {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    h3 {
      margin: 0;
      color: $dark-text;
      font-size: 1rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.4rem;

      i {
        color: $primary;
        font-size: 0.9rem;
      }
    }

    .refresh-info {
      display: flex;
      gap: 1rem;
      font-size: 0.75rem;
      color: $muted-text;

      .last-refreshed {
        font-weight: 500;
      }

      .countdown {
        color: $primary;
        font-weight: 600;
      }
    }

    .refresh-btn-inline {
      background: $gray-100;
      border: 1px solid $gray-300;
      color: $gray-700;
      padding: 0.5rem 1rem;
      border-radius: $radius;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-height: 44px;
      min-width: 44px;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;

      &:hover:not(:disabled) {
        background: $gray-200;
        color: $gray-800;
      }

      &:active:not(:disabled) {
        transform: scale(0.97);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .fa-spin {
        animation-duration: 1s;
      }
    }
  }

  .email-list {
    background: var(--color-surface);
    border-radius: $radius-lg;
    box-shadow: $shadow;
    overflow: hidden;
    transition: background 0.3s ease;
  }

  // Mobile optimizations
  @media (max-width: 768px) {
    .email-list-header {
      flex-direction: column;
      align-items: stretch;
      gap: 0.75rem;
      padding: 0.75rem;

      .refresh-btn-inline {
        display: none;
      }
    }

    .advisory-banner {
      margin: 0.5rem;
      padding: 0.6rem;
      border-radius: 8px;

      .advisory-content {
        gap: 0.5rem;
        font-size: 0.75rem;

        i {
          font-size: 1rem;
        }
      }
    }
  }

  @media (max-width: 480px) {
    .email-list-container {
      margin: 0.25rem;
      border-radius: 12px;
    }
  }
</style>
