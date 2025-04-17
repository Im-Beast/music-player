<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { IonButton, IonButtons, IonIcon, IonSkeletonText, IonThumbnail } from "@ionic/vue";
import { pencil as editIcon, play as playIcon } from "ionicons/icons";

import AppPage from "@/components/AppPage.vue";
import LocalImg from "@/components/LocalImg.vue";
import WrappingMarquee from "@/components/WrappingMarquee.vue";
import SongEditModal, { SongEditEvent } from "../components/SongEditModal.vue";

import { Filled, filledSong, Song, SongType } from "@/services/Music/objects";
import { useSongMetadata } from "@/stores/metadata";
import { useMusicPlayer } from "@/stores/music-player";
import { watchAsync } from "@/utils/vue";

const musicPlayer = useMusicPlayer();
const songMetadata = useSongMetadata();
const router = useRouter();
const route = useRoute();

const previousRouteName = computed(() => {
	const { state } = router.options.history;
	if (!("back" in state)) return "Songs";
	return String(router.resolve(state.back as any)?.name);
});

const song = ref<Filled<Song>>();
watchAsync(
	() => [route.params.songType, route.params.songId],
	async ([songType, songId]) => {
		if (!songType || !songId) return;

		const $song = await musicPlayer.services.getSong(
			route.params.songType as SongType,
			route.params.songId as string,
		);

		if (!$song) return;
		song.value = filledSong($song);
	},
	{ immediate: true },
);

const isSingle = computed(() => !!song.value?.album?.includes("- Single"));

const editSongButton = useTemplateRef("edit-song");
watch(
	[song, editSongButton],
	([song, button]) => {
		if (song && button && route.hash === "#edit") {
			button.$el.click();
		}
	},
	{ immediate: true },
);

async function editSong(event: SongEditEvent): Promise<void> {
	if (!song.value) return;

	songMetadata.setMetadata(song.value.id, event);

	const refreshed = await musicPlayer.services.refreshSong(song.value);
	song.value = refreshed && filledSong(refreshed);
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

			<h2>
				<template v-for="(artist, i) in song.artists">
					<template v-if="i > 0">&nbsp;&&nbsp;</template>

					<RouterLink
						v-if="'id' in artist"
						:key="artist.id"
						class="artist"
						role="link"
						aria-roledescription="Go to artist"
						:to="`/library/artists/${artist.type}/${artist.id}`"
					>
						{{ artist.title }}
					</RouterLink>
					<p v-else :key="i" class="artist">
						{{ artist.title }}
					</p>
				</template>
			</h2>

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

		& .wrapping {
			mask-image: linear-gradient(to right, transparent, black 10% 90%, transparent);
		}

		margin-top: 0;
		margin-bottom: 0.25rem;

		--marquee-duration: 20s;
		--marquee-align: center;
	}

	& > .album {
		display: block;
	}

	& > h2 {
		margin: 0;
		& > .artist {
			display: inline-block;
		}
	}

	& > h2 > .artist,
	& > .album {
		color: var(--ion-color-dark-rgb);

		width: max-content;

		margin-top: 0;
		margin-bottom: 10px;
		margin-inline: auto;
	}

	& > h2 > a.artist,
	& > .album {
		text-decoration: none;
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
