<template>
	<ion-item
		button
		:detail="false"
		@click.self="play"
		v-on-long-press.prevent="[handleHoldPopover, { delay: 300 }]"
		@contextmenu.prevent="createPopover"
	>
		<ion-thumbnail v-if="artwork" slot="start">
			<song-img :src="artwork" :alt="`Artwork for song '${title}' by ${artist}`" />
		</ion-thumbnail>

		<ion-label class="ion-text-nowrap">
			<h2>{{ title ?? "Unknown title" }}</h2>
			<ion-note>
				<ion-icon :icon="compassIcon" />
				{{ songTypeDisplayName(song) }}
				<ion-icon :icon="musicalNoteIcon" />
				{{ artist }}
			</ion-note>
		</ion-label>
	</ion-item>
</template>

<script setup lang="ts">
import { AnySong, useMusicPlayer } from "@/stores/music-player";
import { songTypeDisplayName } from "@/utils/songs";
import { IonItem, IonThumbnail, IonLabel, IonIcon, IonNote, popoverController } from "@ionic/vue";
import { musicalNote as musicalNoteIcon, compass as compassIcon } from "ionicons/icons";
import { Haptics } from "@capacitor/haptics";
import SongItemMenu from "@/components/SongItemMenu.vue";
import { vOnLongPress } from "@vueuse/components";
import SongImg from "@/components/SongImg.vue";

const { song } = defineProps<{ song: AnySong }>();
const { title, artist, artwork } = song;

const musicPlayer = useMusicPlayer();

function play() {
	musicPlayer.addToQueue(song, musicPlayer.queueIndex);
}

async function handleHoldPopover(event: Event) {
	// Disable on non-touch devices
	if (!navigator.maxTouchPoints) {
		return;
	}

	event.preventDefault();
	await Haptics.impact().catch(() => {});
	await createPopover(event);
}

async function createPopover(event: Event) {
	const popover = await popoverController.create({
		component: SongItemMenu,
		event,
		componentProps: { song },
		arrow: false,
		reference: "event",
		alignment: "center",
		side: "right",
		cssClass: "song-item-popover",
		size: "auto",
	});

	await popover.present();
}
</script>

<style scoped>
ion-item {
	& > ion-thumbnail {
		pointer-events: none;
	}

	& > ion-label {
		pointer-events: none;

		& > h2 {
			font-size: 1rem;
			font-weight: bold;
			display: block;
		}

		& > ion-note {
			display: flex;
			align-items: center;
			gap: 0.5ch;
			font-size: 0.8em;
		}
	}
}
</style>
