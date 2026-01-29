<template>
    <vue-scroll :ops="vueScrollBarOps">
      <!-- Advisory notice -->
      <div class="advisory-banner">
        <div class="advisory-content">
          <i class="fas fa-cat"></i>
          <span>🐱 Meow! This is for fun emails only - not for banking or your secret catnip orders! Our kittens are judgmental about boring stuff.</span>
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="refreshing" class="loading-container">
        <pulse-loader class="spinner"></pulse-loader>
        <p class="loading-text">Checking for new messages...</p>
      </div>

      <!-- Email list -->
      <div class="email-list-container" v-if="listOfMessages.length > 0 && !refreshing">
        <div class="email-list-header">
          <div class="header-main">
            <h3>
              <i class="fas fa-inbox"></i>
              Inbox ({{listOfMessages.length}})
            </h3>
            <div class="refresh-info">
              <span class="last-refreshed">Last checked: {{formattedLastRefreshed}}</span>
              <span class="countdown">Next update in: {{countdown}}s</span>
            </div>
          </div>
          <button class="refresh-btn-inline" @click="refreshList" :disabled="refreshing">
            <i class="fas fa-sync-alt" :class="{'fa-spin': refreshing}"></i>
            Refresh Now
          </button>
        </div>
        
        <div class="email-list">
          <div 
            class="email-item" 
            v-for="(msg, index) in listOfMessages" 
            :key="msg.url"
            @click="getMessage(msg)"
            :class="{ 'email-item--read': msg.read }"
          >
            <div class="email-avatar">
              <i class="fas fa-user-circle"></i>
            </div>
            
            <div class="email-content">
              <div class="email-header">
                <div class="email-sender">{{extractEmail(msg.message.headers.from)}}</div>
                <div class="email-time">{{calculateTime(msg)}}</div>
              </div>
              <div class="email-subject">{{msg.message.headers.subject || '(No Subject)'}}</div>
              <div class="email-preview" v-if="msg.message.preview">{{msg.message.preview}}</div>
            </div>

            <div class="email-actions">
              <i class="fas fa-chevron-right"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div class="empty-state" v-if="listOfMessages.length == 0 && !refreshing">
        <div class="empty-state-content">
          <div class="kitten-animation-container">
            <i class="fas fa-cat fa-3x cat-icon-animation"></i>
            <img src="@/assets/sleeping-kitten.png" alt="Sleeping Kitten" class="sleeping-kitten">
          </div>
          <h3>No messages yet</h3>
          <p>Your inbox is empty. Send an email to this address to see it appear here!</p>
          
          <div class="empty-refresh-info">
              <p class="last-refreshed">Last checked: {{formattedLastRefreshed}}</p>
              <p class="countdown">Next check in: {{countdown}}s</p>
          </div>

          <button class="refresh-button" @click="refreshList" :disabled="refreshing">
            <i class="fas fa-sync-alt" :class="{'fa-spin': refreshing}"></i>
            Check for messages
          </button>
        </div>
      </div>
    </vue-scroll>
</template>

<script>
import NavBar from '../NavBar.vue'
import 'normalize.css'
import config from '@/../config/apiconfig.js'
import axios from 'axios'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import PulseLoader from 'vue-spinner/src/PulseLoader.vue'

export default {
  name: 'MessageList',
  data: () => {
    return {
      listOfMessages: [],
      vueScrollBarOps: {
        bar: {
          background: '#cbd5e0',
          size: '6px',
          hoverStyle: {
            background: '#a0aec0'
          }
        }
      },
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

    this.$eventHub.$on('refreshInbox', this.getMessageList)
    this.$eventHub.$on('refresh', this.getMessageList)
  },
  beforeDestroy () {
    window.clearInterval(this.countdownTimer)
    this.$eventHub.$off('refreshInbox', this.getMessageList)
    this.$eventHub.$off('refresh', this.getMessageList)
  },
  methods: {
    refreshList () {
      if (this.refreshing) return
      this.refreshing = true
      this.$eventHub.$emit('refreshStart')
      this.getMessageList()
    },
    
    getMessageList () {
      this.refreshing = true
      this.$eventHub.$emit('refreshStart')
      
      let email = this.$route.params.email
      axios.get(config.apiUrl + '/list?recipient=' + email)
        .then(res => {
          this.listOfMessages = res.data
          this.refreshing = false
          this.lastRefreshed = dayjs()
          this.countdown = 10 // Reset countdown
          this.$eventHub.$emit('refreshEnd')
        }).catch((e) => {
          this.refreshing = false
          this.lastRefreshed = dayjs()
          this.countdown = 10 // Reset countdown even on error
          this.$eventHub.$emit('refreshEnd')
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
    },

    calculateTime (msg) {
      let now = dayjs()
      let theDate = dayjs(msg.timestamp * 1000)
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

    extractEmail (sender) {
      let emails = sender.match(/[^@<\s]+@[^@\s>]+/g)
      if (emails) {
        return emails[0]
      }
      return sender
    }
  },
  components: {
    NavBar: NavBar,
    PulseLoader: PulseLoader
  }
}
</script>

<style lang="scss" rel="stylesheet/scss">
  @use '@/scss/color' as *;

  .advisory-banner {
    background: linear-gradient(135deg, #FEF3C7, #FCD34D);
    border: 1px solid #F59E0B;
    border-radius: $radius-lg;
    margin: 1rem;
    padding: 1rem;

    .advisory-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      color: #92400E;
      font-size: 0.9rem;
      text-align: center;

      i {
        color: #F59E0B;
        font-size: 1.1rem;
        flex-shrink: 0;
      }

      span {
        flex: 1;
      }
    }
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    text-align: center;

    .spinner {
      margin-bottom: 1rem;
    }

    .loading-text {
      color: $muted-text;
      margin: 0;
    }
  }

  .email-list-container {
    margin: 1rem;
  }

  .email-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
    border-bottom: 1px solid $gray-200;
    margin-bottom: 1rem;

    .header-main {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    h3 {
      margin: 0;
      color: $dark-text;
      font-size: 1.25rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;

      i {
        color: $primary;
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

      &:hover:not(:disabled) {
        background: $gray-200;
        color: $gray-800;
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

  .email-item {
    display: flex;
    align-items: center;
      padding: 1rem;
    border-bottom: 1px solid $gray-100;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: $gray-50;
      transform: translateX(4px);
      box-shadow: $shadow-sm;
    }

    &--read {
      opacity: 0.7;
    }
  }

  .email-avatar {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    background: $primary;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 1rem;

    i {
      font-size: 1.5rem;
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
  }

  .email-preview {
    color: $muted-text;
    font-size: 0.85rem;
    line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
  }

  .email-actions {
    flex-shrink: 0;
    color: $gray-400;
    margin-left: 1rem;
    transition: color 0.2s ease;

    .email-item:hover & {
      color: $primary;
        }
      }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    padding: 2rem;
  }

  .empty-state-content {
    text-align: center;
    max-width: 400px;

    .kitten-animation-container {
      margin-bottom: 2rem;
      perspective: 1000px;
      display: flex;
      flex-direction: column;
      align-items: center;
      
      .cat-icon-animation {
        color: $primary;
        margin-bottom: 1.5rem;
        animation: gentle-float 4s ease-in-out infinite;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 48px;
        min-height: 48px;
      }

      .sleeping-kitten {
        width: 200px;
        height: auto;
        border-radius: $radius-lg;
        box-shadow: $shadow-lg;
        animation: breathing 4s ease-in-out infinite, gentle-float 6s ease-in-out infinite;
        filter: drop-shadow(0 10px 15px rgba(0, 0, 0, 0.1));
      }
    }

    h3 {
      color: $dark-text;
      font-size: 1.75rem;
      font-weight: 700;
      margin: 0 0 0.5rem 0;
      background: linear-gradient(135deg, $primary, $primary-light);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    p {
      color: $muted-text;
      line-height: 1.6;
      margin: 0 0 1.5rem 0;
    }

    .empty-refresh-info {
        margin-bottom: 2rem;
        background: var(--color-background);
        padding: 0.75rem;
        border-radius: $radius;
        border: 1px dashed $gray-200;

        p {
            margin: 0.25rem 0;
            font-size: 0.85rem;
            
            &.last-refreshed {
                color: $muted-text;
            }
            
            &.countdown {
                color: $primary;
                font-weight: 600;
            }
        }
    }
  }

  @keyframes breathing {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }

  @keyframes gentle-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  .refresh-button {
    background: $primary;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: $radius-lg;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;

    &:hover:not(:disabled) {
      background: $primary-dark;
      transform: translateY(-1px);
      box-shadow: $shadow;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .fa-spin {
      animation-duration: 1s;
    }
  }

  // Mobile optimizations
  @media (max-width: 768px) {
    .email-list-header {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;

      .refresh-btn-inline {
        align-self: center;
      }
    }

    .email-item {
      padding: 0.75rem;
    }

    .email-avatar {
      width: 36px;
      height: 36px;
      margin-right: 0.75rem;

      i {
        font-size: 1.25rem;
      }
    }

    .email-header {
      flex-direction: column;
      align-items: stretch;
      gap: 0.25rem;
    }

    .email-time {
      margin-left: 0;
      align-self: flex-start;
    }

    .advisory-banner {
      margin: 0.5rem;
      padding: 0.75rem;

      .advisory-content {
        gap: 0.5rem;
        font-size: 0.8rem;
      }
    }
  }

  @media (max-width: 480px) {
    .email-list-container {
      margin: 0.5rem;
    }

    .empty-state-content {
      padding: 1rem;

      i {
        font-size: 3rem;
        margin-bottom: 1rem;
      }

      h3 {
        font-size: 1.25rem;
      }

      p {
        font-size: 0.9rem;
      }
    }
  }
</style>
