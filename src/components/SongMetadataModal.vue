<template>
	<ion-header>
		<ion-toolbar>
			<ion-title>Metadata</ion-title>
			<ion-buttons slot="end">
				<ion-button @click="reset">Reset</ion-button>
				<ion-button :strong="true" @click="close">Close</ion-button>
			</ion-buttons>
		</ion-toolbar>
	</ion-header>

	<ion-content>
		<ion-list>
			<ion-item class="artwork-picker">
				<SongImg
					:src="metadata.artwork ?? song.artwork"
					:alt="`Preview of metadata artwork for song ${metadata.title}`"
					@click="imagePicker?.click()"
				/>
				<input ref="imagePicker" type="file" accept="image/*" @change="changeArtwork" />
			</ion-item>

			<ion-item>
				<ion-input
					label="Title"
					label-placement="floating"
					:placeholder="song.title ?? 'Never Gonna Give You Up'"
					:value="metadata.title ?? song.title"
					@ion-input="onInput('title', $event)"
				/>
			</ion-item>

			<ion-item>
				<ion-input
					label="Artist"
					label-placement="floating"
					:placeholder="song.artist ?? 'Rick Astley'"
					:value="metadata.artist ?? song.artist"
					@ion-input="onInput('artist', $event)"
				/>
			</ion-item>

			<ion-item>
				<ion-input
					label="Album"
					label-placement="floating"
					:placeholder="song.album ?? 'Whenever You Need Somebody'"
					:value="metadata.album ?? song.album"
					@ion-input="onInput('album', $event)"
				/>
			</ion-item>

			<ion-item>
				<ion-input
					label="Genre"
					label-placement="floating"
					:placeholder="song.genre ?? 'Dance-pop'"
					:value="metadata.genre ?? song.genre"
					@ion-input="onInput('genre', $event)"
				/>
			</ion-item>
		</ion-list>
	</ion-content>
</template>

<script lang="ts">
import SongMetadataModal from "./SongMetadataModal.vue";
export async function createMetadataModal(song: AnySong): Promise<HTMLIonModalElement> {
	const songMetadata = useSongMetadata();
	const musicPlayer = useMusicPlayer();

	const modal = await modalController.create({
		component: SongMetadataModal,
		componentProps: { song },

		async canDismiss(data?: { metadata?: MetadataOverride; modified?: boolean }) {
			if (data && "modified" in data && !data.modified) {
				return true;
			}

			const actionSheet = await actionSheetController.create({
				header: "You have made some changes",
				subHeader: "What do you want to happen to them?",
				buttons: [
					{ text: "Save", role: "selected", data: { action: "save" } },
					{ text: "Discard", role: "destructive", data: { action: "discard" } },
				],
			});

			await actionSheet.present();
			const info = await actionSheet.onWillDismiss();

			switch (info?.data?.action) {
				case "save":
					await songMetadata.setMetadata(song, data!.metadata!);
					await musicPlayer.refreshSong(song);
					return true;
				case "discard":
					return true;
				default:
					return false;
			}
		},
	});

	return modal;
}
</script>

<script setup lang="ts">
import SongImg from "@/components/SongImg.vue";
import { useLocalImages } from "@/stores/local-images";
import { MetadataOverride, useSongMetadata } from "@/stores/metadata";
import { AnySong, useMusicPlayer } from "@/stores/music-player";
import {
	InputCustomEvent,
	IonButton,
	IonButtons,
	IonContent,
	IonHeader,
	IonInput,
	IonItem,
	IonList,
	IonTitle,
	IonToolbar,
	actionSheetController,
	modalController,
} from "@ionic/vue";
import { ref } from "vue";

const { song } = defineProps<{ song: AnySong }>();
const songMetadata = useSongMetadata();
const localImages = useLocalImages();

const metadata = ref(songMetadata.getReactiveMetadata(song));

function onInput(key: keyof MetadataOverride, event: InputCustomEvent): void {
	modify(key, `${event.target.value}`);
}

const modified = ref(false);
function modify<K extends keyof MetadataOverride>(key: K, value: MetadataOverride[K]): void {
	metadata.value[key] = value;
	modified.value = true;
}

const imagePicker = ref<HTMLInputElement>();
async function changeArtwork(): Promise<void> {
	const { files } = imagePicker.value!;

	if (!files?.length) {
		return;
	}

	const artwork = files[0];
	await localImages.localImageManagementService.associateImage(song.id, artwork, {
		width: 256,
		height: 256,
	});

	metadata.value.artwork = { id: song.id };
	modified.value = true;
}

async function reset(): Promise<void> {
	const actionSheet = await actionSheetController.create({
		header: "Are you sure you want to reset the metadata?",
		subHeader:
			"It will undo the changes you've made to metadata. It might require an app relaunch to fully refresh.",
		buttons: [
			{ text: "Cancel", role: "selected", data: { action: "cancel" } },
			{ text: "Reset", role: "destructive", data: { action: "reset" } },
		],
	});

	await actionSheet.present();
	const info = await actionSheet.onWillDismiss();

	switch (info?.data?.action) {
		case "reset":
			metadata.value = {};
			modified.value = true;
			await close();
			break;
		case "cancel":
			break;
	}
}

async function close(): Promise<void> {
	await modalController.dismiss({ metadata: metadata.value, modified: modified.value }, "close");
	modified.value = false;
}
</script>

<style scoped>
ion-list {
	background: transparent;

	& > ion-item {
		--background: transparent;
	}
}

.artwork-picker {
	& > img {
		margin-inline: auto;
		margin-block: 16px;
		max-width: 160px;
		border-radius: 12px;
		box-shadow: 0 0 24px #0004;
	}

	& > input {
		display: none;
	}
}
</style>
