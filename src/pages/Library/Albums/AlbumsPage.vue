<script lang="ts" setup>
import {
	IonCard,
	IonCardHeader,
	IonCardSubtitle,
	IonCardTitle,
	IonRefresher,
	IonRefresherContent,
	RefresherCustomEvent,
} from "@ionic/vue";
import { onUpdated, ref } from "vue";

import AppPage from "@/components/AppPage.vue";
import LocalImg from "@/components/LocalImg.vue";

import ContextMenu from "@/components/ContextMenu.vue";
import SkeletonCard from "@/components/SkeletonCard.vue";
import { AlbumPreview, filledArtistPreview } from "@/services/Music/objects";
import { useMusicPlayer } from "@/stores/music-player";
import { formatArtists } from "@/utils/songs";
import { useSessionStorage } from "@vueuse/core";

const musicPlayer = useMusicPlayer();

const libraryAlbums = useSessionStorage<AlbumPreview[]>("libraryAlbums", []);
const isLoading = ref(libraryAlbums.value.length === 0);
onUpdated(async () => {
	if (!libraryAlbums.value.length) {
		isLoading.value = true;
		for await (const album of musicPlayer.services.libraryAlbums()) {
			libraryAlbums.value.push(album);
		}
		isLoading.value = false;
	}
});

async function refreshAlbumLibrary(event: RefresherCustomEvent): Promise<void> {
	isLoading.value = true;
	await musicPlayer.services.refreshLibraryAlbums();
	libraryAlbums.value.length = 0;
	for await (const album of musicPlayer.services.libraryAlbums()) {
		libraryAlbums.value.push(album);
	}
	isLoading.value = false;
	await event.target.complete();
}
</script>

<template>
	<AppPage title="Albums" back-button="Library">
		<ion-refresher slot="fixed" @ion-refresh="refreshAlbumLibrary">
			<ion-refresher-content />
		</ion-refresher>

		<div v-if="isLoading" class="album-cards">
			<SkeletonCard v-for="i in 25" :key="i" />
		</div>
		<div v-else class="album-cards">
			<ContextMenu v-for="album in libraryAlbums" :key="album.id">
				<ion-card class="album-card" :router-link="`/library/albums/album/${album.type}/${album.id}`">
					<LocalImg :src="album.artwork" />

					<ion-card-header>
						<ion-card-title class="ion-text-nowrap">
							{{ album.title }}
						</ion-card-title>
						<ion-card-subtitle class="ion-text-nowrap">
							{{ formatArtists(album.artists.map(filledArtistPreview)) }}
						</ion-card-subtitle>
					</ion-card-header>
				</ion-card>
			</ContextMenu>
		</div>
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

.album-cards {
	display: grid;
	width: 100vw;
	padding: 8px;
	grid-template-rows: auto;

	justify-content: center;
	align-items: center;

	animation: show-up 250ms ease-in;

	--gap: 8px;
	--columns: 1;
	@media screen and (min-width: 320px) {
		--columns: 2;
	}
	@media screen and (min-width: 640px) {
		--gap: 16px;
		--columns: 3;
	}
	@media screen and (min-width: 960px) {
		--columns: 4;
	}
	@media screen and (min-width: 960px) {
		--gap: 24px;
		--columns: 4;
	}
	gap: var(--gap);
	grid-template-columns: repeat(var(--columns), calc(100% / var(--columns) - var(--gap)));

	.context-menu:not(.closed) > .context-menu-item > ion-card {
		transition: var(--context-menu-transition);

		--background: var(--context-menu-item-background);

		border-radius: 24px;
		--border-color: transparent;
		padding: 12px;

		& > .local-img {
			border-radius: 12px;
		}
	}

	& .context-item-container,
	:global(& .context-menu-dummy) {
		display: inline-block;
	}
}

.context-menu:not(.closed) > .context-menu-item > .album-card {
	background: var(--context-menu-item-background);
}

.album-card,
.skeleton-card {
	margin: 0;
	background: transparent;
	box-shadow: none;
	border-radius: 0;

	& > .local-img {
		border-radius: 8px;
	}

	& > ion-card-header {
		padding: 8px;

		& > ion-card-title {
			font-size: 1rem;
			font-weight: 550;
			text-overflow: ellipsis;
			overflow: hidden;
		}

		& > ion-card-subtitle {
			font-size: 0.75rem;
			font-weight: 400;
			text-overflow: ellipsis;
			overflow: hidden;
		}
	}
}
</style>
