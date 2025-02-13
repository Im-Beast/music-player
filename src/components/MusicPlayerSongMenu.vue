<template>
	<SongMenu :song :popover>
		<ion-item :button="true" :detail="false" @click="playNow">
			<ion-icon aria-hidden="true" :icon="playIcon" slot="end" />
			Play now
		</ion-item>

		<ion-item :button="true" :detail="false" @click="playNext">
			<ion-icon aria-hidden="true" :icon="hourglassIcon" slot="end" />
			Play next
		</ion-item>

		<ion-item :button="true" :detail="false" @click="remove">
			<ion-icon aria-hidden="true" :icon="removeIcon" slot="end" />
			Remove
		</ion-item>
	</SongMenu>
</template>

<script setup lang="ts">
import SongMenu from "@/components/SongMenu.vue";
import { IonIcon, IonItem } from "@ionic/vue";
import {
	hourglassOutline as hourglassIcon,
	playOutline as playIcon,
	remove as removeIcon,
} from "ionicons/icons";

import { AnySong, useMusicPlayer } from "@/stores/music-player";

const { song, index, popover } = defineProps<{
	song: AnySong;
	index: number;
	popover: HTMLIonPopoverElement;
}>();

const musicPlayer = useMusicPlayer();

function playNow(): void {
	musicPlayer.queueIndex = index;
}

function playNext(): void {
	musicPlayer.moveQueueItem(index, musicPlayer.queueIndex + 1);
}

function remove(): void {
	musicPlayer.removeFromQueue(index);
}
</script>
