<script lang="ts" setup>
import { onUpdated, ref } from "vue";

import { IonList, IonRefresher, IonRefresherContent, RefresherCustomEvent } from "@ionic/vue";

import AppPage from "@/components/AppPage.vue";
import GenericSongItem from "@/components/GenericSongItem.vue";
import SkeletonItem from "@/components/SkeletonItem.vue";
import { Song } from "@/services/Music/objects";
import { useMusicPlayer } from "@/stores/music-player";
import { useSessionStorage } from "@vueuse/core";

const musicPlayer = useMusicPlayer();

const librarySongs = useSessionStorage<Song[]>("librarySongs", []);
const isLoading = ref(librarySongs.value.length === 0);
onUpdated(async () => {
	if (!librarySongs.value.length) {
		isLoading.value = true;
		for await (const song of musicPlayer.services.librarySongs()) {
			librarySongs.value.push(song);
		}
		isLoading.value = false;
	}
});

async function refreshSongLibrary(event: RefresherCustomEvent): Promise<void> {
	isLoading.value = true;
	await musicPlayer.services.refreshLibrarySongs();
	librarySongs.value.length = 0;
	for await (const song of musicPlayer.services.librarySongs()) {
		librarySongs.value.push(song);
	}
	isLoading.value = false;
	await event.target.complete();
}
</script>

<template>
	<AppPage title="Songs" back-button="Library">
		<ion-refresher slot="fixed" @ion-refresh="refreshSongLibrary">
			<ion-refresher-content />
		</ion-refresher>

		<ion-list v-if="isLoading" class="songs-list">
			<SkeletonItem v-for="i in 25" :key="i" />
		</ion-list>
		<ion-list v-else class="songs-list">
			<GenericSongItem
				v-for="song in librarySongs"
				:key="song.id"
				:router-link="`/library/songs/${song.type}/${song.id}`"
				:title="song.title"
				:artists="song.artists"
				:artwork="song.artwork"
				:type="song.type"
			/>
		</ion-list>
	</AppPage>
</template>

<style scoped>
@keyframes show-up {
	from {
		opacity: 0%;
	}

	to {
		opacity: 100%;
	}
}

.songs-list {
	animation: show-up 250ms ease-in;
}
</style>
