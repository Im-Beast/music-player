<template>
	<ion-header>
		<ion-toolbar>
			<ion-title>User</ion-title>
			<ion-buttons slot="end">
				<ion-button :strong="true" @click="close">Close</ion-button>
			</ion-buttons>
		</ion-toolbar>
	</ion-header>
	<ion-content class="ion-padding">
		<ion-item>
			<ion-label class="platform-status">
				<div v-html="AppleMusicLogo" class="apple-music-logo-wrapper" />
				<span class="platform-name" style="color: var(--apple-music-color)">Apple Music</span>
			</ion-label>

			<ion-buttons v-if="musicKit.authorized">
				<ion-button @click="musicKit.authService.unauthorize()">Unauthorize</ion-button>
			</ion-buttons>
			<ion-buttons v-else>
				<ion-button @click="musicKit.authService.authorize()">Authorize</ion-button>
			</ion-buttons>
		</ion-item>
	</ion-content>
</template>

<script lang="ts">
import AppSettingsModal from "./AppSettingsModal.vue";
export async function createSettingsModal(): Promise<HTMLIonModalElement> {
	const modal = await modalController.create({
		component: AppSettingsModal,
	});
	return modal;
}
</script>

<script setup lang="ts">
import { useMusicKit } from "@/stores/musickit";
import {
	IonButton,
	IonButtons,
	IonContent,
	IonHeader,
	IonItem,
	IonLabel,
	IonTitle,
	IonToolbar,
	modalController,
} from "@ionic/vue";

import AppleMusicLogo from "@/assets/branding/AppleMusic.svg?raw";

const musicKit = useMusicKit();

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
