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

			<!-- Email form -->
			<div class="nav-email-section">
				<form @submit.prevent="changeInbox" class="email-form">
					<div class="email-input-group">
						<input 
							class="email-input" 
							name="email" 
							aria-label="email" 
							type="text" 
							v-model="email" 
							id="nav-email-input"
							placeholder="Enter email name"
						/>
						<div 
							class="domain-suffix" 
							id="nav-domain" 
							data-clipboard-target="#nav-email-input"
							:title="'Click to copy: ' + fullEmail"
						>
							@{{domain}}
						</div>
					</div>
					<div class="action-buttons">
						<button type="submit" class="go-btn">
							<font-awesome-icon icon="paper-plane" />
							<span class="btn-text">Go</span>
						</button>
						<button type="button" class="refresh-btn" @click="emitRefresh" :disabled="isRefreshing">
							<font-awesome-icon icon="sync-alt" :spin="isRefreshing" />
							<span class="btn-text">Refresh</span>
						</button>
					</div>
				</form>
			</div>

			<!-- Theme Toggle -->
			<div class="nav-theme-toggle">
				<ThemeToggle />
			</div>
		</div>
	</nav>
</template>

<script>
	import config from '@/../config/apiconfig.js'
	import 'normalize.css'
	import ClipboardJS from 'clipboard'
	import ThemeToggle from './ThemeToggle.vue'

	export default {
		name: 'NavBar',
		components: {
			ThemeToggle
		},
		data: () => {
			return {
				email: '',
				isRefreshing: false
			}
		},
		computed: {
			domain () {
				return config.domain
			},
			fullEmail() {
				if (this.email.includes('@' + config.domain)) {
					return this.email
				}
				return this.email + '@' + config.domain
			},
			backButtonLabel() {
				return this.$route.name === 'List' ? 'Back to home' : 'Back to inbox'
			}
		},
		mounted () {
			this.email = this.$route.params.email || ''
			if (this.email === '') {
				this.goMainPage()
			}

			this.initClipboard()
			this.setupRefreshListener()
		},
		beforeUnmount () {
			if (this.$clipboard) {
				this.$clipboard.destroy()
			}
		},
		methods: {
			initClipboard() {
				this.$clipboard = new ClipboardJS('#nav-domain', {
					text: () => this.fullEmail
				})

				this.$clipboard.on('success', () => {
					this.showCopyFeedback()
				})
			},

			showCopyFeedback() {
				const domainEl = document.getElementById('nav-domain')
				if (!domainEl) return
				
				domainEl.classList.add('copied')
				
				// Create tooltip
				const tooltip = document.createElement('div')
				tooltip.className = 'copy-tooltip'
				tooltip.textContent = 'Copied!'
				domainEl.appendChild(tooltip)
				
				setTimeout(() => {
					// Fade out effect
					tooltip.style.transition = 'opacity 0.3s ease'
					tooltip.style.opacity = '0'
					setTimeout(() => {
						tooltip.remove()
					}, 300)
					domainEl.classList.remove('copied')
				}, 2000)
			},

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
			changeInbox () {
				if (!this.email.trim()) return
				
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

<style lang="scss" rel="stylesheet/scss">
	@use "@/scss/color" as *;

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
			display: none; // Hidden on mobile as it's in mobile nav or handled differently
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
		// Better touch handling
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;

		.back-label {
			font-weight: 600;
			font-size: 0.85rem;
		}

		&:hover {
			background: linear-gradient(135deg, #3730A3, #4F46E5);
			transform: translateX(-2px);
			box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
		}

		&:active {
			transform: scale(0.95);
			box-shadow: 0 2px 6px rgba(79, 70, 229, 0.3);
		}

		i {
			font-size: 0.9rem;
		}
	}

	.nav-logo {
		cursor: pointer;
		transition: transform 0.2s ease;
		// Improved touch area
		padding: 0.25rem;
		min-width: 44px;
		min-height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;

		&:hover {
			transform: scale(1.05);
		}

		&:active {
			transform: scale(0.95);
		}

		.logo-img {
			height: 2.5rem;
			width: auto;
		}
	}

	.nav-email-section {
		flex: 1;
		margin: 0;
	}

	.email-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;

		@media (min-width: 768px) {
			flex-direction: row;
			align-items: center;
		}
	}

	.email-input-group {
		display: flex;
		background: var(--color-surface);
		border: 1px solid $gray-300;
		border-radius: $radius-lg;
		overflow: hidden;
		transition: all 0.2s ease;
		flex: 1;

		&:focus-within {
			border-color: $primary;
			box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
		}

		.email-input {
			flex: 1;
			border: none;
			padding: 0.75rem 1rem;
			font-size: 0.9rem;
			color: $dark-text;
			background: transparent;
			outline: none;

			&::placeholder {
				color: $gray-400;
			}
		}

		.domain-suffix {
			display: flex;
			align-items: center;
			padding: 0.75rem 1rem;
			background: $gray-50;
			color: $muted-text;
			font-weight: 500;
			border-left: 1px solid $gray-200;
			cursor: pointer;
			user-select: all;
			position: relative;
			transition: all 0.2s ease;
			font-size: 0.9rem;
			// Improved touch target
			min-height: 44px;
			touch-action: manipulation;
			-webkit-tap-highlight-color: transparent;

			&:hover {
				background: $gray-100;
				color: $primary;
			}

			&:active {
				background: $gray-200;
			}

			&.copied {
				background: $success;
				color: $bright-text;
			}
		}
	}

	.copy-tooltip {
		position: absolute;
		top: -2.5rem;
		left: 50%;
		transform: translateX(-50%);
		background: $gray-800;
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: $radius;
		font-size: 0.75rem;
		white-space: nowrap;
		z-index: 50;

		&::after {
			content: '';
			position: absolute;
			top: 100%;
			left: 50%;
			transform: translateX(-50%);
			border: 4px solid transparent;
			border-top-color: $gray-800;
		}
	}

	.action-buttons {
		display: flex;
		gap: 0.5rem;

		button {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			padding: 0.75rem 1rem;
			border-radius: $radius-lg;
			font-weight: 500;
			transition: all 0.2s ease;
			cursor: pointer;
			border: none;
			font-size: 0.9rem;
			// Improved touch handling
			min-height: 44px;
			touch-action: manipulation;
			-webkit-tap-highlight-color: transparent;

			.btn-text {
				@media (max-width: 480px) {
					display: none;
				}
			}

			&:disabled {
				opacity: 0.6;
				cursor: not-allowed;
			}

			&:active:not(:disabled) {
				transform: scale(0.95);
			}
		}

		.go-btn {
			background: $primary;
			color: white;

			&:hover:not(:disabled) {
				background: $primary-dark;
				transform: translateY(-1px);
			}
		}
		.refresh-btn {
			background: linear-gradient(135deg, #10B981, #14B8A6);
			color: white;
			border: none;
			box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);

			&:hover:not(:disabled) {
				background: linear-gradient(135deg, #059669, #0D9488);
				box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
			}

			.fa-spin {
				animation-duration: 1s;
			}
		}
	}

	// Mobile optimizations
	@media (max-width: 768px) {
		.nav-container {
			padding: 0.75rem;
			flex-wrap: nowrap; // Keep on one line
			gap: 0.5rem;
		}

		.nav-email-section {
			flex: 1;
			order: 2;
		}

		.email-form {
			gap: 0.5rem;
		}

		// Hide Go/Refresh buttons on mobile since we have bottom nav
		.action-buttons {
			display: none;
		}

		.email-input-group {
			border-radius: 8px;
		}

		.email-input {
			font-size: 0.9rem;
			padding: 0.6rem 0.75rem;
		}

		.domain-suffix {
			font-size: 0.8rem;
			padding: 0.6rem 0.5rem;
		}

		.nav-back-btn {
			padding: 0.5rem 0.75rem;
			
			.back-label {
				display: none; // Hide label on mobile
			}
		}

		.nav-logo {
			min-width: auto;
			padding: 0.25rem;

			.logo-img {
				height: 2rem;
			}
		}
	}

	@media (max-width: 480px) {
		.nav-container {
			padding: 0.5rem;
		}

		.nav-back-btn {
			padding: 0.5rem;
			min-width: 40px;
			min-height: 40px;
		}

		.email-input {
			font-size: 0.85rem;
			padding: 0.5rem;
		}

		.domain-suffix {
			font-size: 0.75rem;
			padding: 0.5rem 0.4rem;
		}

		.nav-logo .logo-img {
			height: 1.75rem;
		}
	}
</style>
