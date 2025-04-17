<script setup lang="ts">
import { computed, inject, reactive, ref, Ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
	InfiniteScrollCustomEvent,
	IonInfiniteScroll,
	IonInfiniteScrollContent,
	IonItem,
	IonList,
} from "@ionic/vue";

import AppPage from "@/components/AppPage.vue";
import GenericSongItem from "@/components/GenericSongItem.vue";
import SkeletonItem from "@/components/SkeletonItem.vue";

import {
	Artist,
	Filled,
	filledArtist,
	Song,
	SongPreview,
	SongType,
} from "@/services/Music/objects";
import { useMusicPlayer } from "@/stores/music-player";
import { watchAsync } from "@/utils/vue";

const musicPlayer = useMusicPlayer();
const router = useRouter();
const route = useRoute();

const previousRouteName = computed(() => {
	const { state } = router.options.history;
	if (!("back" in state)) return "Songs";
	return String(router.resolve(state.back as any)?.name);
});

const songs = reactive<(Song | SongPreview)[]>([]);

const isLoading = ref(true);
const artist = ref<Filled<Artist>>();
watchAsync(
	() => [route.params.artistType, route.params.artistId],
	async ([artistType, artistId]) => {
		if (!artistType || !artistId) return;

		const $artist = await musicPlayer.services.getArtist(
			route.params.artistType as SongType,
			route.params.artistId as string,
		);

		artist.value = $artist && filledArtist($artist);
	},
	{ immediate: true },
);

const offset = ref(0);
watchAsync(artist, async (artist) => {
	songs.length = 0;
	offset.value = 0;
	if (!artist) return;

	isLoading.value = true;
	for await (const song of musicPlayer.services.getArtistsSongs(artist, 0)) {
		songs.push(song);
	}
	isLoading.value = false;
});

async function loadMoreSongs(event: InfiniteScrollCustomEvent): Promise<void> {
	if (!artist.value) return;
	offset.value += 1;
	for await (const song of musicPlayer.services.getArtistsSongs(artist.value, offset.value)) {
		songs.push(song);
	}
	await event.target.complete();
}
</script>

<template>
	<AppPage :back-button="previousRouteName" title="Top Songs">
		<ion-list v-if="isLoading" class="songs-list">
			<SkeletonItem v-for="i in 25" :key="i" />
		</ion-list>
		<ion-list v-else-if="artist">
			<GenericSongItem
				v-for="song in songs"
				:key="song.id"
				:title="song.title"
				:album="song.album"
				:artwork="song.artwork"
				:disabled="!song.available"
			/>
		</ion-list>

		<ion-infinite-scroll v-if="artist" @ion-infinite="loadMoreSongs">
			<ion-infinite-scroll-content loading-spinner="dots" />
		</ion-infinite-scroll>
	</AppPage>
</template>
