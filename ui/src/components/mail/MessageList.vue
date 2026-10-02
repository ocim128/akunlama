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
        <span>Use this disposable inbox only for low-risk emails. Avoid banking, account recovery, or sensitive messages.</span>
      </div>
    </div>

    <div v-if="loadError" class="inbox-error" role="alert">
      <p>Unable to check this inbox. Please try again.</p>
      <button type="button" @click="refreshList" :disabled="refreshing">Try again</button>
    </div>

    <!-- Skeleton loading state -->
    <div v-if="refreshing && listOfMessages.length === 0" role="status" aria-label="Checking for new messages">
      <skeleton-loader :count="4" />
    </div>

    <!-- Email list -->
    <div class="email-list-container" v-if="listOfMessages.length > 0">
      <div class="email-list-header">
        <div class="header-main">
          <h1>
            Inbox <span class="message-count">{{listOfMessages.length}}</span>
          </h1>
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
          :key="msg.storage.key"
          :message="msg"
          :selected="$route.name === 'Message' && $route.params.key === msg.storage.key"
          @select="getMessage"
        />
      </div>
    </div>

    <!-- Empty state -->
    <empty-inbox 
      v-if="listOfMessages.length == 0 && !refreshing && !loadError"
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

const refreshIntervalSeconds = Math.max(1, Math.ceil((config.autoRefreshInterval || 30000) / 1000))

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
      loadError: false,
      refreshing: false,
      lastRefreshed: dayjs(),
      countdown: refreshIntervalSeconds,
      countdownTimer: null,
      requestController: null
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
        this.requestController?.abort()
        this.refreshing = false
        this.listOfMessages = []
        this.loadError = false
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
    
    this.startAutoRefresh()
    document.addEventListener('visibilitychange', this.handleVisibilityChange)

    this.$eventHub.on('refreshInbox', this.getMessageList)
    this.$eventHub.on('refresh', this.getMessageList)
  },
  beforeUnmount () {
    window.clearInterval(this.countdownTimer)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    this.requestController?.abort()
    this.$eventHub.off('refreshInbox', this.getMessageList)
    this.$eventHub.off('refresh', this.getMessageList)
  },
  methods: {
    startAutoRefresh () {
      if (document.hidden || this.countdownTimer !== null) return
      this.countdownTimer = window.setInterval(() => {
        if (this.countdown > 0) {
          this.countdown--
        } else {
          this.refreshList()
        }
      }, 1000)
    },

    handleVisibilityChange () {
      window.clearInterval(this.countdownTimer)
      this.countdownTimer = null
      if (document.hidden) return
      this.refreshList()
      this.startAutoRefresh()
    },

    getInboxRecipient (email) {
      const trimmedEmail = Array.isArray(email) ? (email[0] || '') : (email || '')
      return trimmedEmail.trim()
    },

    fetchMessageList (recipient, signal) {
      return axios.get(
        config.apiUrl + '/list?recipient=' + encodeURIComponent(recipient),
        { timeout: config.requestTimeout, signal }
      )
    },

    refreshList () {
      return this.getMessageList()
    },
    
    async getMessageList () {
      if (this.refreshing) return

      const controller = new AbortController()
      this.requestController = controller
      this.refreshing = true
      this.$eventHub.emit('refreshStart')

      try {
        const recipient = this.getInboxRecipient(this.$route.params.email)
        if (!recipient) {
          this.listOfMessages = []
          return
        }

        const res = await this.fetchMessageList(recipient, controller.signal)
        if (!controller.signal.aborted) {
          this.listOfMessages = res.data
          this.loadError = false
          this.lastRefreshed = dayjs()
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          console.error('Failed to fetch messages:', e)
          this.loadError = true
        }
      } finally {
        if (!controller.signal.aborted) {
          this.requestController = null
          this.refreshing = false
          this.countdown = refreshIntervalSeconds
          this.$eventHub.emit('refreshEnd')
        }
      }
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

.inbox-error {
  margin: 1rem;
  padding: 1.25rem;
  border: 1px solid $error;
  border-radius: 12px;
  background: var(--color-surface);
  color: $dark-text;
  p { margin: 0 0 0.75rem; font-size: 0.875rem; }
  button { padding: 0.5rem 1rem; min-height: 44px; border-radius: 8px; background: var(--color-action); color: white; font: inherit; &:disabled { opacity: 0.5; } }
}
.advisory-banner { margin: 1rem; padding: 0.75rem; background: var(--color-background); border: 1px solid $gray-200; border-radius: 10px; }
.advisory-content {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  color: $muted-text;
  font-size: 0.75rem;
  line-height: 1.65;
  svg { color: $primary; flex-shrink: 0; margin-top: 0.2rem; }
}
.email-list-container { margin: 1rem; }
.email-list-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.5rem 0 1.25rem;
  h1 { display: flex; align-items: center; gap: 0.65rem; margin: 0 0 0.5rem; color: $dark-text; font-family: var(--font-display); font-size: 1.35rem; font-weight: 650; letter-spacing: -0.03em; }
  .message-count { display: inline-flex; align-items: center; justify-content: center; min-width: 24px; padding: 0.1rem 0.4rem; border-radius: 6px; background: var(--color-accent-soft); color: $primary; font-size: 0.75rem; letter-spacing: 0; }
  .refresh-info { display: flex; flex-wrap: wrap; gap: 0.25rem 0.75rem; font-size: 0.7rem; color: $muted-text; }
  .countdown { color: $primary; }
}
.refresh-btn-inline {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 1px solid $gray-200;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  min-height: 44px;
  font-size: 0.75rem;
  color: $muted-text;
  &:hover:not(:disabled) { background: $gray-100; }
  &:disabled { opacity: 0.5; }
}
.email-list { border: 1px solid $gray-200; border-radius: 12px; overflow: hidden; background: var(--color-surface); }
@media (max-width: 767px) {
  .email-list-header .refresh-btn-inline { display: none; }
}
</style>
