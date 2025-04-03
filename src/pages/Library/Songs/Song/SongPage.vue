<script setup lang="ts">
import { computedAsync } from "@vueuse/core";
import { computed, useTemplateRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { IonButton, IonButtons, IonIcon, IonSkeletonText, IonThumbnail } from "@ionic/vue";
import { pencil as editIcon, play as playIcon } from "ionicons/icons";

import AppPage from "@/components/AppPage.vue";
import LocalImg from "@/components/LocalImg.vue";
import WrappingMarquee from "@/components/WrappingMarquee.vue";
import SongEditModal, { SongEditEvent } from "../components/SongEditModal.vue";

import { useSongMetadata } from "@/stores/metadata";
import { AnySong, useMusicPlayer } from "@/stores/music-player";
import { formatArtists } from "@/utils/songs";

const musicPlayer = useMusicPlayer();
const songMetadata = useSongMetadata();
const router = useRouter();
const route = useRoute();

const previousRouteName = computed(() => {
	const { state } = router.options.history;
	if (!("back" in state)) return "Songs";
	return String(router.resolve(state.back as any)?.name);
});

const song = computedAsync(async () => {
	return await musicPlayer.services.getSong(
		route.params.songType as AnySong["type"],
		route.params.songId as string,
	);
});

const isSingle = computed(() => !!song.value?.album?.includes("- Single"));

const editSongButton = useTemplateRef("edit-song");
watch(
	[song, editSongButton],
	([song, button]) => {
		if (song && button && route.hash === "#edit") {
			console.log(button.$el);
			button.$el.click();
		}
	},
	{ immediate: true },
);

async function editSong(event: SongEditEvent): Promise<void> {
	if (!song.value) return;

	songMetadata.setMetadata(song.value.id, event);
	song.value = await musicPlayer.services.refreshSong(song.value);
}

async function playNow(): Promise<void> {
	if (!song.value) return;

	if (musicPlayer.state?.currentSong?.id === song.value.id) {
		await musicPlayer.play();
	} else {
		await musicPlayer.state.addToQueue(song.value, musicPlayer.state.queueIndex);
	}
}
</script>

<template>
	<AppPage :back-button="previousRouteName">
		<template #toolbar-end>
			<ion-buttons>
				<ion-button ref="edit-song" id="edit-song" v-if="song">
					<ion-icon slot="icon-only" :icon="editIcon" />
				</ion-button>
			</ion-buttons>
		</template>

		<SongEditModal v-if="song" :song trigger="edit-song" @change="editSong" />

		<div id="song-content" v-if="song">
			<LocalImg :src="song.artwork" />
			<h1 class="ion-text-nowrap">
				<WrappingMarquee :text="song.title ?? 'Unknown title'" />
			</h1>
			<!-- TODO: ARTISTS -->
			<RouterLink class="artist" to="">
				{{ formatArtists(song.artists) }}
			</RouterLink>
			<RouterLink v-if="!isSingle" class="album" :to="`/library/albums/song/${song.type}/${song.id}`">
				{{ song.album }}
			</RouterLink>

			<ion-button :disabled="!song.available" strong @click="playNow">
				<ion-icon slot="start" :icon="playIcon" />
				Play
			</ion-button>
		</div>
		<div id="song-loading-content" v-else>
			<ion-thumbnail>
				<ion-skeleton-text :animated="true" />
			</ion-thumbnail>
			<h1><ion-skeleton-text :animated="true" /></h1>
			<h2><ion-skeleton-text :animated="true" /></h2>
		</div>
	</AppPage>
</template>

<style scoped>
@keyframes fade-in {
	from {
		opacity: 0;
	}

	to {
		opacity: 1;
	}
}

#song-content {
	text-align: center;

	animation: fade-in 350ms;

	& > h1 {
		font-size: min(2.125rem, 61.2px);
		font-weight: bold;

		mask-image: linear-gradient(to right, transparent, black 10% 90%, transparent);

		margin-top: 0;
		margin-bottom: 0.25rem;

		--marquee-duration: 20s;
		--marquee-align: center;
	}

	& > .artist,
	& > .album {
		display: block;

		color: var(--ion-color-dark-rgb);
		text-decoration: none;

		width: max-content;

		margin-top: 0;
		margin-bottom: 10px;
		margin-inline: auto;

		cursor: pointer;
		&:hover {
			opacity: 80%;

			@media (pointer: fine) {
				text-decoration: underline;
			}
		}
		&:active {
			opacity: 60%;
		}
	}

	& > .artist {
		font-size: 1.25rem;
		font-weight: 550;
	}

	& > .album {
		font-size: 1rem;
		font-weight: 450;
	}

	& > ion-button {
		&::part(native) {
			width: 33%;
			margin-inline: auto;
		}

		width: 100%;
		padding-bottom: 1rem;
	}

	& > .local-img {
		margin-inline: auto;

		--img-height: 192px;
		--img-width: auto;

		--shadow-color: rgba(var(--ion-color-dark-rgb), 0.1);

		border-radius: 12px;
		box-shadow: 0 0 12px var(--shadow-color);
		margin-block: 24px;
		background-color: rgba(var(--ion-color-dark-rgb), 0.08);

		& > .fallback {
			--size: 36px;
			filter: drop-shadow(0 0 12px var(--shadow-color));
		}
	}
}

#song-loading-content {
	display: flex;
	flex-direction: column;
	align-items: center;

	animation: fade-in 350ms;

	& > ion-thumbnail {
		margin-inline: auto;
		margin-block: 24px;

		height: 192px;
		width: 192px;
		--border-radius: 12px;
	}

	& > h1 {
		width: 50%;
		height: 20px;
		margin-top: 0;
		margin-bottom: 0.25rem;
	}

	& > h2 {
		width: 40%;
		margin-top: 0;
	}
}
</style>
