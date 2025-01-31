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
				<song-img
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

<script setup lang="ts">
import { ref } from "vue";
import { MetadataOverride, useSongMetadata } from "@/stores/metadata";
import { AnySong } from "@/stores/music-player";
import {
	IonHeader,
	IonToolbar,
	IonButton,
	IonTitle,
	IonButtons,
	IonContent,
	IonItem,
	IonInput,
	IonList,
	modalController,
	InputCustomEvent,
	actionSheetController,
} from "@ionic/vue";
import SongImg from "@/components/SongImg.vue";
import { useLocalImages } from "@/stores/local-images";

const { song } = defineProps<{ song: AnySong }>();
const songMetadata = useSongMetadata();
const localImages = useLocalImages();

const metadata = ref(songMetadata.getReactiveMetadata(song));

function onInput(key: keyof MetadataOverride, event: InputCustomEvent) {
	modify(key, `${event.target.value}`);
}

let modified = ref(false);
function modify<K extends keyof MetadataOverride>(key: K, value: MetadataOverride[K]) {
	metadata.value[key] = value;
	modified.value = true;
}

const imagePicker = ref<HTMLInputElement>();
async function changeArtwork(event: Event) {
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
