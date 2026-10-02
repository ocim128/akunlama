<template>
  <div class="email-form-container">
    <div class="form-header">
      <p class="form-kicker">one inbox, coming right up</p>
      <h2 class="form-instruction">What shall we call you?</h2>
      <p class="form-description">Pick a name, or let the dice decide.</p>
    </div>
    
    <form @submit.prevent="handleSubmit" class="email-form">
      <div class="email-input-wrapper">
        <div class="email-input-group">
          <label for="email-name-input" class="input-label">Email name</label>
          <input
            id="email-name-input"
            type="text"
            v-model="randomName"
            placeholder="sleepy-kitten"
            class="main-email-input"
            autocomplete="off"
            autocapitalize="none"
            spellcheck="false"
            aria-describedby="email-form-hint"
            required
          />
          <button
            type="button"
            class="domain-display" 
            :class="{ 'copied': isCopied }"
            :disabled="!randomName.trim()"
            :aria-label="isCopied ? 'Email address copied' : 'Copy email address'"
            @click="copyEmail" 
            :title="'Click to copy: ' + fullEmailAddress"
          >
            {{ isCopied ? '✓ Copied!' : '@' + domain }}
          </button>
        </div>
      </div>
      
      <div class="action-buttons">
        <button type="submit" class="btn-get-mail" :disabled="!randomName.trim()">
          <font-awesome-icon icon="paper-plane" />
          Open inbox
        </button>
        
        <button type="button" class="btn-shuffle" @click="generateNewName">
          <font-awesome-icon icon="dice" class="dice-icon" />
          Random name
        </button>
      </div>
    </form>
    <p id="email-form-hint" class="form-hint">No password needed. Emails are deleted after 3 days.</p>
    <p class="copy-status" :class="{ 'sr-only': !copyFailed }" role="status">{{ copyStatus }}</p>
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
      isCopied: false,
      copyFailed: false,
      copyStatus: '',
      copyTimer: null
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
    if (!navigator.clipboard) this.initClipboard()
  },
  beforeUnmount() {
    clearTimeout(this.copyTimer)
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
      this.isCopied = false
      this.copyFailed = false
      this.copyStatus = ''
    },
    initClipboard() {
      this.$clipboard = new ClipboardJS(this.$el.querySelector('.domain-display'), {
        text: () => this.fullEmailAddress
      })
      this.$clipboard.on('success', () => this.handleCopySuccess())
      this.$clipboard.on('error', () => this.handleCopyError())
    },
    copyEmail() {
      if (!this.randomName.trim()) return
      if (navigator.clipboard) {
        navigator.clipboard.writeText(this.fullEmailAddress).then(() => {
          this.handleCopySuccess()
        }).catch(() => this.handleCopyError())
      }
    },
    handleCopySuccess() {
      clearTimeout(this.copyTimer)
      this.isCopied = true
      this.copyFailed = false
      this.copyStatus = 'Email address copied.'
      this.copyTimer = setTimeout(() => { this.isCopied = false }, 2000)
    },
    handleCopyError() {
      this.isCopied = false
      this.copyFailed = true
      this.copyStatus = 'Unable to copy. Select the address and copy it manually.'
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
  background: var(--color-surface);
  border: 1.5px solid var(--color-ink);
  border-radius: 20px;
  padding: clamp(1.25rem, 3vw, 2.25rem);
  width: 100%;
  color: $dark-text;
  box-shadow: 5px 6px 0 var(--color-ink);
  &::before { content: ''; position: absolute; top: -9px; left: 1.5rem; width: 64px; height: 18px; border: 1px solid $gray-300; background: var(--color-background); transform: rotate(-6deg); pointer-events: none; }
}
.form-header { margin-bottom: 1.75rem; }
.form-kicker { color: $primary; font-family: var(--font-note); font-size: 0.8rem; font-weight: 600; margin: 0 0 0.75rem; }
.form-instruction { font-family: var(--font-display); font-size: clamp(1.3rem, 2vw, 1.6rem); letter-spacing: -0.04em; line-height: 1.25; margin: 0 0 0.6rem; }
.form-description { color: $muted-text; font-size: 0.875rem; margin: 0; }
.email-form { display: flex; flex-direction: column; gap: 1rem; }
.email-input-group {
  display: flex;
  flex-wrap: wrap;
  border: 1px solid $gray-300;
  border-radius: 10px;
  background: var(--color-background);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  &:focus-within { border-color: $primary; box-shadow: 0 0 0 3px var(--color-accent-soft); }
}
.email-input-wrapper { padding-top: 1.75rem; position: relative; }
.input-label { position: absolute; top: 0; left: 0; font-size: 0.8rem; font-weight: 600; }
.main-email-input {
  flex: 1;
  width: 0;
  min-width: 0;
  min-height: 52px;
  padding: 0.85rem 0.75rem;
  border: none;
  border-radius: 10px 0 0 10px;
  font-size: 1rem;
  background: transparent;
  color: $dark-text;
  outline: none;
  &::placeholder { color: $muted-text; font-size: 0.875rem; }
}
.domain-display {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 0.75rem;
  max-width: 55%;
  overflow-wrap: anywhere;
  border-left: 1px solid $gray-200;
  border-radius: 0 10px 10px 0;
  color: $primary;
  font-size: 0.8rem;
  font-weight: 600;
  min-height: 52px;
  &:hover:not(:disabled) { background: var(--color-accent-soft); }
  &:focus-visible { outline-offset: -4px; }
  &:disabled { color: $muted-text; }
  &.copied { color: $primary; background: var(--color-accent-soft); }
}
.action-buttons { display: flex; gap: 0.75rem; }
.btn-get-mail, .btn-shuffle {
  flex: 1;
  min-height: 48px;
  padding: 0.75rem 0.65rem;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: background 0.2s ease, transform 0.2s ease;
  &:active:not(:disabled) { transform: scale(0.98); }
}
.btn-get-mail {
  background: var(--color-action);
  color: white;
  border: 1px solid var(--color-ink);
  box-shadow: 0 3px 0 var(--color-ink);
  &:hover:not(:disabled) { background: var(--color-action-hover); transform: translateY(-1px); }
  &:active:not(:disabled) { transform: translateY(2px); box-shadow: none; }
  &:disabled { opacity: 0.5; box-shadow: none; }
}
.btn-shuffle {
  background: var(--color-surface);
  color: $dark-text;
  border: 1px solid $gray-300;
  &:hover { background: $gray-100; }
}
.copy-status { color: $muted-text; font-size: 0.75rem; }
.form-hint { margin: 1.25rem 0 0; color: $muted-text; font-size: 0.75rem; line-height: 1.6; }
@media (max-width: 768px) {
  .action-buttons { flex-direction: column; }
}
</style>
