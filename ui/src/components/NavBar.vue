<template>
	<nav class="modern-nav" aria-label="Inbox navigation">
		<div class="nav-container">
			<!-- Back button with label -->
			<button class="nav-back-btn" @click="backAPage" :aria-label="backButtonLabel">
				<font-awesome-icon icon="arrow-left" />
				<span class="back-label">{{ $route.name === 'List' ? 'Home' : 'Back' }}</span>
			</button>

			<!-- Logo -->
			<button type="button" class="nav-logo" @click="goMainPage" aria-label="Akunlama home">
				<img class="logo-img" src="@/assets/logo_no_text.svg" alt=""/>
				<span>Akunlama.</span>
			</button>

			<!-- Email Input -->
			<email-input-group 
				:email="email" 
				:is-refreshing="isRefreshing"
				@update:email="email = $event"
				@submit-email="changeInbox"
				@refresh="emitRefresh"
			/>

			<!-- Theme Toggle -->
			<div class="nav-theme-toggle">
				<ThemeToggle />
			</div>
		</div>
	</nav>
</template>

<script>
	import 'normalize.css'
	import ThemeToggle from './ThemeToggle.vue'
	import EmailInputGroup from './common/EmailInputGroup.vue'

	export default {
		name: 'NavBar',
		components: {
			ThemeToggle,
			EmailInputGroup
		},
		data: () => {
			return {
				email: '',
				isRefreshing: false
			}
		},
		computed: {
			backButtonLabel() {
				return this.$route.name === 'List' ? 'Back to home' : 'Back to inbox'
			}
		},
		watch: {
			'$route.params.email'(newEmail) {
				if (newEmail) {
					this.email = newEmail
				}
			}
		},
		mounted () {
			this.email = this.$route.params.email || ''
			if (this.email === '') {
				this.goMainPage()
			}

			this.setupRefreshListener()
		},
		methods: {
			setupRefreshListener() {
				this.$eventHub.on('refreshStart', () => {
					this.isRefreshing = true
				})
				this.$eventHub.on('refreshEnd', () => {
					this.isRefreshing = false
				})
			},

			goMainPage () {
				this.$router.push({
					name: 'Kitten Land'
				})
			},
			emitRefresh () {
				if (this.isRefreshing) return
				this.isRefreshing = true
				this.$eventHub.emit('refresh', '')
				// Reset after 3 seconds as fallback
				setTimeout(() => {
					this.isRefreshing = false
				}, 3000)
			},
			changeInbox (email) {
				if (!email.trim()) return
				this.email = email
				
				this.$router.push({
					name: 'List',
					params: {
						email: this.email
					}
				})
				this.$eventHub.emit('refreshInbox', {email: this.email})
			},
			backAPage () {
				if (this.$route.name === 'List') {
					this.$router.push({
						name: 'Kitten Land'
					})
				} else {
					this.$router.push({
						name: 'List',
						params: {
							email: this.email
						}
					})
				}
			}
		}
	}
</script>

<style lang="scss" scoped>
@use "../scss/color" as *;

.modern-nav {
  background: var(--color-surface);
  border-bottom: 1px solid $gray-200;
  position: sticky;
  top: 0;
  z-index: 40;
}
.nav-container {
  max-width: 1440px;
  padding: 1rem 1.5rem;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 1.25rem;
}
.nav-theme-toggle { flex-shrink: 0; display: flex; align-items: center; }
.nav-back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-width: 44px;
  min-height: 44px;
  padding: 0.5rem 0.75rem;
  border: 1px solid $gray-200;
  border-radius: 10px;
  color: $muted-text;
  font-size: 0.8rem;
  font-weight: 600;
  flex-shrink: 0;
  &:hover { background: $gray-100; color: $dark-text; }
}
.nav-logo {
  font-family: var(--font-display);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  color: $dark-text;
  font-weight: 700;
  font-size: 1.1rem;
  letter-spacing: -0.04em;
  flex-shrink: 0;
  padding: 0;
  .logo-img { height: 36px; width: 30px; object-fit: contain; }
}
@media (max-width: 1100px) {
  .nav-logo span { display: none; }
  .nav-container { gap: 0.75rem; }
}
@media (max-width: 767px) {
  .nav-container { display: grid; grid-template-columns: 44px 1fr auto; gap: 0.5rem 0.75rem; padding: calc(0.5rem + env(safe-area-inset-top, 0px)) 1rem 0.75rem; }
  .nav-logo { justify-self: start; span { display: inline; } }
  .nav-back-btn .back-label { display: none; }
  .nav-theme-toggle { justify-self: end; }
  .nav-email-section { grid-column: 1 / -1; grid-row: 2; }
}
</style>
