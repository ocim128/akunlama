<template>
  <section class="faq-section" aria-labelledby="faq-title">
    <div class="faq-heading">
      <p class="section-kicker">curious cat corner</p>
      <h2 id="faq-title">Good questions.</h2>
      <p class="faq-note">No nine lives needed to figure this out.</p>
    </div>
    <div class="faq-grid">
      <div class="faq-item">
        <h3>Is it really free?</h3>
        <p>Yep. No signup, no subscription. Just a free, open-source inbox for your little internet adventures.</p>
      </div>
      <div class="faq-item">
        <h3>How long do emails stay?</h3>
        <p>Emails are automatically deleted after 3 days. Save anything you need before it expires.</p>
      </div>
      <div class="faq-item">
        <h3>What should I use it for?</h3>
        <p>Use it for low-risk, temporary emails. Anyone who knows an address can open its inbox, so keep sensitive messages in your personal email.</p>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'FaqSection'
}
</script>

<style lang="scss" scoped>
@use "../../scss/color" as *;

.faq-section { display: grid; grid-template-columns: 1fr 1.3fr; gap: 2rem; }
.section-kicker { color: $primary; font-family: var(--font-note); font-size: 0.8rem; font-weight: 600; margin: 0 0 0.75rem; }
.faq-section h2 { color: $dark-text; font-family: var(--font-display); font-size: clamp(1.6rem, 3vw, 2rem); line-height: 1.25; letter-spacing: -0.04em; margin: 0 0 1rem; }
.faq-note { color: $muted-text; font-size: 0.875rem; line-height: 1.75; margin: 0; }
.faq-grid { display: grid; gap: 1.5rem; }
.faq-item {
  text-align: left;
  border-bottom: 1px dashed $gray-300;
  padding-bottom: 1.5rem;
  &:last-child { border-bottom: none; padding-bottom: 0; }
  h3 { color: $dark-text; font-size: 0.95rem; font-weight: 650; margin: 0 0 0.75rem; }
  p { color: $muted-text; font-size: 0.875rem; line-height: 1.75; margin: 0; }
}
@media (max-width: 900px) {
  .faq-section { grid-template-columns: 1fr; }
}
</style>
