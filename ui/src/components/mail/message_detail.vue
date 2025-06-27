<template>
	<div class="message-details">
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
						<div class="sender-avatar">
							<i class="fas fa-user-circle"></i>
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

				<!-- Action buttons -->
				<div class="message-actions">
					<button class="action-btn" @click="goBack" title="Back to inbox">
						<i class="fas fa-arrow-left"></i>
						<span>Back</span>
					</button>
					<button class="action-btn" @click="refreshMessage" :disabled="refreshing" title="Refresh message">
						<i class="fas fa-sync-alt" :class="{'fa-spin': refreshing}"></i>
						<span>Refresh</span>
					</button>
				</div>
			</div>

			<!-- Message content -->
			<div class="message-body">
				<iframe 
					id="message-content" 
					:src="src" 
					@load="onIframeLoad"
					scrolling="yes"
					sandbox="allow-same-origin allow-scripts"
				></iframe>
			</div>
		</div>
	</div>
</template>

<script>
	import 'normalize.css'
	import config from '@/../config/apiconfig.js'
	import axios from 'axios'
	import moment from 'moment'

	export default {
		name: 'MessageDetail',
		data: () => {
			return {
				emailContent: {},
				src: '',
				loading: true,
				refreshing: false
			}
		},
		mounted () {
			if (this.$route.params.key === undefined) {
				this.$router.push({
					name: 'Kitten Land'
				})
			}

			this.getMessage()
			this.$eventHub.$on('refresh', this.refreshMessage)
		},
		beforeDestroy () {
			this.$eventHub.$off('refresh', this.refreshMessage)
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

			extractName(email) {
				if (!email) return 'Unknown'
				let parts = email.split('@')
				return parts[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
			},

			formatDate(dateString) {
				if (!dateString) return 'Unknown time'
				let date = moment(dateString)
				if (!date.isValid()) return 'Unknown time'
				
				let now = moment()
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
			}
		}
	}
</script>

<style lang="scss" rel="stylesheet/scss">
	@import '@/scss/_color.scss';

	.message-details {
		height: 100%;
		display: flex;
		flex-direction: column;
		background: $gray-50;
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
		background: white;
		border-bottom: 1px solid $gray-200;
		box-shadow: $shadow-sm;
		position: relative;
		z-index: 1;
	}

	.message-subject {
		padding: 1.5rem 2rem 1rem;
		border-bottom: 1px solid $gray-100;

		h1 {
			margin: 0;
			font-size: 1.5rem;
			font-weight: 600;
			color: $dark-text;
			line-height: 1.3;
		}
	}

	.message-meta {
		padding: 1rem 2rem;
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
		background: $primary;
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;

		i {
			font-size: 1.75rem;
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
		padding: 0 2rem 1rem;
		display: flex;
		gap: 0.5rem;
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

		&:hover:not(:disabled) {
			background: $gray-200;
			color: $gray-800;
		}

		&:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}

		.fa-spin {
			animation-duration: 1s;
		}
	}

	.message-body {
		flex: 1;
		display: flex;
		background: white;
		margin: 0 1rem 1rem;
		border-radius: $radius-lg;
		box-shadow: $shadow;
		overflow: hidden;
	}

	#message-content {
		width: 100%;
		height: 100%;
		border: none;
		background: white;
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
