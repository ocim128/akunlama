<template>
  <section class="faq-section">
    <h2>Questions You Might Ask (Or Not):</h2>
    <div class="faq-grid">
      <div class="faq-item">
        <h4>🤔 Is this actually free?</h4>
        <p>Yep! Our kittens work for treats and belly rubs.</p>
      </div>
      <div class="faq-item">
        <h4>😱 What if I forget to check?</h4>
        <p>The kittens will judge you silently, then delete everything after 24h.</p>
      </div>
      <div class="faq-item">
        <h4>🔒 Is my data safe?</h4>
        <p>Safer than your secrets are from your cat who definitely knows everything.</p>
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

.faq-section {
  text-align: center;
  
  h2 { color: #1f2937; font-size: 1.8rem; font-weight: 600; margin-bottom: 2rem; }
}

.faq-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  max-width: 900px;
  margin: 0 auto;
}

.faq-item {
  background: var(--color-surface);
  border-radius: 16px;
  padding: 2rem;
  text-align: left;
  box-shadow: $shadow-md;
  transition: transform 0.3s ease, background 0.3s ease;
  
  &:hover { transform: translateY(-5px); }
  
  h4 { color: $dark-text; font-size: 1.1rem; font-weight: 600; margin: 0 0 1rem 0; }
  p { color: $muted-text; line-height: 1.6; margin: 0; }
}

@media (max-width: 768px) {
  .faq-section h2 { font-size: 1.25rem; }
  .faq-grid { grid-template-columns: 1fr; gap: 1rem; }
  .faq-item { padding: 1.25rem; h4 { font-size: 1rem; } }
}
</style>
