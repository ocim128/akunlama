<template>
	<nav class="modern-nav">
		<div class="nav-container">
			<!-- Back button -->
			<button class="nav-back-btn" @click="backAPage" :aria-label="backButtonLabel">
				<i class="fas fa-arrow-left"></i>
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
							<i class="fas fa-paper-plane"></i>
							<span class="btn-text">Go</span>
						</button>
						<button type="button" class="refresh-btn" @click="emitRefresh" :disabled="isRefreshing">
							<i class="fas fa-sync-alt" :class="{'fa-spin': isRefreshing}"></i>
							<span class="btn-text">Refresh</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	</nav>
</template>

<script>
	import config from '@/../config/apiconfig.js'
	import 'normalize.css'
	import $ from 'jquery'
	import ClipboardJS from 'clipboard'

	export default {
		name: 'NavBar',
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
		beforeDestroy () {
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
				const domainEl = $('#nav-domain')
				domainEl.addClass('copied')
				
				// Create tooltip
				const tooltip = $('<div class="copy-tooltip">Copied!</div>')
				domainEl.append(tooltip)
				
				setTimeout(() => {
					tooltip.fadeOut(() => tooltip.remove())
					domainEl.removeClass('copied')
				}, 2000)
			},

			setupRefreshListener() {
				this.$eventHub.$on('refreshStart', () => {
					this.isRefreshing = true
				})
				this.$eventHub.$on('refreshEnd', () => {
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
				this.$eventHub.$emit('refresh', '')
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
				this.$eventHub.$emit('refreshInbox', {email: this.email})
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
	@import "@/scss/_color.scss";

	.modern-nav {
		background: white;
		border-bottom: 1px solid $gray-200;
		box-shadow: $shadow-sm;
		position: sticky;
		top: 0;
		z-index: 40;

		.nav-container {
			max-width: 1200px;
			margin: 0 auto;
			padding: 1rem;
			display: flex;
			align-items: center;
			gap: 1rem;
		}
	}

	.nav-back-btn {
		background: $gray-100;
		border: 1px solid $gray-200;
		border-radius: $radius-lg;
		padding: 0.75rem;
		cursor: pointer;
		transition: all 0.2s ease;
		color: $gray-600;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 44px;
		height: 44px;

		&:hover {
			background: $gray-200;
			color: $gray-800;
			transform: translateX(-2px);
		}

		i {
			font-size: 1rem;
		}
	}

	.nav-logo {
		cursor: pointer;
		transition: transform 0.2s ease;

		&:hover {
			transform: scale(1.05);
		}

		.logo-img {
			height: 2.5rem;
			width: auto;
		}
	}

	.nav-email-section {
		flex: 1;
		max-width: 600px;
		margin: 0 auto;
	}

	.email-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;

		@media (min-width: 768px) {
			flex-direction: row;
			align-items: center;
		}
	}

	.email-input-group {
		display: flex;
		background: white;
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

			&:hover {
				background: $gray-100;
				color: $primary;
			}

			&.copied {
				background: $success;
				color: white;
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

			.btn-text {
				@media (max-width: 480px) {
					display: none;
				}
			}

			&:disabled {
				opacity: 0.6;
				cursor: not-allowed;
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
			background: $gray-100;
			color: $gray-700;
			border: 1px solid $gray-300;

			&:hover:not(:disabled) {
				background: $gray-200;
				color: $gray-800;
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
			flex-wrap: wrap;
		}

		.nav-email-section {
			order: 3;
			width: 100%;
			margin-top: 0.5rem;
		}

		.email-form {
			gap: 0.5rem;
		}

		.action-buttons {
			button {
				padding: 0.75rem;
				min-width: 44px;
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
			height: 40px;
		}

		.nav-logo .logo-img {
			height: 2rem;
		}
	}
</style>
