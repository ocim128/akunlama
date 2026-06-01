<template>
	<div class="message-details" :class="{ 'has-mobile-nav': isMobile }">
		<!-- Mobile floating back button -->
		<button v-if="isMobile" class="floating-back-btn" @click="goBack">
			<font-awesome-icon icon="arrow-left" />
			<span>Back</span>
		</button>

		<div class="message-container">
			<message-header 
				:loading="loading" 
				:email-content="emailContent" 
			/>

			<template v-if="!loading">
				<message-actions 
					:is-refreshing="refreshing"
					:show-copied-feedback="showCopiedFeedback"
					@back="goBack"
					@refresh="refreshMessage"
					@copy="copyEmailContent"
					@print="printEmail"
					@download="downloadEmail"
				/>

				<iframe-content 
					:src="src" 
					:loading="iframeLoading"
					@load="onIframeLoad"
				/>
			</template>
		</div>
	</div>
</template>

<script>
	import 'normalize.css'
	import config from '@/../config/apiconfig'
	import axios from 'axios'
	import dayjs from 'dayjs'
	import MessageHeader from './MessageHeader.vue'
	import MessageActions from './MessageActions.vue'
	import IframeContent from './IframeContent.vue'

	export default {
		name: 'MessageDetail',
		components: {
			MessageHeader,
			MessageActions,
			IframeContent
		},
		data: () => {
			return {
				emailContent: {},
				src: '',
				loading: true,
				iframeLoading: true,
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
		watch: {
			'$route.params.key': 'getMessage'
		},
		methods: {
			getMessage () {
				this.loading = true
				let region = this.$route.params.region
				let key = this.$route.params.key
				
				this.iframeLoading = true
				this.src = `${config.apiUrl}/getHtml?region=${region}&key=${key}`
				
				// Fetch metadata in parallel
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

			prepareIframeLinks() {
				const iframe = document.getElementById('message-content')
				if (!iframe || !iframe.contentDocument) return

				const doc = iframe.contentDocument
				const head = doc.head || doc.getElementsByTagName('head')[0]

				const bases = doc.querySelectorAll('base')
				if (bases.length > 0) {
					bases.forEach(base => {
						base.setAttribute('target', '_blank')
					})
				} else if (head) {
					const base = doc.createElement('base')
					base.setAttribute('target', '_blank')
					head.prepend(base)
				}

				doc.querySelectorAll('a[href], area[href]').forEach(link => {
					link.setAttribute('target', '_blank')
					link.setAttribute('rel', 'noopener noreferrer')
				})

				if (doc.documentElement.dataset.akunlamaLinksPrepared === 'true') return

				doc.addEventListener('click', event => {
					const target = event.target
					const element = target && target.nodeType === Node.ELEMENT_NODE
						? target
						: target?.parentElement
					const link = element?.closest?.('a[href], area[href]')

					if (!link) return

					let url
					try {
						url = new URL(link.getAttribute('href'), doc.baseURI || window.location.href)
					} catch (_) {
						return
					}

					const currentHref = doc.location?.href || doc.URL || ''
					const currentHash = doc.location?.hash || ''
					if (url.hash && url.href.replace(url.hash, '') === currentHref.replace(currentHash, '')) {
						return
					}

					if (['javascript:', 'vbscript:', 'data:', 'file:'].includes(url.protocol.toLowerCase())) {
						event.preventDefault()
						return
					}

					event.preventDefault()
					const openedWindow = window.open(url.href, '_blank', 'noopener,noreferrer')
					if (openedWindow) {
						openedWindow.opener = null
					}
				}, true)

				doc.documentElement.dataset.akunlamaLinksPrepared = 'true'
			},

			onIframeLoad() {
				this.prepareIframeLinks()
				this.iframeLoading = false
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

			// Copy email content to clipboard
			async copyEmailContent() {
				try {
					const iframe = document.getElementById('message-content')
					let textContent = ''
					
					if (iframe && iframe.contentDocument) {
						textContent = iframe.contentDocument.body.innerText || iframe.contentDocument.body.textContent
					}
					
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

<style lang="scss" scoped>
	@use "../../scss/color" as *;

	.message-details {
		height: 100%;
		width: 100%;
		flex: 1;
		display: flex;
		flex-direction: column;
		background: var(--color-background);
		transition: background 0.3s ease;
		position: relative;

		&.has-mobile-nav {
			padding-bottom: calc(70px + env(safe-area-inset-bottom, 0px));
		}
	}

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

		&:active {
			transform: scale(0.95);
			box-shadow: 0 2px 10px rgba(79, 70, 229, 0.3);
		}
	}

	.message-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
</style>
