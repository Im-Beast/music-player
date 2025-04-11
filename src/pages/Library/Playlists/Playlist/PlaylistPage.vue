<script lang="ts" setup>
import { computed } from "vue";

import AppPage from "@/components/AppPage.vue";
import GenericSongItem from "@/components/GenericSongItem.vue";
import LocalImg from "@/components/LocalImg.vue";
import WrappingMarquee from "@/components/WrappingMarquee.vue";
import PlaylistEditModal, { PlaylistEditEvent } from "../components/PlaylistEditModal.vue";

import {
	ActionSheetButton,
	IonActionSheet,
	IonButton,
	IonButtons,
	IonHeader,
	IonIcon,
	IonItem,
	IonList,
	IonNote,
	IonTitle,
	IonToolbar,
	useIonRouter,
} from "@ionic/vue";
import {
	listOutline as addSongToQueueIcon,
	trashOutline as deleteIcon,
	pencil as editIcon,
	play as playIcon,
	playOutline as playSongNextIcon,
} from "ionicons/icons";

import { filledPlaylist, Song } from "@/services/Music/objects";
import { useMusicPlayer } from "@/stores/music-player";
import { useRoute } from "vue-router";

const musicPlayer = useMusicPlayer();
const route = useRoute();

const playlist = computed(() => {
	const playlist = musicPlayer.state.getPlaylist(route.params.id as string);
	return playlist && filledPlaylist(playlist);
});
const isEmpty = computed(() => !playlist.value?.songs.length);
const totalDuration = computed(() => {
	const songs = playlist?.value?.songs ?? [];
	return songs.reduce((p, n) => p + (n.duration ?? 0), 0);
});

const deleteActionSheetButtons: ActionSheetButton[] = [
	{ text: "Delete", role: "destructive" },
	{ text: "Cancel", role: "cancel" },
];

function play(): void {
	musicPlayer.state.setQueue(playlist.value!.songs.filter((song) => song.available));
	musicPlayer.state.queueIndex = 0;
}

function editPlaylist(event: PlaylistEditEvent): void {
	if (!playlist.value) return;
	playlist.value.title = event.title;
	playlist.value.artwork = event.artwork;
}

function onDeleteActionDismiss(event: CustomEvent): void {
	if (typeof event.detail !== "object" || !playlist.value) return;

	if (event.detail?.role === "destructive") {
		musicPlayer.state.removePlaylist(playlist.value.id);
		router.back();
	}
}

const router = useIonRouter();

async function playSong(song: Song): Promise<void> {
	await musicPlayer.state.addToQueue(song, musicPlayer.state.queueIndex);
}

async function playSongNext(song: Song): Promise<void> {
	await musicPlayer.state.addToQueue(song, musicPlayer.state.queueIndex + 1);
}

async function addSongToQueue(song: Song): Promise<void> {
	await musicPlayer.state.addToQueue(song);
}

function goToSong(song: Song): void {
	router.push(`/library/songs/${song.type}/${song.id}`);
}
</script>

<template>
	<AppPage :title="playlist?.title" :show-content-header="false" back-button="Playlists">
		<template #toolbar-end>
			<ion-buttons>
				<ion-button id="edit-playlist">
					<ion-icon slot="icon-only" :icon="editIcon" />
				</ion-button>
				<ion-button id="delete-playlist">
					<ion-icon slot="icon-only" :icon="deleteIcon" />
				</ion-button>
			</ion-buttons>
		</template>

		<ion-action-sheet
			trigger="delete-playlist"
			:header="`Are you sure you want to delete playlist ${playlist?.title}?`"
			:buttons="deleteActionSheetButtons"
			@didDismiss="onDeleteActionDismiss"
		/>

		<PlaylistEditModal v-if="playlist" :playlist trigger="edit-playlist" @change="editPlaylist" />

		<div id="playlist-content" v-if="playlist">
			<LocalImg :src="playlist.artwork" />

			<ion-header collapse="condense">
				<ion-toolbar>
					<ion-title class="ion-text-nowrap" size="large">
						<WrappingMarquee :text="playlist.title" />
					</ion-title>
				</ion-toolbar>
			</ion-header>

			<ion-note v-if="isEmpty">This playlist has no songs, fill it up!</ion-note>
			<template v-else>
				<h2>{{ playlist.songs.length }} songs, {{ Math.round(totalDuration / 60) }} minutes</h2>

				<ion-button strong @click="play">
					<ion-icon slot="start" :icon="playIcon" />
					Play
				</ion-button>

				<ion-list>
					<GenericSongItem
						v-for="song in playlist.songs"
						:disabled="!song.available"
						:key="song.id"
						:title="song.title"
						:artists="song.artists"
						:artwork="song.artwork"
						:type="song.type"
						@item-click="playSong(song)"
						@context-menu-click="goToSong(song)"
					>
						<template #options>
							<ion-item lines="full" button :detail="false" @click="playSongNext(song)">
								Play Next
								<ion-icon aria-hidden="true" :icon="playSongNextIcon" slot="end" />
							</ion-item>
							<ion-item lines="full" button :detail="false" @click="addSongToQueue(song)">
								Add to Queue
								<ion-icon aria-hidden="true" :icon="addSongToQueueIcon" slot="end" />
							</ion-item>
						</template>
					</GenericSongItem>
				</ion-list>
			</template>

			<!-- TODO: Maybe add a possibility to add songs from within this page -->
		</div>
	</AppPage>
</template>

<style>
#playlist-content {
	text-align: center;

	& > ion-header {
		width: max-content;
		max-width: 100%;
		margin-inline: auto;
		mask-image: linear-gradient(to right, transparent, black 10% 90%, transparent);

		& ion-title {
			transform-origin: top center;

			font-weight: bold;
			margin: 0;

			--marquee-duration: 20s;
			--marquee-align: center;
		}
	}

	& > h2 {
		font-size: 1rem;
		margin-top: 0;
	}

	& > ion-button {
		&::part(native) {
			width: 33%;
			margin-inline: auto;
		}

		width: 100%;
		padding-bottom: 1rem;
		border-bottom: 0.55px solid
			var(--ion-color-step-250, var(--ion-background-color-step-250, #c8c7cc));
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

	& > ion-list {
		width: 100%;
	}
}
</style>
