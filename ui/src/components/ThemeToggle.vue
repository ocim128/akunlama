<template>
  <button 
    class="theme-toggle" 
    @click="toggleTheme" 
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
  >
    <div class="toggle-track">
      <div class="toggle-thumb" :class="{ 'is-dark': isDark }">
        <transition name="fade-icon" mode="out-in">
          <font-awesome-icon v-if="isDark" icon="moon" key="moon" />
          <font-awesome-icon v-else icon="sun" key="sun" />
        </transition>
      </div>
    </div>
  </button>
</template>

<script>
export default {
  name: 'ThemeToggle',
  emits: ['theme-changed'],
  data() {
    return {
      isDark: false
    }
  },
  mounted() {
    // Check for saved theme or system preference
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      this.setTheme(true);
    } else {
      this.setTheme(false);
    }
  },
  methods: {
    toggleTheme() {
      this.setTheme(!this.isDark);
    },
    setTheme(dark) {
      this.isDark = dark;
      if (dark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
      }
      this.$emit('theme-changed', dark);
    }
  }
}
</script>

<style lang="scss" scoped>
@use "@/scss/color" as *;

.theme-toggle {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  z-index: 100;

  &:hover {
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
}

.toggle-track {
  width: 56px;
  height: 30px;
  background: $gray-200;
  border-radius: 30px;
  position: relative;
  transition: background-color 0.3s ease;
  border: 1px solid $gray-300;

  [data-theme='dark'] & {
    background: $gray-700;
    border-color: $gray-600;
  }
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 24px;
  height: 24px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55), background-color 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  color: #f59e0b; // Sun color

  &.is-dark {
    transform: translateX(26px);
    background: #1e293b;
    color: #818cf8; // Moon color
  }

  i {
    font-size: 0.9rem;
  }
}

.fade-icon-enter-active, .fade-icon-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-icon-enter-from {
  opacity: 0;
  transform: rotate(-90deg) scale(0.5);
}

.fade-icon-leave-to {
  opacity: 0;
  transform: rotate(90deg) scale(0.5);
}

// Mobile optimizations
@media (max-width: 768px) {
  .theme-toggle {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  .toggle-track {
    width: 44px;
    height: 24px;
  }

  .toggle-thumb {
    width: 18px;
    height: 18px;

    &.is-dark {
      transform: translateX(20px);
    }

    i {
      font-size: 0.7rem;
    }
  }
}
</style>
