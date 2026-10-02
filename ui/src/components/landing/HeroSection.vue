<template>
  <header class="hero-section">
    <nav class="landing-nav" aria-label="Main navigation">
      <a class="brand" href="/" aria-label="Akunlama home">
        <img src="@/assets/logo_no_text.svg" width="40" height="40" alt="" />
        <span>Akunlama<span class="brand-dot">.</span></span>
      </a>
      <div class="nav-actions">
        <a href="#how-it-works">How it works</a>
        <ThemeToggle />
      </div>
    </nav>
    <div class="hero-content">
      <div class="hero-copy">
        <p class="eyebrow"><font-awesome-icon icon="cat" aria-hidden="true" /> A tiny internet thing, with cats.</p>
        <h1><span class="hero-title-label">Disposable Email.</span><span class="highlight">Less spam.<br />More cat naps.</span></h1>
        <p class="hero-description">For signups, test emails, and all the internet's little detours. Grab a throwaway inbox. Let your real one nap.</p>
        <ul class="hero-benefits" aria-label="Service benefits">
          <li><font-awesome-icon icon="check" /> Free to use</li>
          <li><font-awesome-icon icon="check" /> No signup</li>
          <li><font-awesome-icon icon="check" /> Open source</li>
        </ul>
      </div>
      <div class="hero-form">
        <div class="kitten-greeting" aria-hidden="true">
          <span>your mail cat is ready</span>
          <img src="@/assets/logo_no_text.svg" width="84" height="104" alt="" />
        </div>
        <slot></slot>
        <p class="kitten-note"><font-awesome-icon icon="cat" aria-hidden="true" /> No account. No fuss. Just a very helpful cat.</p>
      </div>
    </div>
  </header>
</template>

<script>
import ThemeToggle from '../ThemeToggle.vue'

export default {
  name: 'HeroSection',
  components: { ThemeToggle }
}
</script>

<style lang="scss" scoped>
@use "../../scss/color" as *;

.hero-section {
  background-color: var(--color-background);
  background-image: radial-gradient($gray-300 0.8px, transparent 0.8px);
  background-size: 22px 22px;
  padding: 0 2rem;
  border-bottom: 1px solid $gray-200;
}
.landing-nav {
  max-width: 1120px;
  margin: 0 auto;
  min-height: 96px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  color: $dark-text;
  font-size: 1.4rem;
  font-family: var(--font-display);
  font-weight: 750;
  letter-spacing: -0.04em;
}
.brand-dot { color: $primary; }
.nav-actions { display: flex; align-items: center; gap: 1.5rem; font-size: 0.875rem; font-weight: 500; }
.nav-actions a { color: $muted-text; }
.nav-actions a:hover { color: $primary; }
.hero-content {
  max-width: 1120px;
  margin: 0 auto;
  padding: 4rem 0 5.5rem;
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  align-items: center;
  gap: clamp(2rem, 5vw, 5rem);
}
.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--color-sticker-text);
  background: var(--color-sticker);
  border: 1px solid var(--color-ink);
  border-radius: 6px;
  padding: 0.4rem 0.7rem;
  transform: rotate(-2deg);
  font-size: 0.8rem;
  font-weight: 600;
  margin: 0 0 1.5rem;
}
h1 {
  color: $dark-text;
  font-family: var(--font-display);
  font-size: clamp(3rem, 5vw, 4.5rem);
  line-height: 1.08;
  letter-spacing: -0.055em;
  font-weight: 700;
  margin: 0 0 1.5rem;
}
.hero-title-label { display: block; color: $muted-text; font-family: inherit; font-size: 1.25rem; font-weight: 400; letter-spacing: -0.02em; margin-bottom: 1rem; }
.highlight { display: inline-block; color: $primary; font-style: italic; }
.hero-description { max-width: 420px; color: $muted-text; font-size: 1.05rem; line-height: 1.75; margin: 0; }
.hero-benefits {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.5rem;
  list-style: none;
  padding: 0;
  margin: 1.75rem 0 0;
  font-size: 0.8rem;
  color: $muted-text;
  li { display: flex; align-items: center; gap: 0.4rem; padding: 0.3rem 0.6rem; border: 1px dashed $gray-300; border-radius: 6px; background: var(--color-background); }
  svg { color: $primary; font-size: 0.7rem; }
}
.hero-form { min-width: 0; }
.kitten-greeting {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-right: 1.5rem;
  margin-bottom: -8px;
  position: relative;
  span { color: $primary; font-family: var(--font-note); font-size: 0.875rem; transform: rotate(-5deg); }
  img { object-fit: contain; transform: rotate(6deg); }
}
.kitten-note { display: flex; align-items: center; justify-content: center; gap: 0.5rem; color: $muted-text; font-size: 0.75rem; margin: 1.25rem 0 0; }

@media (max-width: 768px) {
  .hero-section { padding: env(safe-area-inset-top, 0px) 1.25rem 0; }
  .landing-nav { min-height: 80px; }
  .brand { font-size: 1.2rem; img { width: 34px; height: 34px; } }
  .nav-actions { gap: 0.75rem; font-size: 0.8rem; }
  .hero-content { grid-template-columns: 1fr; gap: 2.25rem; padding: 2rem 0 3rem; }
  h1 { font-size: clamp(2.7rem, 10vw, 3.75rem); }
  .hero-description { font-size: 1rem; }
  .eyebrow { margin-bottom: 1rem; font-size: 0.75rem; }
  .hero-form { width: 100%; max-width: 480px; margin: 0 auto; }
}
@media (max-width: 360px) {
  .nav-actions a { display: none; }
  .hero-benefits { gap: 0.75rem; }
}
</style>
