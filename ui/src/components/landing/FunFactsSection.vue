<template>
  <div class="facts-wrapper">
    <section id="how-it-works" class="benefits-section" aria-labelledby="benefits-title">
      <p class="section-kicker">the short version</p>
      <h2 id="benefits-title">Pick. Receive. Poof.</h2>
      <div class="fun-facts">
        <div class="fact-card">
          <div class="fact-step" aria-hidden="true"><span>01</span><font-awesome-icon icon="inbox" /></div>
          <h3>Pick a name. You're in.</h3>
          <p>Choose a name or generate one. Open your inbox and start receiving emails, without an account.</p>
        </div>
        <div class="fact-card">
          <div class="fact-step" aria-hidden="true"><span>02</span><font-awesome-icon icon="sync-alt" /></div>
          <h3>We keep an eye on the mail.</h3>
          <p>Your inbox checks for new messages automatically. You can refresh whenever you need to.</p>
        </div>
        <div class="fact-card">
          <div class="fact-step" aria-hidden="true"><span>03</span><font-awesome-icon icon="cat" /></div>
          <h3>Here today. Gone in 3 days.</h3>
          <p>Emails are automatically deleted after three days. Even our kittens like to travel light.</p>
        </div>
      </div>
    </section>
    <section class="use-cases-section" aria-labelledby="use-cases-title">
      <div class="use-cases-heading">
        <p class="section-kicker">give your real inbox a day off</p>
        <h2 id="use-cases-title">For the "just this once" emails.</h2>
      </div>
      <div class="use-cases-grid">
        <div class="use-case"><font-awesome-icon icon="paper-plane" /> Quick signups</div>
        <div class="use-case"><font-awesome-icon icon="check" /> Email verification</div>
        <div class="use-case"><font-awesome-icon icon="inbox" /> Keeping out spam</div>
        <div class="use-case"><font-awesome-icon icon="server" /> Testing your apps</div>
        <div class="use-case"><font-awesome-icon icon="envelope-open-text" /> Trying newsletters</div>
        <div class="use-case"><font-awesome-icon icon="dice" /> One-time offers</div>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: 'FunFactsSection'
}
</script>

<style lang="scss" scoped>
@use "../../scss/color" as *;

.section-kicker { color: $primary; font-family: var(--font-note); font-size: 0.8rem; font-weight: 600; margin: 0 0 0.75rem; }
h2 { color: $dark-text; font-family: var(--font-display); font-size: clamp(1.6rem, 3vw, 2rem); line-height: 1.25; letter-spacing: -0.04em; margin: 0 0 2rem; }
.benefits-section { scroll-margin-top: 2rem; }
.fun-facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2rem; margin-bottom: 4rem; }
.fact-card {
  border-top: 1px dashed $gray-300;
  padding-top: 1.25rem;
  .fact-step { display: flex; align-items: center; justify-content: space-between; color: $primary; margin-bottom: 1rem; span { font-family: var(--font-note); font-size: 1.5rem; } svg { font-size: 1.1rem; } }
  h3 { color: $dark-text; font-size: 1rem; font-weight: 650; letter-spacing: -0.02em; margin: 0 0 0.75rem; }
  p { color: $muted-text; font-size: 0.875rem; line-height: 1.75; margin: 0; }
}
.use-cases-section { display: grid; grid-template-columns: 1fr 1.3fr; align-items: center; gap: 2rem; padding: 2.5rem 0; border-top: 1px solid $gray-200; border-bottom: 1px solid $gray-200; margin-bottom: 4rem; }
.use-cases-heading h2 { margin-bottom: 0; }
.use-cases-grid { display: flex; flex-wrap: wrap; gap: 0.75rem; }
.use-case { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; border-radius: 24px; border: 1px solid $gray-300; background: var(--color-surface); color: $muted-text; font-size: 0.8rem; svg { color: $primary; flex-shrink: 0; } &:nth-child(2), &:nth-child(5) { background: var(--color-accent-soft); } }
@media (max-width: 900px) {
  .use-cases-section { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .fun-facts { grid-template-columns: 1fr; gap: 1rem; margin-bottom: 2.5rem; }
  .fact-card { padding-top: 1rem; }
  .use-cases-section { margin-bottom: 2.5rem; }
}
</style>
