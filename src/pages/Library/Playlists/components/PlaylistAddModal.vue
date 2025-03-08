<script lang="ts" setup>
import { computed, ref, toRaw, useTemplateRef } from "vue";

import SongImagePicker from "@/components/SongImagePicker.vue";
import {
	actionSheetController,
	IonButton,
	IonButtons,
	IonContent,
	IonHeader,
	IonInput,
	IonItem,
	IonList,
	IonModal,
	IonTitle,
	IonToolbar,
} from "@ionic/vue";

import { SongImage, useMusicPlayer } from "@/stores/music-player";
import { generateUUID } from "@/utils/crypto";
import { usePresentingElement } from "@/utils/vue";

const { trigger } = defineProps<{ trigger: string }>();

const musicPlayer = useMusicPlayer();
const modal = useTemplateRef("modal");
const presentingElement = usePresentingElement();

const playlistId = ref(generateUUID());
const playlistTitle = ref("");
const artwork = ref<SongImage>();
const modified = computed(() => !!(playlistTitle.value || artwork.value));
const canCreate = computed(() => !!playlistTitle.value);

function resetModal(): void {
	playlistId.value = generateUUID();
	playlistTitle.value = "";
	artwork.value = undefined;
}

function create(): void {
	if (!canCreate.value) return;

	musicPlayer.addPlaylist({
		id: playlistId.value,
		title: playlistTitle.value,
		artwork: toRaw(artwork.value),
		songs: [],
	});

	resetModal();
	modal.value?.$el.dismiss("createdPlaylist");
}

function dismiss(): void {
	modal.value?.$el.dismiss();
}

async function canDismiss(reason?: "createdPlaylist"): Promise<boolean> {
	if (reason === "createdPlaylist" || !modified.value) {
		resetModal();
		return true;
	}

	const actionSheet = await actionSheetController.create({
		header: `Playlist ${playlistTitle.value}`,
		subHeader: "Are you sure you want to discard this new playlist?",
		buttons: [
			{ text: "Discard", role: "destructive", data: { action: "discard" } },
			{ text: "Keep editing", role: "cancel", data: { action: "keep" } },
		],
	});

	await actionSheet.present();
	const info = await actionSheet.onWillDismiss();

	switch (info?.data?.action) {
		case "discard":
			resetModal();
			return true;
		default:
			return false;
	}
}
</script>

<template>
	<ion-modal ref="modal" :trigger :presenting-element="presentingElement" :can-dismiss="canDismiss">
		<ion-header>
			<ion-toolbar>
				<ion-buttons slot="start">
					<ion-button color="danger" @click="dismiss()">Cancel</ion-button>
				</ion-buttons>

				<ion-title>Add Playlist</ion-title>

				<ion-buttons slot="end">
					<ion-button :disabled="!canCreate" strong @click="create()">Create</ion-button>
				</ion-buttons>
			</ion-toolbar>
		</ion-header>

		<ion-content id="add-playlist-content" :fullscreen="true">
			<SongImagePicker :id="playlistId" @input="artwork = $event.value" />

			<ion-list>
				<ion-item>
					<ion-input aria-label="Playlist Title" placeholder="Playlist Title" v-model="playlistTitle" />
				</ion-item>
			</ion-list>
		</ion-content>
	</ion-modal>
</template>

<style scoped>
#add-playlist-content {
	text-align: center;

	& > h1 {
		font-weight: bold;
		margin-bottom: 0.25rem;
	}

	& > h2 {
		font-size: 1rem;
		margin-top: 0;
	}

	& > ion-button {
		&::part(native) {
			width: 33%;
			margin-inline: auto;
		}

		width: 100%;
		padding-bottom: 1rem;
		border-bottom: 0.55px solid
			var(--ion-color-step-250, var(--ion-background-color-step-250, #c8c7cc));
	}

	& > .song-img {
		margin-inline: auto;

		--shadow-color: rgba(var(--ion-color-dark-rgb), 0.1);

		border-radius: 12px;
		box-shadow: 0 0 12px var(--shadow-color);
		margin-block: 24px;
		background-color: rgba(var(--ion-color-dark-rgb), 0.08);

		& > .fallback {
			--size: 36px;
			filter: drop-shadow(0 0 12px var(--shadow-color));
		}
	}

	& > ion-list {
		width: 100%;

		& > ion-item {
			& > ion-input {
				font-size: 1.625rem;
				font-weight: bold;
				text-align: center;
			}
		}
	}
}
</style>
