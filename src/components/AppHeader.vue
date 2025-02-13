<template>
	<ion-header :translucent="true">
		<slot name="leading" />

		<Transition name="roll">
			<ion-toolbar v-if="showToolbar" id="app-toolbar">
				<slot name="toolbar" />

				<ion-buttons slot="end">
					<ion-button @click="openSettings">
						<ion-icon size="large" slot="icon-only" :icon="personCircle" />
					</ion-button>
				</ion-buttons>
			</ion-toolbar>
		</Transition>

		<slot name="trailing" />
	</ion-header>
</template>

<script setup lang="ts">
import { createSettingsModal } from "@/components/AppSettingsModal.vue";
import { IonButton, IonButtons, IonHeader, IonIcon, IonToolbar } from "@ionic/vue";
import { personCircle } from "ionicons/icons";

const { showToolbar = true } = defineProps<{ showToolbar?: boolean }>();

async function openSettings(): Promise<void> {
	const modal = await createSettingsModal();
	await modal.present();
	await modal.onDidDismiss();
}
</script>

<style scoped>
.roll-enter-active,
.roll-leave-active {
	height: 54px;
	@supports (interpolate-size: allow-keywords) {
		height: auto;
	}

	transition:
		opacity,
		height,
		0.4s ease-out;
}

.roll-enter-from,
.roll-leave-to {
	opacity: 0;
	height: 0;
}
</style>
