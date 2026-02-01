<template>
  <div class="landing-page">
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
        
        <!-- EMAIL FORM - GLASSMORPHISM DESIGN -->
        <div class="email-form-container glass-card">
          <div class="form-header">
            <p class="form-instruction">🐾 Claim your cat-tastic identity!</p>
          </div>
          
          <form @submit.prevent="goToInbox" class="email-form">
            <div class="email-input-wrapper">
              <div class="email-input-group">
                <input
                  id="email-name-input"
                  type="text"
                  v-model="randomName"
                  placeholder="Enter your username"
                  class="main-email-input"
                  required
                />
                <span 
                  class="domain-display" 
                  :class="{ 'copied': isCopied }"
                  @click="copyEmail" 
                  :title="'Click to copy: ' + fullEmailAddress"
                >
                  {{ isCopied ? '✓ Copied!' : '@' + domain }}
                </span>
              </div>
            </div>
            
            <div class="action-buttons">
              <button type="submit" class="btn-get-mail" :disabled="!randomName.trim()">
                <font-awesome-icon icon="paper-plane" />
                Get Mail Nyow!
              </button>
              
              <button type="button" class="btn-shuffle" @click="generateNewName">
                <font-awesome-icon icon="dice" class="dice-icon" />
                Cat-shuffle!
              </button>
            </div>
          </form>
        </div>
      </div>
    </header>

    <main class="content-section">
      <div class="content-wrapper">
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
        
        <!-- FAQ -->
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
      </div>
    </main>

    <!-- Footer -->
    <footer class="footer-section">
      <div class="footer-content">
        <p>Made with ❤️ and 🐱 for fellow humans who value privacy • 
           <a href="https://github.com/uilicious/inboxkitten" target="_blank">Peek at our code</a></p>
        <p class="footer-note">*No actual kittens were harmed. They're all napping in sunbeams. ☀️</p>
      </div>
    </footer>
  </div>
</template>

<script>
import config from '@/../config/apiconfig'
import 'normalize.css'
import ClipboardJS from 'clipboard'

export default {
  name: 'LandingPage',
  data() {
    return {
      randomName: '',
      isCopied: false
    }
  },
  mounted() {
    // Keep randomName empty by default
    this.initClipboard()
  },
  beforeUnmount() {
    if (this.$clipboard) {
      this.$clipboard.destroy()
    }
  },
  computed: {
    domain() {
      return config.domain
    },
    fullEmailAddress() {
      if (this.randomName.includes(`@${config.domain}`)) {
        return this.randomName
      }
      return `${this.randomName}@${config.domain}`
    }
  },
  methods: {
    generateRandomName() {
      // Expanded fun, readable combinations with dashes
      const adjectives = [
        'sleepy', 'fluffy', 'sneaky', 'bouncy', 'fuzzy', 'lazy', 'happy', 'silly',
        'clever', 'tiny', 'giant', 'swift', 'calm', 'wild', 'gentle', 'brave',
        'quiet', 'loud', 'smooth', 'rough', 'bright', 'dark', 'warm', 'cool',
        'playful', 'curious', 'mischievous', 'adorable', 'charming', 'witty', 'jolly', 'cheerful',
        'mighty', 'magical', 'sparkling', 'glowing', 'shiny', 'mysterious', 'ancient', 'cosmic',
        'electric', 'golden', 'silver', 'purple', 'emerald', 'crimson', 'azure', 'violet',
        'dancing', 'singing', 'jumping', 'flying', 'swimming', 'running', 'climbing', 'sliding',
        'smiling', 'laughing', 'giggling', 'whispering', 'dreaming', 'wondering', 'exploring', 'discovering',
        'cozy', 'snuggly', 'cuddly', 'tender', 'sweet', 'sour', 'spicy', 'minty',
        'fresh', 'crispy', 'soft', 'silky', 'velvet', 'cotton', 'wooly', 'feathery',
        'stormy', 'sunny', 'cloudy', 'misty', 'frosty', 'snowy', 'rainy', 'windy',
        'peppy', 'zippy', 'snappy', 'perky', 'quirky', 'funky', 'groovy', 'trendy'
      ]
      
      const nouns = [
        'kitten', 'cat', 'tiger', 'lion', 'panda', 'fox', 'wolf', 'bear',
        'rabbit', 'mouse', 'bird', 'fish', 'frog', 'bee', 'butterfly', 'owl',
        'penguin', 'dolphin', 'whale', 'shark', 'octopus', 'spider', 'ant', 'dog',
        'hamster', 'guinea', 'ferret', 'hedgehog', 'chinchilla', 'squirrel', 'raccoon', 'otter',
        'seal', 'walrus', 'elephant', 'giraffe', 'zebra', 'hippo', 'rhino', 'monkey',
        'koala', 'kangaroo', 'sloth', 'alpaca', 'llama', 'sheep', 'goat', 'pig',
        'duck', 'goose', 'swan', 'flamingo', 'parrot', 'peacock', 'robin', 'sparrow',
        'eagle', 'hawk', 'falcon', 'hummingbird', 'woodpecker', 'toucan', 'pelican', 'crane',
        'turtle', 'lizard', 'snake', 'gecko', 'iguana', 'chameleon', 'salamander', 'newt',
        'salmon', 'tuna', 'cod', 'bass', 'trout', 'pike', 'carp', 'goldfish',
        'starfish', 'seahorse', 'jellyfish', 'coral', 'anemone', 'urchin', 'crab', 'lobster',
        'snail', 'slug', 'worm', 'caterpillar', 'ladybug', 'firefly', 'dragonfly', 'cricket',
        'unicorn', 'dragon', 'phoenix', 'griffin', 'pegasus', 'fairy', 'wizard', 'knight',
        'ninja', 'pirate', 'robot', 'alien', 'ghost', 'vampire', 'witch', 'angel',
        'cookie', 'muffin', 'cupcake', 'donut', 'pretzel', 'bagel', 'waffle', 'pancake',
        'pizza', 'taco', 'burger', 'sandwich', 'soup', 'salad', 'pasta', 'noodle',
        'coffee', 'tea', 'cocoa', 'juice', 'soda', 'smoothie', 'milkshake', 'lemonade',
        'star', 'moon', 'sun', 'planet', 'comet', 'meteor', 'galaxy', 'nebula',
        'cloud', 'rainbow', 'lightning', 'thunder', 'breeze', 'storm', 'snowflake', 'raindrop',
        'mountain', 'valley', 'river', 'ocean', 'lake', 'forest', 'desert', 'island',
        'castle', 'tower', 'bridge', 'garden', 'park', 'beach', 'cave', 'waterfall'
      ]
      
      const numbers = Math.floor(Math.random() * 999) + 1
      const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
      const noun = nouns[Math.floor(Math.random() * nouns.length)]
      
      return `${adjective}-${noun}-${numbers}`
    },

    generateNewName() {
      this.randomName = this.generateRandomName()
    },

    initClipboard() {
      this.$clipboard = new ClipboardJS('.domain-display, .preview-email', {
        text: () => this.fullEmailAddress
      })

      this.$clipboard.on('success', () => {
        this.handleCopySuccess()
      })
    },

    copyEmail() {
      // Try modern API first
      if (navigator.clipboard) {
        navigator.clipboard.writeText(this.fullEmailAddress).then(() => {
          this.handleCopySuccess()
        }).catch(() => {
          this.handleCopySuccess() // Fallback visual feedback mainly
        })
      } else {
        // Fallback or ClipboardJS will catch it
        this.handleCopySuccess()
      }
    },

    handleCopySuccess() {
      this.isCopied = true
      setTimeout(() => {
        this.isCopied = false
      }, 2000)
    },

    goToInbox() {
      if (!this.randomName.trim()) return
      
      this.$router.push({
        name: 'Inbox',
        params: {
          email: this.randomName
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
@use "./scss/color" as *;

// Reset and base
* {
  box-sizing: border-box;
}

// Landing page layout
.landing-page {
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

// Hero section
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
  transition: background 0.5s ease;
  position: relative;
}

// Floating animated elements
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
  
  &.float-1 {
    top: 10%;
    left: 10%;
    animation-delay: 0s;
    animation-duration: 18s;
  }
  
  &.float-2 {
    top: 20%;
    right: 15%;
    animation-delay: -3s;
    animation-duration: 22s;
  }
  
  &.float-3 {
    bottom: 30%;
    left: 20%;
    animation-delay: -6s;
    animation-duration: 16s;
  }
  
  &.float-4 {
    top: 60%;
    right: 10%;
    animation-delay: -9s;
    animation-duration: 24s;
  }
  
  &.float-5 {
    bottom: 15%;
    left: 5%;
    animation-delay: -12s;
    animation-duration: 20s;
  }
  
  &.float-6 {
    top: 5%;
    right: 30%;
    animation-delay: -15s;
    animation-duration: 19s;
  }
}

@keyframes floatAround {
  0%, 100% {
    transform: translate(0, 0) rotate(0deg);
  }
  25% {
    transform: translate(30px, -20px) rotate(10deg);
  }
  50% {
    transform: translate(-10px, 30px) rotate(-5deg);
  }
  75% {
    transform: translate(-30px, -10px) rotate(5deg);
  }
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
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

// GLASSMORPHISM EMAIL FORM
.email-form-container {
  position: relative;
  z-index: 1;
  border-radius: 20px;
  padding: 2rem 1.5rem;
  margin: 1.5rem auto;
  max-width: 480px;
  width: 90%;
  color: $dark-text;
  text-align: center;
  
  // Glassmorphism effect
  &.glass-card {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.4);
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.15),
      0 0 0 1px rgba(255, 255, 255, 0.2) inset,
      0 4px 16px rgba(79, 70, 229, 0.1);
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: 20px;
      background: linear-gradient(
        135deg,
        rgba(255, 255, 255, 0.4) 0%,
        rgba(255, 255, 255, 0.1) 100%
      );
      pointer-events: none;
      z-index: -1;
    }
  }
}

.form-header {
  margin-bottom: 1.2rem;
}

.form-instruction {
  font-weight: 600;
  color: #1f2937;
  font-size: 1rem;
  margin: 0;
  line-height: 1.3;
}

// Main form layout
.email-form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  align-items: center;
}

// Email input section
.email-input-wrapper {
  width: 100%;
  max-width: 400px;
}

.email-input-group {
  display: flex;
  background: var(--color-surface);
  border: 2px solid $primary;
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.1);
}

.email-input-group:focus-within {
  border-color: #FF6B9D;
  box-shadow: 0 4px 12px rgba(255, 107, 157, 0.2);
  transform: translateY(-1px);
}

.main-email-input {
  flex: 1;
  padding: 0.9rem 1rem !important;
  border: none !important;
  font-size: 0.95rem !important;
  font-weight: 500 !important;
  background: transparent !important;
  color: $dark-text !important;
  outline: none !important;
  min-height: auto !important;
}

.main-email-input::placeholder {
  color: #9ca3af !important;
  font-size: 0.9rem !important;
}

.domain-display {
  display: flex;
  align-items: center;
  padding: 0.9rem 1rem;
  background: #f8fafc;
  color: #4F46E5;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  user-select: none;
  transition: all 0.3s ease;
  border-left: 1px solid #e2e8f0;
}

  .domain-display:hover {
    background: #f1f5f9;
    color: #3730A3;
  }

  .domain-display.copied {
    background: #10B981;
    color: white;
    font-size: 0.8rem;
    padding: 0.9rem 0.5rem;
  }

  .domain-display:active {
    background: #e2e8f0;
  }

// Action buttons
.action-buttons {
  display: flex;
  gap: 0.8rem;
  width: 100%;
  max-width: 400px;
  justify-content: center;
}

.btn-get-mail, .btn-shuffle {
  flex: 1;
  padding: 0.85rem 1.2rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  font-family: inherit;
  max-width: 160px;
  white-space: nowrap;
  // Improved touch targets
  min-height: 48px;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.btn-get-mail {
  background: linear-gradient(135deg, #FF6B9D, #C084FC);
  color: white;
  box-shadow: 0 3px 10px rgba(255, 107, 157, 0.3);
}

.btn-get-mail:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(255, 107, 157, 0.4);
}

.btn-get-mail:active:not(:disabled) {
  transform: scale(0.97);
  box-shadow: 0 2px 8px rgba(255, 107, 157, 0.3);
}

.btn-get-mail:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-shuffle {
  background: white;
  color: #4F46E5;
  border: 2px solid #4F46E5;
  
  .dice-icon {
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  
  &:hover {
    background: #4F46E5;
    color: white;
    transform: translateY(-1px);
    
    .dice-icon {
      animation: diceRoll 0.6s ease-in-out;
    }
  }

  &:active {
    transform: scale(0.97);
  }
}

@keyframes diceRoll {
  0% {
    transform: rotate(0deg) scale(1);
  }
  25% {
    transform: rotate(90deg) scale(1.2);
  }
  50% {
    transform: rotate(180deg) scale(1);
  }
  75% {
    transform: rotate(270deg) scale(1.2);
  }
  100% {
    transform: rotate(360deg) scale(1);
  }
}



// Content section
.content-section {
  background: var(--color-background);
  padding: 4rem 2rem;
  transition: background 0.3s ease;
}

.content-wrapper {
  max-width: 1000px;
  margin: 0 auto;
}

// Fun facts
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
}

.fact-card:hover {
  transform: translateY(-5px);
}

.fact-emoji {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.fact-card h3 {
  color: #1f2937;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
}

.fact-card p {
  color: #6b7280;
  line-height: 1.6;
    margin: 0;
  }

// Use cases
.use-cases-section {
  text-align: center;
  margin-bottom: 4rem;
}

.use-cases-section h2 {
  color: #1f2937;
  font-size: 1.8rem;
  font-weight: 600;
  margin-bottom: 2rem;
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
}

.use-case:hover {
  transform: translateY(-3px);
}

// FAQ section
.faq-section {
  text-align: center;
}

.faq-section h2 {
  color: #1f2937;
  font-size: 1.8rem;
  font-weight: 600;
  margin-bottom: 2rem;
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
}

.faq-item:hover {
  transform: translateY(-5px);
}

.faq-item h4 {
  color: $dark-text;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
}

.faq-item p {
  color: $muted-text;
  line-height: 1.6;
  margin: 0;
}

// Footer
.footer-section {
  background: #1f2937;
  color: white;
  padding: 2rem;
  text-align: center;
}

.footer-content {
  max-width: 800px;
  margin: 0 auto;
}

.footer-content p {
  margin: 0.5rem 0;
}

.footer-content a {
  color: #06b6d4;
  text-decoration: none;
}

.footer-content a:hover {
  text-decoration: underline;
}

.footer-note {
  font-size: 0.9rem;
  color: #9ca3af;
  font-style: italic;
}

// Mobile responsive design for new form
@media (max-width: 768px) {
  h1 {
    font-size: 1.75rem;
    line-height: 1.3;
  }

  h2 {
    font-size: 1rem;
    margin-bottom: 2rem;
  }

  .logo {
    width: 140px;
    margin-bottom: 1.5rem;
  }
  
  .hero-section {
    padding: 2rem 1rem;
    padding-top: calc(2rem + env(safe-area-inset-top, 0px));
    min-height: 100vh;
    min-height: 100dvh; // Dynamic viewport height for mobile browsers
  }

  // Reduce floating elements on mobile for performance
  .floating-elements {
    .float-item {
      font-size: 1.25rem;
      opacity: 0.15;
    }
    
    // Hide some floating items on mobile
    .float-3, .float-5 {
      display: none;
    }
  }
  
  .email-form-container {
    padding: 1.25rem 1rem;
    margin: 1rem auto;
    max-width: 95vw;
    width: 95%;
    border-radius: 16px;
  }
  
  .email-form {
    gap: 1rem;
  }
  
  .form-header {
    margin-bottom: 0.75rem;
  }
  
  .form-instruction {
    font-size: 0.9rem;
  }
  
  .email-input-wrapper {
    max-width: 100%;
  }

  .email-input-group {
    border-radius: 8px;
  }
  
  .main-email-input {
    font-size: 1rem !important;
    padding: 0.9rem 0.75rem !important;
  }
  
  .domain-display {
    padding: 0.9rem 0.5rem;
    font-size: 0.8rem;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 0.75rem;
    max-width: 100%;
    align-items: center;
  }
  
  .btn-get-mail, .btn-shuffle {
    max-width: none;
    flex: 1;
    padding: 0.9rem 0.75rem;
    font-size: 0.8rem;
    border-radius: 10px;
  }
  
  .content-section {
    padding: 2.5rem 1rem;
  }
  
  .fun-facts {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .fact-card {
    padding: 1.5rem;
    
    .fact-emoji {
      font-size: 2rem;
      margin-bottom: 0.75rem;
    }

    h3 {
      font-size: 1.1rem;
    }

    p {
      font-size: 0.9rem;
    }
  }

  .use-cases-section {
    margin-bottom: 2.5rem;

    h2 {
      font-size: 1.25rem;
      margin-bottom: 1.5rem;
    }
  }
  
  .use-cases-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .use-case {
    padding: 1rem;
    font-size: 0.85rem;
  }

  .faq-section {
    h2 {
      font-size: 1.25rem;
    }
  }
  
  .faq-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .faq-item {
    padding: 1.25rem;

    h4 {
      font-size: 1rem;
    }

    p {
      font-size: 0.9rem;
    }
  }

  .footer-section {
    padding: 1.5rem 1rem;
    padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));

    p {
      font-size: 0.85rem;
    }

    .footer-note {
      font-size: 0.8rem;
    }
  }
}

// Extra small devices
@media (max-width: 380px) {
  h1 {
    font-size: 1.5rem;
  }

  .logo {
    width: 120px;
  }

  .email-form-container {
    padding: 1rem 0.75rem;
  }

  .btn-get-mail, .btn-shuffle {
    padding: 0.85rem 0.5rem;
    font-size: 0.75rem;
    gap: 0.25rem;
  }

  .use-cases-grid {
    grid-template-columns: 1fr;
  }
}
</style>
