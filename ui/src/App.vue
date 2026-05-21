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
	}
}
</script>

<style lang="scss">
	@use "./scss/index" as *;
</style>
