<template>
	<ion-page>
		<AppHeader>
			<template #toolbar>
				<ion-buttons slot="start">
					<ion-back-button text="Library" />
				</ion-buttons>

				<ion-title>Playlist</ion-title>

				<ion-buttons slot="end">
					<ion-button id="edit-playlist">
						<ion-icon slot="icon-only" :icon="pencilIcon" />
					</ion-button>
					<ion-button id="delete-playlist">
						<ion-icon slot="icon-only" :icon="deleteIcon" />
					</ion-button>
				</ion-buttons>
			</template>
		</AppHeader>

		<ion-action-sheet
			trigger="delete-playlist"
			:header="`Are you sure you want to delete playlist ${playlist?.title}?`"
			:buttons="deleteActionSheetButtons"
			@didDismiss="onDeleteActionDismiss"
		/>
		<PlaylistEditModal v-if="playlist" :playlist trigger="edit-playlist" />

		<ion-content id="playlist-content" v-if="playlist" :fullscreen="true">
			<SongImg :src="playlist.artwork" />
			<h1>{{ playlist?.title }}</h1>

			<ion-note v-if="isEmpty">This playlist has no songs, fill it up!</ion-note>
			<template v-else>
				<h2>{{ playlist.songs.length }} songs, {{ Math.round(totalDuration / 60) }} minutes</h2>
				<ion-button strong @click="play">
					<ion-icon slot="start" :icon="playIcon" />
					Play
				</ion-button>

				<ion-list>
					<SongItem :song v-for="song in playlist.songs" :key="song.id" />
				</ion-list>
			</template>

			<!-- TODO: Maybe add a possibility to add songs from within this page -->
		</ion-content>

		<AppFooter />
	</ion-page>
</template>

<script lang="ts" setup>
import { computed } from "vue";

import AppFooter from "@/components/AppFooter.vue";
import AppHeader from "@/components/AppHeader.vue";
import SongImg from "@/components/SongImg.vue";
import SongItem from "@/components/SongItem.vue";
import PlaylistEditModal from "../components/PlaylistEditModal.vue";

import {
	ActionSheetButton,
	IonActionSheet,
	IonBackButton,
	IonButton,
	IonButtons,
	IonContent,
	IonIcon,
	IonList,
	IonNote,
	IonPage,
	IonTitle,
} from "@ionic/vue";
import { trashOutline as deleteIcon, pencil as pencilIcon, play as playIcon } from "ionicons/icons";

import router from "@/pages/router";
import { useMusicPlayer } from "@/stores/music-player";
import { useRoute } from "vue-router";

const musicPlayer = useMusicPlayer();
const route = useRoute();

const playlist = computed(() => musicPlayer.getPlaylist(route.params.id as string));
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
	musicPlayer.setQueue(playlist.value!.songs);
}

function onDeleteActionDismiss(event: CustomEvent): void {
	if (typeof event.detail !== "object" || !playlist.value) return;

	if (event.detail?.role === "destructive") {
		musicPlayer.removePlaylist(playlist.value.id);
		router.back();
	}
}
</script>

<style>
#playlist-content {
	text-align: center;

	& > h1 {
		font-weight: bold;
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
