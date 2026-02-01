<template>
	<nav class="modern-nav">
		<div class="nav-container">
			<!-- Back button with label -->
			<button class="nav-back-btn" @click="backAPage" :aria-label="backButtonLabel">
				<font-awesome-icon icon="arrow-left" />
				<span class="back-label">{{ $route.name === 'List' ? 'Home' : 'Back' }}</span>
			</button>

			<!-- Logo -->
			<div class="nav-logo" @click="goMainPage">
				<img class="logo-img" src="@/assets/logo_no_text.svg" alt="Akunlama Logo"/>
			</div>

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
		box-shadow: $shadow-sm;
		position: sticky;
		top: 0;
		z-index: 40;
		transition: all 0.3s ease;

		.nav-container {
			width: 100%;
			max-width: 100%;
			padding: 0.75rem 1.5rem;
			margin: 0;
			display: flex;
			align-items: center;
			gap: 1.5rem;

			@media (max-width: 1024px) {
				gap: 1rem;
				padding: 0.75rem 1rem;
			}
		}
	}

	.nav-theme-toggle {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		margin-left: auto;

		@media (max-width: 768px) {
			display: none;
		}
	}

	.nav-back-btn {
		background: linear-gradient(135deg, #4F46E5, #6366F1);
		border: none;
		border-radius: $radius-lg;
		padding: 0.6rem 1rem;
		cursor: pointer;
		transition: all 0.2s ease;
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		min-width: 44px;
		min-height: 44px;
		box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);

		.back-label {
			font-weight: 600;
			font-size: 0.85rem;
		}

		&:hover {
			background: linear-gradient(135deg, #3730A3, #4F46E5);
			transform: translateX(-2px);
			box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
		}

		&:active { transform: scale(0.95); }
	}

	.nav-logo {
		cursor: pointer;
		transition: transform 0.2s ease;
		padding: 0.25rem;
		min-width: 44px;
		min-height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;

		&:hover { transform: scale(1.05); }
		&:active { transform: scale(0.95); }

		.logo-img {
			height: 2.5rem;
			width: auto;
		}
	}

	@media (max-width: 768px) {
		.nav-container {
			padding: 0.75rem;
			flex-wrap: nowrap;
			gap: 0.5rem;
		}

		.nav-back-btn {
			padding: 0.5rem 0.75rem;
			.back-label { display: none; }
		}

		.nav-logo {
			min-width: auto;
			padding: 0.25rem;
			.logo-img { height: 2rem; }
		}
	}

	@media (max-width: 480px) {
		.nav-container { padding: 0.5rem; }
		.nav-back-btn { padding: 0.5rem; min-width: 40px; min-height: 40px; }
		.nav-logo .logo-img { height: 1.75rem; }
	}
</style>
