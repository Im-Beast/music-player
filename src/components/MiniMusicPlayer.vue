<template>
	<ion-item button :detail="false" @click.self="modalOpen = true" v-if="currentSong?.id">
		<ion-thumbnail slot="start">
			<SongImg :src="currentSong.artwork" :alt="`Artwork for song '${currentSong.title}'`" />
		</ion-thumbnail>

		<ion-label class="ion-text-nowrap">
			{{ currentSong.title }}
		</ion-label>

		<ion-buttons slot="end">
			<ion-button :disabled="!hasPrevious" @click="musicPlayer.skipPrevious">
				<ion-icon :icon="skipPreviousIcon" slot="icon-only" />
			</ion-button>
			<ion-button @click="musicPlayer.togglePlay" :disabled="loading">
				<ion-spinner v-if="loading" />
				<ion-icon v-else :icon="playing ? pauseIcon : playIcon" slot="icon-only" />
			</ion-button>
			<ion-button :disabled="!hasNext" @click="musicPlayer.skipNext">
				<ion-icon :icon="skipNextIcon" slot="icon-only" />
			</ion-button>
		</ion-buttons>
	</ion-item>

	<ion-modal
		:is-open="modalOpen"
		:initial-breakpoint="1"
		:breakpoints="[0, 1]"
		@willDismiss="modalOpen = false"
	>
		<MusicPlayer />
	</ion-modal>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { ref } from "vue";

import {
	IonButton,
	IonButtons,
	IonIcon,
	IonItem,
	IonLabel,
	IonModal,
	IonSpinner,
	IonThumbnail,
} from "@ionic/vue";
import {
	pause as pauseIcon,
	play as playIcon,
	playSkipForward as skipNextIcon,
	playSkipBack as skipPreviousIcon,
} from "ionicons/icons";

import MusicPlayer from "@/components/MusicPlayer.vue";
import SongImg from "@/components/SongImg.vue";
import { useMusicPlayer } from "@/stores/music-player";

const musicPlayer = useMusicPlayer();
const { loading, playing, currentSong, hasPrevious, hasNext } = storeToRefs(musicPlayer);

const modalOpen = ref(false);
</script>

<style scoped>
ion-label {
	font-weight: bold;
}

ion-thumbnail {
	--border-radius: 12px;
}

ion-item {
	& > ion-thumbnail,
	ion-label {
		pointer-events: none;
	}
}
</style>
