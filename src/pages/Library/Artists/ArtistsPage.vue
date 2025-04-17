<script lang="ts" setup>
import { useSessionStorage } from "@vueuse/core";
import { onUpdated, ref } from "vue";

import AppPage from "@/components/AppPage.vue";
import SkeletonItem from "@/components/SkeletonItem.vue";
import { IonList, IonRefresher, IonRefresherContent, RefresherCustomEvent } from "@ionic/vue";
import ArtistItem from "./components/ArtistItem.vue";

import { Artist, ArtistPreview } from "@/services/Music/objects";
import { useMusicPlayer } from "@/stores/music-player";

const musicPlayer = useMusicPlayer();

const libraryArtists = useSessionStorage<(Artist | ArtistPreview)[]>("libraryArtists", []);
const isLoading = ref(libraryArtists.value.length === 0);
onUpdated(async () => {
	if (!libraryArtists.value.length) {
		isLoading.value = true;
		for await (const artist of musicPlayer.services.libraryArtists()) {
			console.log(artist);
			libraryArtists.value.push(artist);
		}
		isLoading.value = false;
	}
});

async function refreshArtistLibrary(event: RefresherCustomEvent): Promise<void> {
	isLoading.value = true;
	await musicPlayer.services.refreshLibraryArtists();
	libraryArtists.value.length = 0;
	for await (const song of musicPlayer.services.libraryArtists()) {
		libraryArtists.value.push(song);
	}
	isLoading.value = false;
	await event.target.complete();
}
</script>

<template>
	<AppPage title="Artists" back-button="Library">
		<ion-refresher slot="fixed" @ion-refresh="refreshArtistLibrary">
			<ion-refresher-content />
		</ion-refresher>

		<ion-list v-if="isLoading" class="artists-list">
			<SkeletonItem v-for="i in 25" :key="i" />
		</ion-list>
		<ion-list v-else class="artists-list">
			<ArtistItem v-for="artist in libraryArtists" :artist :key="artist.id" />
		</ion-list>
	</AppPage>
</template>

<style>
.artists-list {
	& > .skeleton-item {
		& > ion-thumbnail {
			--border-radius: 9999px;
		}
	}
}
</style>
