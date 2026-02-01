<template>
  <div class="message-body">
    <div class="iframe-container">
      <div v-if="loading" class="iframe-loading-overlay">
        <div class="loading-spinner"></div>
      </div>
      <iframe 
        id="message-content" 
        :src="src" 
        @load="$emit('load')"
        scrolling="yes"
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        referrerpolicy="no-referrer"
        title="Email content"
        :class="{ 'is-loading': loading }"
      ></iframe>
    </div>
  </div>
</template>

<script>
export default {
  name: 'IframeContent',
  props: {
    src: {
      type: String,
      required: true
    },
    loading: Boolean
  }
}
</script>

<style lang="scss" scoped>
@use "../../scss/color" as *;

.message-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin: 0 0.5rem 0.5rem;
  min-height: 0;
  overflow: hidden;
  
  @media (min-width: 1024px) {
    margin: 0 0.75rem 0.75rem;
  }
}

.iframe-container {
  flex: 1;
  background: #ffffff;
  border-radius: $radius-lg;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  border: 1px solid $gray-200;
  display: flex;
  flex-direction: column;
  min-height: 300px;
  position: relative;

  [data-theme='dark'] & {
    background: #f8fafc;
    border-color: $gray-700;
  }
}

#message-content {
  flex: 1;
  width: 100%;
  height: 100%;
  border: none;
  background: #ffffff;
  display: block;
  opacity: 1;
  transition: opacity 0.3s ease;
  
  &.is-loading { opacity: 0; }
}

.iframe-loading-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  z-index: 10;
  
  [data-theme='dark'] & { background: rgba(30, 41, 59, 0.8); }
  
  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid $gray-200;
    border-top: 3px solid $primary;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
}

@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
</style>
