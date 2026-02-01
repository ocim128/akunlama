<template>
  <div class="facts-wrapper">
    <!-- Fun Facts -->
    <section class="fun-facts">
      <div class="fact-card">
        <div class="fact-emoji">🐱</div>
        <h3>Kitten-Powered™ Technology</h3>
        <p>Tiny digital kittens with tiny laptops deliver your emails while purring!</p>
      </div>
      
      <div class="fact-card">
        <div class="fact-emoji">⏰</div>
        <h3>24h Auto-Purr-Destruction</h3>
        <p>Vanishes faster than treats when cats hear the bag crinkle!</p>
      </div>
      
      <div class="fact-card">
        <div class="fact-emoji">🚀</div>
        <h3>Lightning Fast Delivery</h3>
        <p>Faster than a cat running away after knocking something over!</p>
      </div>
    </section>

    <!-- Use Cases -->
    <section class="use-cases-section">
      <h2>Perfect For When You Don't Want Humans Bothering You:</h2>
      <div class="use-cases-grid">
        <div class="use-case">📝 Annoying signups</div>
        <div class="use-case">✅ "Please verify" stuff</div>
        <div class="use-case">🛡️ Avoiding spam lords</div>
        <div class="use-case">🧪 Testing your apps</div>
        <div class="use-case">📰 "Free" newsletters</div>
        <div class="use-case">🎁 "Limited time" offers</div>
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

.fun-facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-bottom: 4rem;
}

.fact-card {
  background: var(--color-surface);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  box-shadow: $shadow-md;
  transition: transform 0.3s ease, background 0.3s ease;
  
  &:hover { transform: translateY(-5px); }
  
  .fact-emoji { font-size: 3rem; margin-bottom: 1rem; }
  h3 { color: #1f2937; font-size: 1.25rem; font-weight: 600; margin: 0 0 1rem 0; }
  p { color: #6b7280; line-height: 1.6; margin: 0; }
}

.use-cases-section {
  text-align: center;
  margin-bottom: 4rem;
  
  h2 { color: #1f2937; font-size: 1.8rem; font-weight: 600; margin-bottom: 2rem; }
}

.use-cases-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  max-width: 700px;
  margin: 0 auto;
}

.use-case {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: $shadow-sm;
  transition: transform 0.3s ease, background 0.3s ease;
  font-weight: 500;
  color: $dark-text;
  
  &:hover { transform: translateY(-3px); }
}

@media (max-width: 768px) {
  .fun-facts { grid-template-columns: 1fr; gap: 1rem; }
  .fact-card { padding: 1.5rem; .fact-emoji { font-size: 2rem; } h3 { font-size: 1.1rem; } }
  .use-cases-section { h2 { font-size: 1.25rem; } }
  .use-cases-grid { grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
  .use-case { padding: 1rem; font-size: 0.85rem; }
}

@media (max-width: 380px) {
  .use-cases-grid { grid-template-columns: 1fr; }
}
</style>
