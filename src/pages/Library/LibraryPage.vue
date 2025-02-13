<template>
	<ion-page>
		<AppHeader>
			<template #toolbar>
				<ion-title>Library</ion-title>
				<ion-progress-bar v-if="isLoading" type="indeterminate" />
			</template>
		</AppHeader>

		<ion-content :fullscreen="true">
			<ion-refresher slot="fixed" @ion-refresh="refreshLocalLibrary($event)">
				<ion-refresher-content />
			</ion-refresher>

			<SongItem v-for="song in songs" :key="getUniqueObjectId(song)" :song />
		</ion-content>

		<AppFooter />
	</ion-page>
</template>

<script setup lang="ts">
import AppFooter from "@/components/AppFooter.vue";
import AppHeader from "@/components/AppHeader.vue";
import SongItem from "@/components/SongItem.vue";
import { AnySong, useMusicPlayer } from "@/stores/music-player";
import { getUniqueObjectId } from "@/utils/vue";
import {
	IonContent,
	IonPage,
	IonProgressBar,
	IonRefresher,
	IonRefresherContent,
	IonTitle,
	RefresherCustomEvent,
} from "@ionic/vue";
import { onUpdated, ref } from "vue";

const musicPlayer = useMusicPlayer();

const songs = ref<AnySong[]>([]);
const isLoading = ref(false);

onUpdated(async () => {
	isLoading.value = true;
	songs.value = await musicPlayer.librarySongs();
	isLoading.value = false;
});

async function refreshLocalLibrary(event: RefresherCustomEvent): Promise<void> {
	await musicPlayer.refreshLibrarySongs();
	songs.value = await musicPlayer.librarySongs();
	await event.target.complete();
}
</script>
