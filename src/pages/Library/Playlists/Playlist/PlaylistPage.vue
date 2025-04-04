<script lang="ts" setup>
import { computed } from "vue";

import AppPage from "@/components/AppPage.vue";
import GenericSongItem from "@/components/GenericSongItem.vue";
import LocalImg from "@/components/LocalImg.vue";
import PlaylistEditModal, { PlaylistEditEvent } from "../components/PlaylistEditModal.vue";

import {
	ActionSheetButton,
	IonActionSheet,
	IonButton,
	IonButtons,
	IonIcon,
	IonItem,
	IonList,
	IonNote,
	useIonRouter,
} from "@ionic/vue";
import {
	listOutline as addSongToQueueIcon,
	trashOutline as deleteIcon,
	pencil as editIcon,
	play as playIcon,
	playOutline as playSongNextIcon,
} from "ionicons/icons";

import { AnySong, useMusicPlayer } from "@/stores/music-player";
import { useRoute } from "vue-router";

const musicPlayer = useMusicPlayer();
const route = useRoute();

const playlist = computed(() => musicPlayer.state.getPlaylist(route.params.id as string));
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
	musicPlayer.state.setQueue(playlist.value!.songs);
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

async function playSong(song: AnySong): Promise<void> {
	await musicPlayer.state.addToQueue(song, musicPlayer.state.queueIndex);
}

async function playSongNext(song: AnySong): Promise<void> {
	await musicPlayer.state.addToQueue(song, musicPlayer.state.queueIndex + 1);
}

async function addSongToQueue(song: AnySong): Promise<void> {
	await musicPlayer.state.addToQueue(song);
}

function goToSong(song: AnySong): void {
	router.push(`/library/songs/${song.type}/${song.id}`);
}
</script>

<template>
	<AppPage back-button="Playlists">
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
			<h1>{{ playlist?.title }}</h1>

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

	& > h1 {
		font-weight: bold;
		margin-top: 0;
		margin-bottom: 0.25rem;
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

	& > .song-img {
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
