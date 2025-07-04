<template>
	<div id="app">
		<!-- Github corners -->
		<a href="https://github.com/uilicious/inboxkitten" class="github-corner" aria-label="View source on Github" target="_blank">
			<svg width="80" height="80" viewBox="0 0 250 250" aria-hidden="true">
				<path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z"></path>
				<path d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2" fill="currentColor" class="octo-arm"></path>
				<path d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z" fill="currentColor" class="octo-body"></path>
			</svg>
		</a>
		<!-- Product hunt banner -->
		<!-- <div>
			<a href="https://www.producthunt.com/posts/inboxkitten" target="_blank" class="product-hunt">
				<img src="@/assets/product-hunt-240.png" class="ph-icon"/>
				<p>Support our product hunt launch here</p>
			</a>
		</div> -->
		<!-- <div style="position:fixed; top:3vh; right:2vw; z-index:10;" v-if="isShare"> -->
			<!--<a href="https://twitter.com/intent/tweet?ref_src=twsrc%5Etfw" class="twitter-hashtag-button" data-size="large" :data-text="tweetMsg" :data-url="tweetDataUrl" data-show-count="false">Tweet</a>-->
			<!--<a class="github-button" :href="githubLink" data-size="large" :aria-label="githubAriaLabel">Fork</a>-->
		<!-- </div> -->
		<router-view class="app-router-view"/>
	</div>
</template>

<script>
import shareConfig from '@/../config/shareConfig.js'

export default {
	name: 'App',
	data: () => {
		return {
			githubLink: shareConfig.githubForkLink,
			githubAriaLabel: shareConfig.githubAriaLabel,
			tweetDataUrl: shareConfig.tweetDataUrl,
			tweetMsg: shareConfig.tweetMessage,
			isShare: shareConfig.enabled
		}
	}
}
</script>

<style lang="scss" rel="stylesheet/scss">
	@import "scss/_producthunt.scss";
	@import "scss/_common.scss";

	* {
		box-sizing: border-box;
	}

	#app {
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		color: #1F2937;
		width: 100vw;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: #F9FAFB;
	}

	.app-router-view {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	// Github corner styling with modern hover effects
	.github-corner {
		position: fixed;
		top: 0;
		right: 0;
		border: 0;
		z-index: 99;
		transition: all 0.3s ease;

		svg {
			fill: #1F2937;
			color: #fff;
			position: absolute;
			border: 0;
			right: 0;
			transition: fill 0.3s ease;
		}

		&:hover {
			.octo-arm {
				animation: octocat-wave 560ms ease-in-out;
			}
			
			svg {
				fill: #4F46E5;
			}
		}
	}

	@keyframes octocat-wave {
		0%, 100% { transform: rotate(0); }
		20%, 60% { transform: rotate(-25deg); }
		40%, 80% { transform: rotate(10deg); }
	}

	// Hide GitHub corner on small screens
	@media only screen and (max-width: 800px) {
		.github-corner {
			display: none;
		}
	}

	// Global scrollbar styling
	::-webkit-scrollbar {
		width: 8px;
		height: 8px;
	}

	::-webkit-scrollbar-track {
		background: #F3F4F6;
	}

	::-webkit-scrollbar-thumb {
		background: #D1D5DB;
		border-radius: 4px;

		&:hover {
			background: #9CA3AF;
		}
	}

	// Global text selection
	::selection {
		background: rgba(79, 70, 229, 0.2);
		color: #1F2937;
	}

	::-moz-selection {
		background: rgba(79, 70, 229, 0.2);
		color: #1F2937;
	}

	// Focus states
	*:focus {
		outline: 2px solid #4F46E5;
		outline-offset: 2px;
	}

	button:focus,
	input:focus,
	textarea:focus,
	select:focus {
		outline: 2px solid #4F46E5;
		outline-offset: 2px;
	}

	// Remove default button styles
	button {
		border: none;
		background: none;
		font-family: inherit;
		cursor: pointer;
	}

	// Improved link styles
	a {
		color: #4F46E5;
		text-decoration: none;
		transition: color 0.2s ease;

		&:hover {
			color: #3730A3;
		}
	}

	// Loading animation
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.fade-in {
		animation: fadeIn 0.6s ease-out;
	}

	// Utility classes
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.text-center { text-align: center; }
	.text-left { text-align: left; }
	.text-right { text-align: right; }

	.flex { display: flex; }
	.flex-col { flex-direction: column; }
	.items-center { align-items: center; }
	.justify-center { justify-content: center; }
	.justify-between { justify-content: space-between; }

	.w-full { width: 100%; }
	.h-full { height: 100%; }

	.p-1 { padding: 0.25rem; }
	.p-2 { padding: 0.5rem; }
	.p-4 { padding: 1rem; }

	.m-1 { margin: 0.25rem; }
	.m-2 { margin: 0.5rem; }
	.m-4 { margin: 1rem; }

	.mb-2 { margin-bottom: 0.5rem; }
	.mb-4 { margin-bottom: 1rem; }

	// Responsive spacing
	@media (max-width: 768px) {
		#app {
			font-size: 14px;
		}
	}
</style>
