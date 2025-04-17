<template>
	<ion-header>
		<ion-toolbar>
			<ion-title>User</ion-title>
			<ion-buttons slot="end">
				<ion-button :strong="true" @click="close">Close</ion-button>
			</ion-buttons>
		</ion-toolbar>
	</ion-header>
	<ion-content>
		<ion-list inset>
			<ion-item v-for="service in services.registeredServices" :key="service.type">
				<ion-label class="platform-status">
					<span class="platform-name">{{ songTypeToDisplayName(service.type) }}</span>
				</ion-label>

				<ion-buttons>
					<template v-if="service.enabled.value && service.authorization">
						<ion-button
							v-if="service.authorization.authorized.value"
							@click="service.authorization.unauthorize()"
						>
							Unauthorize
						</ion-button>
						<ion-button v-else @click="service.authorization.authorize()">Authorize</ion-button>
					</template>

					<ion-toggle
						:checked="service.enabled.value"
						@ion-change="service.enabled.value = !service.enabled.value"
						:disabled="!service.available"
					/>
				</ion-buttons>
			</ion-item>

			<ion-item button @click="clearCache">CLEAR CACHE</ion-item>
		</ion-list>
	</ion-content>
</template>

<script lang="ts">
import { clearCache } from "@/services/Music/objects";
import { songTypeToDisplayName } from "@/utils/songs";
import AppSettingsModal from "./AppSettingsModal.vue";

export async function createSettingsModal(): Promise<HTMLIonModalElement> {
	const modal = await modalController.create({
		component: AppSettingsModal,
		presentingElement: document.querySelector("ion-router-outlet") ?? undefined,
	});
	return modal;
}
</script>

<script setup lang="ts">
import {
	IonButton,
	IonButtons,
	IonContent,
	IonHeader,
	IonItem,
	IonLabel,
	IonList,
	IonTitle,
	IonToggle,
	IonToolbar,
	modalController,
} from "@ionic/vue";

import { useMusicServices } from "@/stores/music-services";

const services = useMusicServices();

async function close(): Promise<void> {
	await modalController.dismiss();
}
</script>

<style scoped>
.platform-status {
	display: inline-flex;
	align-items: center;
	gap: 8px;

	& > .platform-name {
		color: var(--color);
		font-weight: bold;
	}
}

.apple-music-logo-wrapper {
	display: inline;
	height: 1.5rem;

	:global(& > svg) {
		width: inherit;
		height: inherit;
	}
}
</style>
