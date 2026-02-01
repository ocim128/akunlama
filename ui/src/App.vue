<template>
	<div id="app">
		<!-- Page transitions -->
		<router-view v-slot="{ Component, route }">
			<transition :name="route.meta.transition || 'page-fade'" mode="out-in">
				<component :is="Component" class="app-router-view" />
			</transition>
		</router-view>

		<!-- Global Toast Notifications -->
		<ToastNotification />

		<!-- PWA Install Prompt -->
		<InstallPrompt />
	</div>
</template>

<script>
import ToastNotification from '@/components/ToastNotification.vue'
import InstallPrompt from '@/components/InstallPrompt.vue'

export default {
	name: 'App',
	components: {
		ToastNotification,
		InstallPrompt
	},
	data() {
		return {
		}
	}
}
</script>

<style lang="scss">
	@use "./scss/common" as *;
	@use "./scss/color" as *;
	@import url("https://unpkg.com/purecss@1.0.0/build/pure-min.css");

	* {
		box-sizing: border-box;
	}

	#app {
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		color: $dark-text;
		width: 100vw;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--color-background);
		transition: background-color 0.3s ease, color 0.3s ease;
	}

	.app-router-view {
		flex: 1;
		display: flex;
		flex-direction: column;
	}





	// Global scrollbar styling
	::-webkit-scrollbar {
		width: 8px;
		height: 8px;
	}

	::-webkit-scrollbar-track {
		background: $gray-100;
	}

	::-webkit-scrollbar-thumb {
		background: $gray-300;
		border-radius: 4px;

		&:hover {
			background: $gray-400;
		}
	}

	// Global text selection
	::selection {
		background: rgba(79, 70, 229, 0.2);
		color: $dark-text;
	}

	::-moz-selection {
		background: rgba(79, 70, 229, 0.2);
		color: $dark-text;
	}

	// Focus states
	*:focus {
		outline: 2px solid $primary;
		outline-offset: 2px;
	}

	button:focus,
	input:focus,
	textarea:focus,
	select:focus {
		outline: 2px solid $primary;
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
		color: $primary;
		text-decoration: none;
		transition: color 0.2s ease;

		&:hover {
			color: $primary-dark;
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

	// Page transition animations
	.page-fade-enter-active,
	.page-fade-leave-active {
		transition: opacity 0.2s ease, transform 0.2s ease;
	}

	.page-fade-enter-from {
		opacity: 0;
		transform: translateY(10px);
	}

	.page-fade-leave-to {
		opacity: 0;
		transform: translateY(-10px);
	}

	// Slide transitions for mobile navigation
	.slide-left-enter-active,
	.slide-left-leave-active,
	.slide-right-enter-active,
	.slide-right-leave-active {
		transition: transform 0.25s ease, opacity 0.25s ease;
	}

	.slide-left-enter-from {
		transform: translateX(30px);
		opacity: 0;
	}

	.slide-left-leave-to {
		transform: translateX(-30px);
		opacity: 0;
	}

	.slide-right-enter-from {
		transform: translateX(-30px);
		opacity: 0;
	}

	.slide-right-leave-to {
		transform: translateX(30px);
		opacity: 0;
	}

	// Scale transition for modals/overlays
	.scale-enter-active,
	.scale-leave-active {
		transition: transform 0.2s ease, opacity 0.2s ease;
	}

	.scale-enter-from,
	.scale-leave-to {
		transform: scale(0.95);
		opacity: 0;
	}

	// Reduced motion for accessibility
	@media (prefers-reduced-motion: reduce) {
		*,
		*::before,
		*::after {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
		}
	}

	// Animation utility classes
	.animate-pulse {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.animate-bounce {
		animation: bounce 1s infinite;
	}

	@keyframes bounce {
		0%, 100% {
			transform: translateY(-5%);
			animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
		}
		50% {
			transform: translateY(0);
			animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
		}
	}

	.animate-spin {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>
