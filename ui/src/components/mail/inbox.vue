<template>
  <div class="inbox-wrapper" :class="{ 'split-view': showSplitView, 'has-mobile-nav': showMobileNav }">
    <nav-bar class="nav-bar"></nav-bar>
    
    <div class="inbox-content">
      <!-- Message list panel -->
      <aside class="list-panel" :class="{ 'panel-hidden': isMobileMessageView }">
        <message-list 
          ref="messageList"
          @message-selected="handleMessageSelected"
          :split-view-active="showSplitView"
        />
      </aside>
      
      <!-- Message detail panel (shown in split view or mobile) -->
      <main class="detail-panel" v-if="showDetailPanel">
        <router-view />
      </main>
      
      <!-- Empty state for split view when no message selected -->
      <main class="detail-panel detail-empty" v-else-if="showSplitView">
        <div class="empty-detail">
          <i class="fas fa-envelope-open-text"></i>
          <h3>Select an email to read</h3>
          <p>Choose an email from the list to view its contents here</p>
        </div>
      </main>
    </div>

    <!-- Mobile Bottom Navigation -->
    <mobile-nav />
  </div>
</template>

<script>
  import NavBar from '../NavBar.vue'
  import MessageList from './message_list.vue'
  import MobileNav from '../MobileNav.vue'

  export default {
    name: 'inbox',
    components: {
      NavBar,
      MessageList,
      MobileNav
    },
    data() {
      return {
        windowWidth: window.innerWidth
      }
    },
    computed: {
      // Enable split view on desktop (>= 1024px)
      showSplitView() {
        return this.windowWidth >= 1024
      },
      // Check if we're viewing a message
      isViewingMessage() {
        return this.$route.name === 'Message'
      },
      // Show detail panel
      showDetailPanel() {
        return this.isViewingMessage
      },
      // On mobile, hide list when viewing message
      isMobileMessageView() {
        return !this.showSplitView && this.isViewingMessage
      },
      // Show mobile nav on small screens
      showMobileNav() {
        return this.windowWidth < 768
      }
    },
    mounted() {
      window.addEventListener('resize', this.handleResize)
    },
    beforeUnmount() {
      window.removeEventListener('resize', this.handleResize)
    },
    methods: {
      handleResize() {
        this.windowWidth = window.innerWidth
      },
      handleMessageSelected(msg) {
        // This can be used for additional handling
      }
    }
  }
</script>

<style lang="scss">
  @use '@/scss/color' as *;

  .inbox-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background: var(--color-background);

    // Add padding for mobile nav
    &.has-mobile-nav {
      padding-bottom: calc(70px + env(safe-area-inset-bottom, 0px));
    }
  }

  .nav-bar {
    flex-shrink: 0;
  }

  .inbox-content {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  // List panel
  .list-panel {
    flex: 1;
    overflow-y: auto;
    min-width: 0;
    transition: all 0.3s ease;
  }

  // Detail panel
  .detail-panel {
    display: none;
  }

  // Split view mode (desktop)
  .split-view {
    .inbox-content {
      display: flex;
      gap: 0;
    }

    .list-panel {
      flex: 0 0 420px;
      max-width: 450px;
      border-right: 1px solid $gray-200;
      background: var(--color-surface);
      
      @media (min-width: 1280px) {
        flex: 0 0 480px;
        max-width: 520px;
      }
      
      @media (min-width: 1536px) {
        flex: 0 0 550px;
        max-width: 600px;
      }
      
      @media (min-width: 1800px) {
        flex: 0 0 650px;
        max-width: 700px;
      }
    }

    .detail-panel {
      display: flex;
      flex: 1;
      min-width: 0;
      background: var(--color-background);
    }

    .detail-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      background: $gray-50;
      
      .empty-detail {
        text-align: center;
        color: $muted-text;
        padding: 2rem;
        
        i {
          font-size: 4rem;
          color: $gray-300;
          margin-bottom: 1.5rem;
        }
        
        h3 {
          font-size: 1.5rem;
          color: $gray-600;
          margin: 0 0 0.5rem 0;
          font-weight: 600;
        }
        
        p {
          margin: 0;
          font-size: 1rem;
        }
      }
    }
  }

  // Mobile: hide list when viewing message
  .panel-hidden {
    display: none;
  }

  // On non-split view, show detail panel when viewing message
  .inbox-wrapper:not(.split-view) {
    .detail-panel {
      display: flex;
      flex: 1;
    }
  }

  // Dark mode adjustments
  [data-theme='dark'] {
    .split-view {
      .list-panel {
        border-right-color: $gray-700;
      }
      
      .detail-empty {
        background: var(--color-background);
        
        .empty-detail i {
          color: $gray-600;
        }
        
        .empty-detail h3 {
          color: $gray-400;
        }
      }
    }
  }
</style>
