<template>
  <footer class="footer-section">
    <div class="footer-content">
      <div class="footer-brand">
        <img src="@/assets/logo_no_text.svg" width="32" height="32" alt="" />
        <span>Akunlama.</span>
      </div>
      <p>Made with love, probably supervised by a cat.</p>
      <a href="https://github.com/uilicious/inboxkitten" target="_blank" rel="noopener noreferrer">Peek at our code <span aria-hidden="true">↗</span></a>
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

.footer-section { border-top: 1px solid $gray-200; background: var(--color-surface); padding: 1.75rem 2rem; }
.footer-content { max-width: 1120px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.footer-brand { display: flex; align-items: center; gap: 0.5rem; font-family: var(--font-display); font-weight: 700; letter-spacing: -0.04em; color: $dark-text; }
.footer-content p, .footer-content a { font-size: 0.8rem; }
.footer-content p { color: $muted-text; margin: 0; }
.footer-content a:hover { text-decoration: underline; }
@media (max-width: 768px) {
  .footer-section { padding: 1.5rem 1rem calc(1.5rem + env(safe-area-inset-bottom, 0px)); }
  .footer-content { flex-direction: column; text-align: center; }
}
</style>
