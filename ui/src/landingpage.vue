<template>
  <div class="landing-page">
    <header class="hero-section">
      <div class="hero-content">
        <img class="logo" src="@/assets/inbox_kitten.png" alt="Akunlama Logo" />
        <h1>Open-Source <span class="highlight">Disposable Email</span></h1>
        <h2>(Served by Adorably Lazy Kittens 🐱)</h2>
        
        <!-- EMAIL FORM - REDESIGNED FOR BETTER SPACING -->
        <div class="email-form-container">
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
                <span class="domain-display" @click="copyEmail" :title="'Click to copy: ' + fullEmailAddress">
                  @{{ domain }}
                </span>
              </div>
            </div>
            
            <div class="action-buttons">
              <button type="submit" class="btn-get-mail" :disabled="!randomName.trim()">
                <i class="fas fa-paper-plane"></i>
                Get Mail Nyow!
              </button>
              
              <button type="button" class="btn-shuffle" @click="generateNewName">
                <i class="fas fa-dice"></i>
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
import $ from 'jquery'
import config from '@/../config/apiconfig.js'
import 'normalize.css'
import ClipboardJS from 'clipboard'

export default {
  name: 'LandingPage',
  data() {
    return {
      randomName: ''
    }
  },
  mounted() {
    // Keep randomName empty by default - user can generate name with shuffle button
    this.initClipboard()
  },
  beforeDestroy() {
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
        this.showCopySuccess()
      })
    },

    copyEmail() {
      navigator.clipboard.writeText(this.fullEmailAddress).then(() => {
        this.showCopySuccess()
      }).catch(() => {
        // Fallback for browsers that don't support clipboard API
        this.showCopySuccess()
      })
    },

    showCopySuccess() {
      // Create a temporary visual feedback for the new domain-display class
      const domainEl = document.querySelector('.domain-display')
      if (domainEl) {
        const originalText = domainEl.textContent
        const originalBg = domainEl.style.background || '#f8fafc'
        const originalColor = domainEl.style.color || '#4F46E5'
        
        domainEl.textContent = '✓ Copied!'
        domainEl.style.background = '#10B981'
        domainEl.style.color = 'white'
        domainEl.style.fontSize = '0.7rem'
        
        setTimeout(() => {
          domainEl.textContent = originalText
          domainEl.style.background = originalBg
          domainEl.style.color = originalColor
          domainEl.style.fontSize = '' // Reset font size
        }, 2000)
      }
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
@import url('https://use.fontawesome.com/releases/v5.3.1/css/all.css');
@import 'scss/_color.scss';

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
  background: linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%);
  color: white;
  padding: 3rem 2rem;
  text-align: center;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
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

// REDESIGNED EMAIL FORM - COMPACT AND WELL-SPACED
.email-form-container {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 1.8rem 1.5rem;
  margin: 1.5rem auto;
  max-width: 480px;
  width: 90%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  color: #333;
  text-align: center;
  border: 2px solid rgba(255, 255, 255, 0.8);
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
  background: white;
  border: 2px solid #4F46E5;
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
  color: #333 !important;
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

.btn-get-mail:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-shuffle {
  background: white;
  color: #4F46E5;
  border: 2px solid #4F46E5;
}

.btn-shuffle:hover {
  background: #4F46E5;
  color: white;
  transform: translateY(-1px);
}



// Content section
.content-section {
  background: #f9fafb;
  padding: 4rem 2rem;
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
  background: white;
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s ease;
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
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease;
  font-weight: 500;
  color: #374151;
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
  background: white;
  border-radius: 16px;
  padding: 2rem;
  text-align: left;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s ease;
}

.faq-item:hover {
  transform: translateY(-5px);
}

.faq-item h4 {
  color: #1f2937;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
}

.faq-item p {
  color: #6b7280;
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
    font-size: 2rem;
  }
  
  .hero-section {
    padding: 2rem 1rem;
    min-height: 100vh;
  }
  
  .email-form-container {
    padding: 1.2rem 1rem;
    margin: 1rem auto;
    max-width: 95vw;
    width: 95%;
  }
  
  .email-form {
    gap: 1rem;
  }
  
  .form-header {
    margin-bottom: 1rem;
  }
  
  .form-instruction {
    font-size: 0.9rem;
  }
  
  .email-input-wrapper {
    max-width: 100%;
  }
  
  .main-email-input {
    font-size: 0.9rem !important;
    padding: 0.8rem 0.1rem !important; // Minimal padding to maximize domain space
  }
  
  .domain-display {
    padding: 0.8rem 0.2rem; // Ultra minimal padding for maximum domain text space
    font-size: 0.75rem; // Smaller but still readable
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 0.6rem;
    max-width: 100%;
  }
  
  .btn-get-mail, .btn-shuffle {
    max-width: 100%;
    padding: 0.8rem 1rem;
    font-size: 0.85rem;
  }
  
  .content-section {
    padding: 3rem 1rem;
  }
  
  .fun-facts {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .use-cases-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .faq-grid {
    grid-template-columns: 1fr;
  }
}
</style>
