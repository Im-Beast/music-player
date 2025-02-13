<template>
	<SongMenu :song="searchResult" :popover>
		<ion-item :button="true" :detail="false" @click="playNow">
			<ion-icon aria-hidden="true" :icon="playIcon" slot="end" />
			Play now
		</ion-item>

		<ion-item :button="true" :detail="false" @click="playNext">
			<ion-icon aria-hidden="true" :icon="hourglassIcon" slot="end" />
			Play next
		</ion-item>

		<ion-item :button="true" :detail="false" @click="addToQueue">
			<ion-icon aria-hidden="true" :icon="addIcon" slot="end" />
			Add to queue
		</ion-item>

		<ion-item :button="true" :detail="false" @click="modifyMetadata">
			<ion-icon aria-hidden="true" :icon="documentIcon" slot="end" />
			Modify metadata
		</ion-item>
	</SongMenu>
</template>

<script setup lang="ts">
import SongMenu from "@/components/SongMenu.vue";
import { createMetadataModal } from "@/components/SongMetadataModal.vue";
import type { SongSearchResult } from "@/services/MusicPlayer/MusicPlayerService";
import { AnySong, useMusicPlayer } from "@/stores/music-player";
import { IonIcon, IonItem, popoverController } from "@ionic/vue";
import {
	addOutline as addIcon,
	documentOutline as documentIcon,
	hourglassOutline as hourglassIcon,
	playOutline as playIcon,
} from "ionicons/icons";

const { searchResult, song, popover } = defineProps<{
	searchResult: SongSearchResult;
	song: Promise<AnySong>;
	popover: HTMLIonPopoverElement;
}>();

const musicPlayer = useMusicPlayer();

async function playNow(): Promise<void> {
	musicPlayer.addToQueue(await song, musicPlayer.queueIndex);
	await popoverController.dismiss();
}

async function playNext(): Promise<void> {
	musicPlayer.addToQueue(await song, musicPlayer.queueIndex + 1);
	await popoverController.dismiss();
}

async function addToQueue(): Promise<void> {
	musicPlayer.addToQueue(await song);
	await popoverController.dismiss();
}

async function modifyMetadata(): Promise<void> {
	const modal = await createMetadataModal(await song);
	await modal.present();
	await modal.onDidDismiss();
	await popoverController.dismiss();
}
</script>
