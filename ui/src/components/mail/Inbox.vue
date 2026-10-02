<template>
  <div class="inbox-wrapper" :class="{ 'split-view': showSplitView, 'has-mobile-nav': showMobileNav }">
    <nav-bar class="nav-bar"></nav-bar>
    
    <main class="inbox-content" aria-label="Inbox workspace">
      <!-- Message list panel -->
      <aside class="list-panel" aria-label="Email inbox" :class="{ 'panel-hidden': isMobileMessageView }">
        <message-list 
          ref="messageList"
          @message-selected="handleMessageSelected"
          :split-view-active="showSplitView"
        />
      </aside>
      
      <!-- Message detail panel (shown in split view or mobile) -->
      <section class="detail-panel" aria-label="Selected message" v-if="showDetailPanel">
        <router-view />
      </section>
      
      <!-- Empty state for split view when no message selected -->
      <section class="detail-panel detail-empty" aria-label="Reading pane" v-else-if="showSplitView">
        <div class="empty-detail">
          <img src="@/assets/logo_no_text.svg" width="112" height="140" alt="" />
          <h2>Select an email to read</h2>
          <p>Pick a message on the left. We'll open it right here.</p>
        </div>
      </section>
    </main>

    <!-- Mobile Bottom Navigation -->
    <mobile-nav />
  </div>
</template>

<script>
  import NavBar from '../NavBar.vue'
  import MessageList from './MessageList.vue'
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
@use "../../scss/color" as *;

.inbox-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  min-height: 0;
  background: var(--color-background);
  &.has-mobile-nav { padding-bottom: calc(76px + env(safe-area-inset-bottom, 0px)); }
}
.nav-bar { flex-shrink: 0; }
.inbox-content { flex: 1; min-height: 0; display: flex; overflow: hidden; }
.list-panel { flex: 1; min-width: 0; min-height: 0; background: var(--color-surface); }
.detail-panel { display: none; min-height: 0; }
.split-view {
  .list-panel { flex: 0 0 clamp(340px, 32vw, 460px); border-right: 1px solid $gray-200; }
  .detail-panel { display: flex; flex: 1; min-width: 0; background: var(--color-background); }
  .detail-empty { align-items: center; justify-content: center; }
}
.empty-detail {
  text-align: center;
  max-width: 380px;
  padding: 2rem;
  color: $muted-text;
  img { display: block; object-fit: contain; margin: 0 auto 1.25rem; }
  h2 { color: $dark-text; font-family: var(--font-display); font-size: 1.25rem; font-weight: 650; letter-spacing: -0.03em; margin: 0 0 0.5rem; }
  p { font-size: 0.875rem; line-height: 1.7; margin: 0; }
}
.panel-hidden { display: none; }
.inbox-wrapper:not(.split-view) .detail-panel { display: flex; flex: 1; min-width: 0; }
</style>
