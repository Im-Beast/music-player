<script lang="ts" setup>
import { computed, ref, useTemplateRef } from "vue";

import { download as importIcon } from "ionicons/icons";

import LocalImg from "@/components/LocalImg.vue";
import {
	actionSheetController,
	alertController,
	IonButton,
	IonButtons,
	IonContent,
	IonHeader,
	IonIcon,
	IonInput,
	IonItem,
	IonList,
	IonModal,
	IonNote,
	IonSelect,
	IonSelectOption,
	IonSpinner,
	IonTitle,
	IonToolbar,
} from "@ionic/vue";

import GenericSongItem from "@/components/GenericSongItem.vue";
import { Playlist, useMusicPlayer } from "@/stores/music-player";
import { songTypeToDisplayName } from "@/utils/songs";
import { usePresentingElement } from "@/utils/vue";

const { trigger } = defineProps<{ trigger: string }>();

const musicPlayer = useMusicPlayer();
const modal = useTemplateRef("modal");
const presentingElement = usePresentingElement();

const serviceType = ref();
const url = ref();
const playlist = ref<Playlist>();
const loading = ref(false);

const canLoad = computed(() => serviceType.value && url.value && !loading.value);

const supportedServices = computed(() =>
	musicPlayer.services.enabledServices.filter((service) => !!service.handleGetPlaylist),
);

function resetModal(): void {
	serviceType.value = undefined;
	url.value = undefined;
	playlist.value = undefined;
	loading.value = false;
}

function importPlaylist(): void {
	if (!playlist.value) return;
	musicPlayer.state.addPlaylist(playlist.value);
	modal.value?.$el.dismiss("importedPlaylist");
}

async function loadPlaylist(): Promise<void> {
	if (!canLoad.value) return;
	playlist.value = undefined;
	loading.value = true;

	try {
		const service = musicPlayer.services.getService(serviceType.value);
		playlist.value = await service?.getPlaylist(new URL(url.value));
		loading.value = false;
		return;
	} catch (error) {
		console.error(error);
		loading.value = false;
	}

	const missingAlert = await alertController.create({
		header: "Playlist Import Failed",
		message:
			"Importing your playlist failed. Make sure the URL is a valid playlist and you have the proper service enabled.",
		buttons: ["Dismiss"],
	});
	await missingAlert.present();
}

function dismiss(): void {
	modal.value?.$el.dismiss();
}

async function canDismiss(data?: "importedPlaylist"): Promise<boolean> {
	const title = playlist.value?.title;
	if (data === "importedPlaylist" || !title) {
		resetModal();
		return true;
	}

	const actionSheet = await actionSheetController.create({
		header: `Playlist ${title}`,
		subHeader: "Are you sure you want to discard this playlist?",
		buttons: [
			{ text: "Discard", role: "destructive", data: { action: "discard" } },
			{ text: "Cancel", role: "cancel", data: { action: "keep" } },
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

				<ion-title>Import Playlist</ion-title>

				<ion-buttons slot="end">
					<ion-button :disabled="!playlist" strong @click="importPlaylist">Import</ion-button>
				</ion-buttons>
			</ion-toolbar>
		</ion-header>

		<ion-content id="import-playlist-content" :fullscreen="true">
			<ion-list>
				<ion-item>
					<ion-select label="Music Service" placeholder="Apple Music" v-model="serviceType">
						<ion-select-option
							v-for="service in supportedServices"
							:key="service.type"
							:value="service.type"
						>
							{{ songTypeToDisplayName(service.type) }}
						</ion-select-option>
					</ion-select>
				</ion-item>

				<ion-item>
					<ion-input
						type="url"
						v-model="url"
						label="Playlist URL"
						placeholder="https://music.apple.com/..."
						required
					/>
				</ion-item>

				<ion-item lines="none">
					<ion-button :disabled="!canLoad" size="default" strong @click="loadPlaylist">
						<template v-if="loading">
							<ion-spinner slot="start" />
							Loading...
						</template>
						<template v-else>
							<ion-icon slot="start" :icon="importIcon" />
							Load playlist
						</template>
					</ion-button>
				</ion-item>
			</ion-list>

			<div id="playlist-preview" v-if="playlist">
				<h1 id="preview-headline">Preview</h1>

				<LocalImg :src="playlist.artwork" />
				<h1>{{ playlist.title }}</h1>

				<ion-note v-if="playlist.songs.length === 0">This playlist has no songs!</ion-note>
				<template v-else>
					<h2>
						{{ playlist.songs.length }} songs,
						{{ Math.round(playlist.songs.reduce((a, b) => a + (b.duration ?? 0), 0) / 60) }} minutes
					</h2>

					<ion-list>
						<GenericSongItem
							v-for="song in playlist.songs"
							:key="song.id"
							:title="song.title"
							:artists="song.artists"
							:artwork="song.artwork"
							:type="song.type"
						/>
					</ion-list>
				</template>
			</div>
		</ion-content>
	</ion-modal>
</template>

<style scoped>
#import-playlist-content,
#playlist-preview {
	text-align: center;

	& > h1 {
		font-weight: bold;
		margin-bottom: 0.25rem;
	}

	& > h2 {
		font-size: 1rem;
		margin-top: 0;
	}

	& > .local-img {
		margin-inline: auto;

		--img-height: 192px;
		--img-width: auto;
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
		background: transparent;

		& > ion-item {
			--background: transparent;

			& > ion-input {
				text-align: right;
			}

			& > ion-button {
				width: 100%;
				padding-top: 1rem;

				& > ion-spinner {
					margin-right: 0.5rem;
					width: 1em;
					height: 1em;
				}
			}
		}
	}
}

@keyframes appear {
	from {
		transform: scale(80%) translateY(100px);
		opacity: 0;
	}

	to {
		transform: scale(100%) translateY(0px);
		opacity: 1;
	}
}

#playlist-preview {
	margin-top: 12px;
	padding: 0.5rem;
	border-radius: 12px 12px 0 0;
	background-color: var(--ion-color-light);
	animation: appear 750ms;

	& > #preview-headline {
		font-size: 2.25rem;
		padding-bottom: 0.5rem;
		color: var(--ion-color-medium);
	}

	& > ion-list {
		background: transparent;

		:global(& ion-item) {
			--background: transparent;
		}

		:global(& ion-item ion-note) {
			--color: var(--ion-color-medium);
		}
	}
}
</style>
