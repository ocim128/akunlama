<template>
  <header class="hero-section">
    <!-- Floating animated elements -->
    <div class="floating-elements">
      <div class="float-item float-1">🐱</div>
      <div class="float-item float-2">✉️</div>
      <div class="float-item float-3">🐾</div>
      <div class="float-item float-4">💌</div>
      <div class="float-item float-5">😺</div>
      <div class="float-item float-6">📧</div>
    </div>
    
    <div class="hero-content">
      <img class="logo" src="@/assets/inbox_kitten.png" alt="Akunlama Logo" />
      <h1>Open-Source <span class="highlight">Disposable Email</span></h1>
      <h2>(Served by Adorably Lazy Kittens 🐱)</h2>
      
      <slot></slot>
    </div>
  </header>
</template>

<script>
export default {
  name: 'HeroSection'
}
</script>

<style lang="scss" scoped>
@use "../../scss/color" as *;

.hero-section {
  background: linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-secondary-dark) 100%);
  color: white;
  padding: 3rem 2rem;
  text-align: center;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

.floating-elements {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.float-item {
  position: absolute;
  font-size: 2rem;
  opacity: 0.3;
  animation: floatAround 20s ease-in-out infinite;
  
  &.float-1 { top: 10%; left: 10%; animation-duration: 18s; }
  &.float-2 { top: 20%; right: 15%; animation-delay: -3s; animation-duration: 22s; }
  &.float-3 { bottom: 30%; left: 20%; animation-delay: -6s; animation-duration: 16s; }
  &.float-4 { top: 60%; right: 10%; animation-delay: -9s; animation-duration: 24s; }
  &.float-5 { bottom: 15%; left: 5%; animation-delay: -12s; animation-duration: 20s; }
  &.float-6 { top: 5%; right: 30%; animation-delay: -15s; animation-duration: 19s; }
}

@keyframes floatAround {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(30px, -20px) rotate(10deg); }
  50% { transform: translate(-10px, 30px) rotate(-5deg); }
  75% { transform: translate(-30px, -10px) rotate(5deg); }
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.logo {
  width: 200px;
  height: auto;
  margin-bottom: 2rem;
}

h1 {
  font-size: 3rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
  line-height: 1.2;
}

.highlight {
  background: linear-gradient(90deg, #FFE066, #FF6B9D);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

h2 {
  font-size: 1.2rem;
  font-weight: 400;
  margin: 0 0 3rem 0;
  opacity: 0.9;
}

@media (max-width: 768px) {
  h1 { font-size: 1.75rem; line-height: 1.3; }
  h2 { font-size: 1rem; margin-bottom: 2rem; }
  .logo { width: 140px; margin-bottom: 1.5rem; }
  .hero-section {
    padding: 2rem 1rem;
    padding-top: calc(2rem + env(safe-area-inset-top, 0px));
    min-height: 100vh;
    min-height: 100dvh;
  }
  .floating-elements {
    .float-item { font-size: 1.25rem; opacity: 0.15; }
    .float-3, .float-5 { display: none; }
  }
}

@media (max-width: 380px) {
  h1 { font-size: 1.5rem; }
  .logo { width: 120px; }
}
</style>
