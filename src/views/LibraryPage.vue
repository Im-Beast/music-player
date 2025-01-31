<template>
	<ion-page>
		<app-header>
			<template #toolbar>
				<ion-title>Library</ion-title>
				<ion-progress-bar v-if="isLoading" type="indeterminate" />
			</template>
		</app-header>

		<ion-content :fullscreen="true">
			<ion-refresher slot="fixed" @ion-refresh="refreshLocalLibrary($event)">
				<ion-refresher-content />
			</ion-refresher>

			<song-item v-for="(song, i) in songs" :key="getUniqueSongId(song)" :song />
		</ion-content>

		<app-footer />
	</ion-page>
</template>

<script setup lang="ts">
import {
	IonPage,
	IonTitle,
	IonContent,
	IonRefresher,
	IonRefresherContent,
	RefresherCustomEvent,
	IonProgressBar,
} from "@ionic/vue";
import AppHeader from "@/components/AppHeader.vue";
import AppFooter from "@/components/AppFooter.vue";
import { onUpdated, ref } from "vue";
import { AnySong, useMusicPlayer } from "@/stores/music-player";
import SongItem from "@/components/SongItem.vue";
import { getUniqueSongId } from "@/utils/songs";

const musicPlayer = useMusicPlayer();

const songs = ref<AnySong[]>([]);
const isLoading = ref(false);

onUpdated(async () => {
	isLoading.value = true;
	songs.value = await musicPlayer.librarySongs();
	isLoading.value = false;
});

async function refreshLocalLibrary(event: RefresherCustomEvent) {
	await musicPlayer.refreshServices();
	songs.value = await musicPlayer.librarySongs();
	await event.target.complete();
}
</script>
