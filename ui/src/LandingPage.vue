<template>
  <div class="landing-page">
    <hero-section>
      <email-form @submit-email="goToInbox" />
    </hero-section>

    <main class="content-section">
      <div class="content-wrapper">
        <fun-facts-section />
        <faq-section />
      </div>
    </main>

    <page-footer />
  </div>
</template>

<script>
import HeroSection from './components/landing/HeroSection.vue'
import EmailForm from './components/landing/EmailForm.vue'
import FunFactsSection from './components/landing/FunFactsSection.vue'
import FaqSection from './components/landing/FaqSection.vue'
import PageFooter from './components/common/PageFooter.vue'

export default {
  name: 'LandingPage',
  components: {
    HeroSection,
    EmailForm,
    FunFactsSection,
    FaqSection,
    PageFooter
  },
  methods: {
    goToInbox(email) {
      this.$router.push({
        name: 'Inbox',
        params: {
          email: email
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
@use "./scss/color" as *;

.landing-page {
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.content-section {
  background: var(--color-background);
  padding: 4rem 2rem;
  transition: background 0.3s ease;
}

.content-wrapper {
  max-width: 1000px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .content-section {
    padding: 2.5rem 1rem;
  }
}
</style>
