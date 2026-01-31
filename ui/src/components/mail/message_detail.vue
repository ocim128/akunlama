<template>
	<div class="message-details" :class="{ 'has-mobile-nav': isMobile }">
		<!-- Mobile floating back button -->
		<button v-if="isMobile" class="floating-back-btn" @click="goBack">
			<i class="fas fa-arrow-left"></i>
			<span>Back</span>
		</button>

		<!-- Loading state -->
		<div v-if="loading" class="loading-container">
			<div class="loading-spinner"></div>
			<p>Loading message...</p>
		</div>

		<!-- Message content -->
		<div v-else class="message-container">
			<!-- Message header -->
			<div class="message-header">
				<div class="message-subject">
					<h1>{{emailContent.subject || '(No Subject)'}}</h1>
				</div>
				
				<div class="message-meta">
					<div class="sender-info">
						<div class="sender-avatar" :style="{ backgroundColor: getAvatarColor(emailContent.emailAddress) }">
							<span class="avatar-initials">{{ getInitials(emailContent.emailAddress, emailContent.name) }}</span>
						</div>
						<div class="sender-details">
							<div class="sender-name">
								<strong>{{emailContent.name || extractName(emailContent.emailAddress)}}</strong>
								<span class="sender-email">&lt;{{emailContent.emailAddress}}&gt;</span>
							</div>
							<div class="recipients">
								<span class="label">to:</span>
								<span class="recipient-list">{{emailContent.recipients}}</span>
							</div>
						</div>
					</div>
					<div class="message-date">{{formatDate(emailContent.Date)}}</div>
				</div>

				<!-- Enhanced Action toolbar -->
				<div class="message-actions">
					<div class="actions-left">
						<button class="action-btn" @click="goBack" title="Back to inbox">
							<i class="fas fa-arrow-left"></i>
							<span>Back</span>
						</button>
						<button class="action-btn" @click="refreshMessage" :disabled="refreshing" title="Refresh message">
							<i class="fas fa-sync-alt" :class="{'fa-spin': refreshing}"></i>
							<span>Refresh</span>
						</button>
					</div>
					<div class="actions-right">
						<button 
							class="action-btn action-btn--icon" 
							@click="copyEmailContent" 
							title="Copy email content"
							:class="{ 'copied': showCopiedFeedback }"
						>
							<i class="fas" :class="showCopiedFeedback ? 'fa-check' : 'fa-copy'"></i>
							<span class="action-tooltip">{{ showCopiedFeedback ? 'Copied!' : 'Copy' }}</span>
						</button>
						<button class="action-btn action-btn--icon" @click="printEmail" title="Print email">
							<i class="fas fa-print"></i>
							<span class="action-tooltip">Print</span>
						</button>
						<button class="action-btn action-btn--icon" @click="downloadEmail" title="Download as HTML">
							<i class="fas fa-download"></i>
							<span class="action-tooltip">Download</span>
						</button>
					</div>
				</div>
			</div>

			<!-- Message content with enhanced styling -->
			<div class="message-body">
				<div class="iframe-container">
					<!-- 
						Security Note: Content is sanitized on the server with DOMPurify.
						The sandbox attribute provides defense-in-depth:
						- allow-same-origin: Required for proper styling
						- allow-popups-to-escape-sandbox: Allow links to open in new tabs
						Scripts are blocked as content is sanitized server-side.
					-->
					<iframe 
						id="message-content" 
						:src="src" 
						@load="onIframeLoad"
						scrolling="yes"
						sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
						referrerpolicy="no-referrer"
						title="Email content"
					></iframe>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
	import 'normalize.css'
	import config from '@/../config/apiconfig.js'
	import axios from 'axios'
	import dayjs from 'dayjs'

	export default {
		name: 'MessageDetail',
		data: () => {
			return {
				emailContent: {},
				src: '',
				loading: true,
				refreshing: false,
				showCopiedFeedback: false,
				windowWidth: window.innerWidth
			}
		},
		computed: {
			isMobile() {
				return this.windowWidth < 768
			}
		},
		mounted () {
			if (this.$route.params.key === undefined) {
				this.$router.push({
					name: 'Kitten Land'
				})
			}

			this.getMessage()
			this.$eventHub.on('refresh', this.refreshMessage)
			window.addEventListener('resize', this.handleResize)
		},
		beforeUnmount () {
			this.$eventHub.off('refresh', this.refreshMessage)
			window.removeEventListener('resize', this.handleResize)
		},
		methods: {
			getMessage () {
				this.loading = true
				let region = this.$route.params.region
				let key = this.$route.params.key
				
				this.src = `${config.apiUrl}/getHtml?region=${region}&key=${key}`
				
				axios.get(`${config.apiUrl}/getKey?region=${region}&key=${key}`)
					.then(res => {
						this.emailContent = res.data
						this.loading = false
					}).catch((e) => {
						console.error('Failed to load message:', e)
						this.emailContent = {
							name: 'Error',
							emailAddress: 'system@akunlama.com',
							recipients: this.$route.params.email || 'Unknown',
							subject: 'Message could not be loaded',
							Date: new Date().toISOString()
						}
						
						// Show error message in iframe
						this.src = 'data:text/html;charset=utf-8,' + encodeURI(`
							<html>
								<head>
									<style>
										body { 
											font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
											padding: 2rem; 
											text-align: center; 
											color: #6B7280;
											background: #F9FAFB;
										}
										.error { 
											color: #EF4444; 
											font-size: 1.2rem; 
											margin-bottom: 1rem; 
										}
									</style>
								</head>
								<body>
									<div class="error">⚠️ Message Not Found</div>
									<p>This message could not be loaded. It may have been deleted or expired.</p>
								</body>
							</html>
						`)
						this.loading = false
					})
			},

			refreshMessage() {
				this.refreshing = true
				setTimeout(() => {
					this.getMessage()
					this.refreshing = false
				}, 500)
			},

			onIframeLoad() {
				// Optional: Add any iframe load handling here
			},

			goBack() {
				if (this.$route.params.email) {
					this.$router.push({
						name: 'List',
						params: {
							email: this.$route.params.email
						}
					})
				} else {
					this.$router.go(-1)
				}
			},

			handleResize() {
				this.windowWidth = window.innerWidth
			},

			extractName(email) {
				if (!email) return 'Unknown'
				let parts = email.split('@')
				return parts[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
			},

			formatDate(dateString) {
				if (!dateString) return 'Unknown time'
				let date = dayjs(dateString)
				if (!date.isValid()) return 'Unknown time'
				
				let now = dayjs()
				let diff = now.diff(date, 'days')
				
				if (diff === 0) {
					return `Today, ${date.format('h:mm A')}`
				} else if (diff === 1) {
					return `Yesterday, ${date.format('h:mm A')}`
				} else if (diff < 7) {
					return date.format('dddd, h:mm A')
				} else {
					return date.format('MMM DD, YYYY [at] h:mm A')
				}
			},

			// Avatar color based on email hash
			getAvatarColor(email) {
				const colors = [
					'#4F46E5', '#7C3AED', '#EC4899', '#EF4444', '#F97316',
					'#F59E0B', '#10B981', '#14B8A6', '#06B6D4', '#3B82F6',
					'#8B5CF6', '#6366F1', '#D946EF', '#0EA5E9', '#22C55E'
				]
				
				if (!email) return colors[0]
				
				let hash = 0
				for (let i = 0; i < email.length; i++) {
					hash = email.charCodeAt(i) + ((hash << 5) - hash)
				}
				
				return colors[Math.abs(hash) % colors.length]
			},

			// Get initials from name or email
			getInitials(email, name) {
				if (name && name.trim()) {
					const parts = name.trim().split(/\s+/)
					if (parts.length >= 2) {
						return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
					}
					return name.substring(0, 2).toUpperCase()
				}
				
				if (!email) return '?'
				const username = email.split('@')[0]
				return username.substring(0, 2).toUpperCase()
			},

			// Copy email content to clipboard
			async copyEmailContent() {
				try {
					const iframe = document.getElementById('message-content')
					let textContent = ''
					
					if (iframe && iframe.contentDocument) {
						textContent = iframe.contentDocument.body.innerText || iframe.contentDocument.body.textContent
					}
					
					// Also include subject and sender info
					const fullContent = `Subject: ${this.emailContent.subject}\nFrom: ${this.emailContent.emailAddress}\nTo: ${this.emailContent.recipients}\nDate: ${this.emailContent.Date}\n\n${textContent}`
					
					await navigator.clipboard.writeText(fullContent)
					
					this.showCopiedFeedback = true
					setTimeout(() => {
						this.showCopiedFeedback = false
					}, 2000)
				} catch (err) {
					console.error('Failed to copy:', err)
				}
			},

			// Print email
			printEmail() {
				const iframe = document.getElementById('message-content')
				if (iframe && iframe.contentWindow) {
					iframe.contentWindow.print()
				}
			},

			// Download email as HTML
			downloadEmail() {
				const iframe = document.getElementById('message-content')
				if (iframe && iframe.contentDocument) {
					const htmlContent = iframe.contentDocument.documentElement.outerHTML
					const blob = new Blob([htmlContent], { type: 'text/html' })
					const url = URL.createObjectURL(blob)
					
					const a = document.createElement('a')
					a.href = url
					a.download = `${this.emailContent.subject || 'email'}.html`
					document.body.appendChild(a)
					a.click()
					document.body.removeChild(a)
					URL.revokeObjectURL(url)
				}
			}
		}
	}
</script>

<style lang="scss" rel="stylesheet/scss">
	@use '@/scss/color' as *;

	.message-details {
		height: 100%;
		width: 100%;
		flex: 1;
		display: flex;
		flex-direction: column;
		background: var(--color-background);
		transition: background 0.3s ease;
		position: relative;

		// Add padding for mobile nav
		&.has-mobile-nav {
			padding-bottom: calc(70px + env(safe-area-inset-bottom, 0px));
		}
	}

	// Floating back button for mobile
	.floating-back-btn {
		position: fixed;
		top: 1rem;
		left: 1rem;
		z-index: 100;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 1rem;
		background: linear-gradient(135deg, #4F46E5, #6366F1);
		color: white;
		border: none;
		border-radius: 24px;
		font-weight: 600;
		font-size: 0.85rem;
		cursor: pointer;
		box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4);
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
		transition: all 0.2s ease;

		i {
			font-size: 0.9rem;
		}

		&:active {
			transform: scale(0.95);
			box-shadow: 0 2px 10px rgba(79, 70, 229, 0.3);
		}
	}

	.loading-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem;
		text-align: center;

		.loading-spinner {
			width: 40px;
			height: 40px;
			border: 3px solid $gray-200;
			border-top: 3px solid $primary;
			border-radius: 50%;
			animation: spin 1s linear infinite;
			margin-bottom: 1rem;
		}

		p {
			color: $muted-text;
			margin: 0;
		}
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.message-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.message-header {
		background: var(--color-surface);
		border-bottom: 1px solid $gray-200;
		box-shadow: $shadow-sm;
		position: relative;
		z-index: 1;
		transition: background 0.3s ease;
		flex-shrink: 0;
	}

	.message-subject {
		padding: 1rem 1.25rem 0.75rem;
		border-bottom: 1px solid $gray-100;

		h1 {
			margin: 0;
			font-size: 1.25rem;
			font-weight: 600;
			color: $dark-text;
			line-height: 1.3;
			
			@media (min-width: 1280px) {
				font-size: 1.35rem;
			}
		}
	}

	.message-meta {
		padding: 0.75rem 1.25rem;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.sender-info {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		flex: 1;
	}

	.sender-avatar {
		width: 48px;
		height: 48px;
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		font-weight: 600;
		font-size: 1rem;
		letter-spacing: 0.5px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

		.avatar-initials {
			user-select: none;
		}
	}

	.sender-details {
		flex: 1;
		min-width: 0;
	}

	.sender-name {
		color: $dark-text;
		margin-bottom: 0.25rem;
		
		.sender-email {
			color: $muted-text;
			font-weight: normal;
			margin-left: 0.5rem;
		}
	}

	.recipients {
		color: $muted-text;
		font-size: 0.9rem;

		.label {
			margin-right: 0.5rem;
		}

		.recipient-list {
			color: $dark-text;
		}
	}

	.message-date {
		color: $muted-text;
		font-size: 0.9rem;
		text-align: right;
		flex-shrink: 0;
		margin-left: 1rem;
	}

	.message-actions {
		padding: 0 1.25rem 0.75rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		
		.actions-left,
		.actions-right {
			display: flex;
			gap: 0.5rem;
		}
	}

	.action-btn {
		background: $gray-100;
		border: 1px solid $gray-300;
		color: $gray-700;
		padding: 0.5rem 1rem;
		border-radius: $radius;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		position: relative;
		// Improved touch targets
		min-height: 44px;
		min-width: 44px;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;

		&:hover:not(:disabled) {
			background: $gray-200;
			color: $gray-800;
		}

		&:active:not(:disabled) {
			background: $gray-300;
			transform: scale(0.97);
		}

		&:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}

		.fa-spin {
			animation-duration: 1s;
		}
		
		// Icon-only button variant
		&--icon {
			padding: 0.5rem 0.75rem;
			
			.action-tooltip {
				display: none;
				position: absolute;
				bottom: -2rem;
				left: 50%;
				transform: translateX(-50%);
				background: $gray-800;
				color: white;
				padding: 0.25rem 0.5rem;
				border-radius: $radius;
				font-size: 0.75rem;
				white-space: nowrap;
				z-index: 10;
			}
			
			&:hover .action-tooltip {
				display: block;
			}
		}
		
		// Copied state
		&.copied {
			background: $success;
			border-color: $success;
			color: white;
		}
	}

	.message-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		margin: 0 0.5rem 0.5rem;
		min-height: 0;
		overflow: hidden;
		
		@media (min-width: 1024px) {
			margin: 0 0.75rem 0.75rem;
		}
	}

	.iframe-container {
		flex: 1;
		background: #ffffff;
		border-radius: $radius-lg;
		box-shadow: 
			0 1px 3px rgba(0, 0, 0, 0.08),
			0 1px 2px rgba(0, 0, 0, 0.04);
		overflow: hidden;
		border: 1px solid $gray-200;
		transition: all 0.3s ease;
		display: flex;
		flex-direction: column;
		min-height: 300px;

		[data-theme='dark'] & {
			background: #f8fafc;
			border-color: $gray-700;
		}
	}

	#message-content {
		flex: 1;
		width: 100%;
		height: 100%;
		border: none;
		background: #ffffff;
		display: block;
		border-radius: $radius-lg;
	}

	// Mobile optimizations
	@media (max-width: 768px) {
		.message-subject {
			padding: 1rem;

			h1 {
				font-size: 1.25rem;
			}
		}

		.message-meta {
			padding: 1rem;
			flex-direction: column;
			gap: 1rem;
		}

		.sender-info {
			gap: 0.75rem;
		}

		.sender-avatar {
			width: 40px;
			height: 40px;

			i {
				font-size: 1.5rem;
			}
		}

		.sender-name {
			font-size: 0.9rem;
		}

		.recipients, .message-date {
			font-size: 0.8rem;
		}

		.message-date {
			text-align: left;
			margin-left: 0;
		}

		.message-actions {
			padding: 0 1rem 1rem;
			
			// Hide back/refresh buttons since we have floating back and bottom nav
			.actions-left {
				display: none;
			}

			.action-btn {
				flex: 1;
				justify-content: center;
			}
		}

		.message-body {
			margin: 0 0.5rem 0.5rem;
		}
	}

	@media (max-width: 480px) {
		.message-subject {
			padding: 0.75rem;

			h1 {
				font-size: 1.125rem;
			}
		}

		.message-meta {
			padding: 0.75rem;
		}

		.message-actions {
			padding: 0 0.75rem 0.75rem;
		}

		.action-btn span {
			display: none;
		}
	}
</style>
