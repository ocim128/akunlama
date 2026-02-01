<template>
  <div class="email-form-container glass-card">
    <div class="form-header">
      <p class="form-instruction">🐾 Claim your cat-tastic identity!</p>
    </div>
    
    <form @submit.prevent="handleSubmit" class="email-form">
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
</template>

<script>
import config from '@/../config/apiconfig'
import ClipboardJS from 'clipboard'

export default {
  name: 'EmailForm',
  emits: ['submit-email'],
  data() {
    return {
      randomName: '',
      isCopied: false
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
  mounted() {
    this.initClipboard()
  },
  beforeUnmount() {
    if (this.$clipboard) {
      this.$clipboard.destroy()
    }
  },
  methods: {
    generateRandomName() {
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
      this.$clipboard = new ClipboardJS('.domain-display', {
        text: () => this.fullEmailAddress
      })
      this.$clipboard.on('success', () => this.handleCopySuccess())
    },
    copyEmail() {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(this.fullEmailAddress).then(() => {
          this.handleCopySuccess()
        }).catch(() => this.handleCopySuccess())
      } else {
        this.handleCopySuccess()
      }
    },
    handleCopySuccess() {
      this.isCopied = true
      setTimeout(() => { this.isCopied = false }, 2000)
    },
    handleSubmit() {
      if (!this.randomName.trim()) return
      this.$emit('submit-email', this.randomName)
    }
  }
}
</script>

<style lang="scss" scoped>
@use "../../scss/color" as *;

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
  
  &.glass-card {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.4);
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.15),
      0 0 0 1px rgba(255, 255, 255, 0.2) inset,
      0 4px 16px rgba(79, 70, 229, 0.1);
  }
}

.form-header { margin-bottom: 1.2rem; }
.form-instruction { font-weight: 600; color: #1f2937; font-size: 1rem; margin: 0; }

.email-form { display: flex; flex-direction: column; gap: 1.2rem; align-items: center; }
.email-input-wrapper { width: 100%; max-width: 400px; }

.email-input-group {
  display: flex;
  background: var(--color-surface);
  border: 2px solid $primary;
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.1);
  
  &:focus-within {
    border-color: #FF6B9D;
    box-shadow: 0 4px 12px rgba(255, 107, 157, 0.2);
    transform: translateY(-1px);
  }
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
  
  &:hover { background: #f1f5f9; color: #3730A3; }
  &.copied { background: #10B981; color: white; font-size: 0.8rem; }
}

.action-buttons { display: flex; gap: 0.8rem; width: 100%; max-width: 400px; justify-content: center; }

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
  min-height: 48px;
}

.btn-get-mail {
  background: linear-gradient(135deg, #FF6B9D, #C084FC);
  color: white;
  box-shadow: 0 3px 10px rgba(255, 107, 157, 0.3);
  
  &:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(255, 107, 157, 0.4); }
  &:active:not(:disabled) { transform: scale(0.97); }
}

.btn-shuffle {
  background: white;
  color: #4F46E5;
  border: 2px solid #4F46E5;
  
  &:hover {
    background: #4F46E5;
    color: white;
    .dice-icon { animation: diceRoll 0.6s ease-in-out; }
  }
}

@keyframes diceRoll {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .email-form-container { padding: 1.25rem 1rem; border-radius: 16px; }
  .email-input-group { border-radius: 8px; }
  .main-email-input { font-size: 1rem !important; }
  .action-buttons { flex-direction: column; }
  .btn-get-mail, .btn-shuffle { max-width: none; width: 100%; }
}
</style>
