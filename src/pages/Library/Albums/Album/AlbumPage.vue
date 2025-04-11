<script lang="ts" setup>
import { computedAsync } from "@vueuse/core";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
	IonButton,
	IonButtons,
	IonHeader,
	IonIcon,
	IonItem,
	IonList,
	IonTitle,
	IonToolbar,
} from "@ionic/vue";
import {
	ellipsisHorizontal as ellipsisIcon,
	play as playIcon,
	listOutline as playLastIcon,
	playOutline as playNextIcon,
	shuffle as shuffleIcon,
} from "ionicons/icons";

import AppPage from "@/components/AppPage.vue";
import ContextMenu from "@/components/ContextMenu.vue";
import LocalImg from "@/components/LocalImg.vue";
import WrappingMarquee from "@/components/WrappingMarquee.vue";

import { AlbumSong, Filled, filledAlbum, SongType } from "@/services/Music/objects";
import { useMusicPlayer } from "@/stores/music-player";
import AlbumDiscItem from "../components/AlbumDiscSong.vue";

const musicPlayer = useMusicPlayer();
const router = useRouter();
const route = useRoute();

const previousRouteName = computed(() => {
	const { state } = router.options.history;
	if (!("back" in state)) return "Albums";
	return String(router.resolve(state.back as any)?.name);
});

const album = computedAsync(
	async () => {
		const { albumType, albumId, songType, songId } = route.params;

		if (songType) {
			const song = await musicPlayer.services.getSong(songType as SongType, songId as string);
			const album = song && (await musicPlayer.services.getSongsAlbum(song));
			return album && filledAlbum(album);
		}

		const album = await musicPlayer.services.getAlbum(albumType as SongType, albumId as string);
		const filled = album && filledAlbum(album);
		return filled;
	},
	undefined,
	{
		onError(error) {
			console.error(error);
			throw error;
		},
	},
);

const groupedSongs = computed(() => {
	const songs = album.value?.songs;
	if (!songs) return;

	return Map.groupBy(songs, ({ discNumber }) => discNumber ?? 0);
});

async function playAlbum(shuffle = false): Promise<void> {
	if (!album.value) return;
	const songs = await musicPlayer.services.getAvailableSongs(
		album.value.songs.map(({ song }) => song),
	);

	console.log("Album songs:", album.value.songs);
	console.log("Set songs:", songs);

	musicPlayer.state.setQueue(songs);

	if (shuffle) {
		musicPlayer.state.shuffleQueue();
	}

	musicPlayer.state.queueIndex = 0;
}

async function playDisc(albumSongs: Filled<AlbumSong[]>): Promise<void> {
	const songs = await musicPlayer.services.getAvailableSongs(albumSongs.map(({ song }) => song));
	musicPlayer.state.setQueue(songs);
	musicPlayer.state.queueIndex = 0;
}

async function addAlbumToQueue(position: "next" | "last"): Promise<void> {
	if (!album.value) return;

	const songs = await musicPlayer.services.getAvailableSongs(
		album.value.songs.map(({ song }) => song),
	);

	await musicPlayer.state.insertIntoQueue(
		songs,
		position === "next" ? musicPlayer.state.queueIndex + 1 : undefined,
	);
}
</script>

<template>
	<AppPage :title="album?.title" :show-content-header="false" :back-button="previousRouteName">
		<template #toolbar-end>
			<ion-buttons id="album-actions">
				<ContextMenu event="click" :move="false" y="top" x="right" :backdrop="false" :haptics="false">
					<ion-button>
						<ion-icon slot="icon-only" :icon="ellipsisIcon" />
					</ion-button>

					<template #options>
						<ion-item
							aria-label="Play next"
							lines="full"
							button
							:detail="false"
							@click="addAlbumToQueue('next')"
						>
							Play next
							<ion-icon aria-hidden="true" :icon="playNextIcon" slot="end" />
						</ion-item>

						<ion-item
							aria-label="Play next"
							lines="full"
							button
							:detail="false"
							@click="addAlbumToQueue('last')"
						>
							Play last
							<ion-icon aria-hidden="true" :icon="playLastIcon" slot="end" />
						</ion-item>
					</template>
				</ContextMenu>
			</ion-buttons>
		</template>

		<div id="album-content" v-if="album">
			<LocalImg :src="album.artwork" />

			<ion-header collapse="condense">
				<ion-toolbar>
					<ion-title class="ion-text-nowrap" size="large">
						<WrappingMarquee :text="album.title" />
					</ion-title>
				</ion-toolbar>
			</ion-header>

			<h2>
				<a
					class="artist"
					role="link"
					aria-roledescription="Go to artist"
					v-for="artist in album.artists"
					:key="artist.id"
				>
					{{ artist.title }}
				</a>
			</h2>

			<div class="buttons">
				<ion-button strong @click="playAlbum(false)">
					<ion-icon slot="start" :icon="playIcon" />
					Play
				</ion-button>

				<ion-button strong @click="playAlbum(true)">
					<ion-icon slot="start" :icon="shuffleIcon" />
					Shuffle
				</ion-button>
			</div>

			<ion-list v-if="groupedSongs">
				<template v-for="[discNumber, albumSongs] in groupedSongs.entries()" :key="discNumber">
					<ion-item
						class="disc-header"
						lines="none"
						button
						:detail="false"
						v-if="groupedSongs.size > 1"
						@click="playDisc(albumSongs)"
					>
						Disc {{ discNumber }}
					</ion-item>

					<AlbumDiscItem v-for="albumSong in albumSongs" :key="albumSong.song.id" :albumSong :album />
				</template>
			</ion-list>
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

#album-actions {
	:global(& .context-menu) {
		padding-inline: 8px;
	}

	:global(& .context-menu-list) {
		box-shadow: 0 0 16px #0003;
		overflow: visible;
	}

	:global(& .context-menu-list > ion-item) {
		--background: var(--ion-background-color-step-100, #fff);
	}
}

#album-content {
	text-align: center;

	animation: fade-in 350ms;

	& > ion-header {
		mask-image: linear-gradient(to right, transparent, black 10% 90%, transparent);
		width: max-content;
		max-width: 100%;
		margin-inline: auto;

		& ion-title {
			transform-origin: top center;

			font-weight: bold;
			margin: 0;

			--marquee-duration: 20s;
			--marquee-align: center;
		}
	}

	& > h2 {
		font-size: 1.25rem;
		font-weight: 550;

		margin-top: 0;
		margin-inline: auto;

		& > a {
			cursor: pointer;
			color: var(--ion-color-dark-rgb);

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
	}

	& > .buttons {
		display: flex;
		width: 100%;
		align-items: center;
		justify-content: center;
		gap: 8px;

		padding-bottom: 1rem;
		border-bottom: 0.55px solid
			var(--ion-color-step-250, var(--ion-background-color-step-250, #c8c7cc));

		& > ion-button {
			width: calc(40%);
		}
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
	}

	& > ion-list {
		& > .disc-header {
			font-weight: 550;
		}
	}
}
</style>
