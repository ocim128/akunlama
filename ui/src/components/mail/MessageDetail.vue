<template>
	<div class="message-details">

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
				requestController: null
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
		},
		beforeUnmount () {
			this.requestController?.abort()
			this.$eventHub.off('refresh', this.refreshMessage)
		},
		watch: {
			'$route.params.key': 'getMessage'
		},
		methods: {
			getMessage () {
				this.requestController?.abort()
				const controller = new AbortController()
				this.requestController = controller
				this.loading = true
				let region = this.$route.params.region
				let key = this.$route.params.key
				
				this.iframeLoading = true
				this.src = `${config.apiUrl}/getHtml?region=${region}&key=${key}`
				
				// Fetch metadata in parallel
				return axios.get(`${config.apiUrl}/getKey?region=${region}&key=${key}`, {
					timeout: config.requestTimeout,
					signal: controller.signal
				})
					.then(res => {
						if (controller.signal.aborted) return
						this.emailContent = res.data
						this.loading = false
					}).catch((e) => {
						if (controller.signal.aborted) return
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
					}).finally(() => {
						if (!controller.signal.aborted) {
							this.requestController = null
							this.refreshing = false
						}
					})
			},

			refreshMessage() {
				this.refreshing = true
				return this.getMessage()
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
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
}
.message-container {
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid $gray-200;
  border-radius: 16px;
  overflow: hidden;
}
@media (max-width: 767px) {
  .message-details { padding: 0; }
  .message-container { border: none; border-radius: 0; }
}
</style>
