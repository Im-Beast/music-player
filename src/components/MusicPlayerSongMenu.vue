<template>
	<song-menu :song>
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
	</song-menu>
</template>

<script setup lang="ts">
import { IonItem, IonIcon } from "@ionic/vue";
import {
	playOutline as playIcon,
	hourglassOutline as hourglassIcon,
	remove as removeIcon,
} from "ionicons/icons";
import SongMenu from "@/components/SongMenu.vue";

import { AnySong, useMusicPlayer } from "@/stores/music-player";

const { song, index } = defineProps<{ song: AnySong; index: number }>();

const musicPlayer = useMusicPlayer();

function playNow() {
	musicPlayer.queueIndex = index;
}

function playNext() {
	musicPlayer.moveQueueItem(index, musicPlayer.queueIndex + 1);
}

function remove() {
	musicPlayer.removeFromQueue(index);
}
</script>
