<template>
  <footer class="footer-section">
    <div class="footer-content">
      <p>Made with ❤️ and 🐱 for fellow humans who value privacy • 
         <a href="https://github.com/uilicious/inboxkitten" target="_blank">Peek at our code</a></p>
      <p class="footer-note">*No actual kittens were harmed. They're all napping in sunbeams. ☀️</p>
    </div>
  </footer>
</template>

<script>
export default {
  name: 'PageFooter'
}
</script>

<style lang="scss" scoped>
@use "../../scss/color" as *;

.footer-section {
  background: #1f2937;
  color: white;
  padding: 2rem;
  text-align: center;
}

.footer-content {
  max-width: 800px;
  margin: 0 auto;
  
  p { margin: 0.5rem 0; }
  
  a {
    color: #06b6d4;
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }
}

.footer-note {
  font-size: 0.9rem;
  color: #9ca3af;
  font-style: italic;
}

@media (max-width: 768px) {
  .footer-section {
    padding: 1.5rem 1rem;
    padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
  }
  .footer-content {
    p { font-size: 0.85rem; }
    .footer-note { font-size: 0.8rem; }
  }
}
</style>
