<template>
	<ion-item
		button
		:detail="false"
		@click.self="play"
		v-on-long-press.prevent="[handleHoldPopover, { delay: 200 }]"
		@contextmenu.prevent="createPopover"
	>
		<ion-thumbnail v-if="artwork" slot="start">
			<SongImg :src="artwork" :alt="`Artwork for song '${title}' by ${artist}`" />
		</ion-thumbnail>

		<ion-label class="ion-text-nowrap">
			<h2>{{ title ?? "Unknown title" }}</h2>
			<ion-note>
				<ion-icon :icon="compassIcon" />
				{{ songTypeToDisplayName(song.type) }}
				<ion-icon :icon="musicalNoteIcon" />
				{{ artist }}
			</ion-note>
		</ion-label>
	</ion-item>
</template>

<script setup lang="ts">
import SongImg from "@/components/SongImg.vue";
import SongItemMenu from "@/components/SongItemMenu.vue";
import { createSongMenuPopover, handleHoldSongMenuPopover } from "@/components/SongMenu.vue";
import { AnySong, useMusicPlayer } from "@/stores/music-player";
import { songTypeToDisplayName } from "@/utils/songs";
import { IonIcon, IonItem, IonLabel, IonNote, IonThumbnail } from "@ionic/vue";
import { vOnLongPress } from "@vueuse/components";
import { compass as compassIcon, musicalNote as musicalNoteIcon } from "ionicons/icons";

const { song } = defineProps<{ song: AnySong }>();
const { title, artist, artwork } = song;

const musicPlayer = useMusicPlayer();

function play(): void {
	musicPlayer.addToQueue(song, musicPlayer.queueIndex);
}

async function handleHoldPopover(event: Event): Promise<void> {
	await handleHoldSongMenuPopover(event, () => createPopover(event));
}

async function createPopover(event: Event): Promise<void> {
	const popover = await createSongMenuPopover(event, SongItemMenu, { song });
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
