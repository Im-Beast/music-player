<template>
	<ion-page>
		<AppHeader>
			<template #toolbar>
				<ion-buttons slot="start">
					<ion-back-button text="Library" />
				</ion-buttons>

				<ion-title>Playlists</ion-title>

				<ion-buttons slot="end">
					<!-- TODO: Better importing, for example we can access MusicKit playlists and show it to the user, also we can let user choose the platform instead of blindly guessing -->
					<ion-button id="import-playlist">
						<ion-icon slot="icon-only" :icon="importIcon" />
					</ion-button>
					<ion-button id="add-playlist">
						<ion-icon slot="icon-only" :icon="addIcon" />
					</ion-button>
				</ion-buttons>
			</template>
		</AppHeader>

		<PlaylistImportModal trigger="import-playlist" />
		<PlaylistAddModal trigger="add-playlist" />

		<ion-content :fullscreen="true">
			<ion-list id="playlists-content">
				<ion-item
					v-for="playlist in musicPlayer.playlists"
					:key="playlist.id"
					:router-link="`/library/playlists/${playlist.id}`"
				>
					<!-- A nicer fallback if playlist has no artwork -->
					<ion-thumbnail slot="start">
						<SongImg :src="playlist.artwork" :alt="`Artwork for playlist '${playlist.title}'`" />
					</ion-thumbnail>

					<ion-label class="ion-text-nowrap">
						<h2>{{ playlist.title }}</h2>
					</ion-label>
				</ion-item>
			</ion-list>
		</ion-content>

		<AppFooter />
	</ion-page>
</template>

<script lang="ts" setup>
import AppFooter from "@/components/AppFooter.vue";
import AppHeader from "@/components/AppHeader.vue";
import SongImg from "@/components/SongImg.vue";

import {
	IonBackButton,
	IonButton,
	IonButtons,
	IonContent,
	IonIcon,
	IonItem,
	IonLabel,
	IonList,
	IonPage,
	IonThumbnail,
	IonTitle,
} from "@ionic/vue";
import { add as addIcon, downloadOutline as importIcon } from "ionicons/icons";

import { useMusicPlayer } from "@/stores/music-player";

import PlaylistAddModal from "./components/PlaylistAddModal.vue";
import PlaylistImportModal from "./components/PlaylistImportModal.vue";

const musicPlayer = useMusicPlayer();
</script>

<style>
/**  TODO: Clean up CSS in playlist routes */

#playlists-content {
	background: transparent;
	& > ion-item {
		--background: transparent;
		min-height: 60px;

		& > ion-thumbnail > .song-img {
			border-radius: 8px;
		}
	}
}

#playlist-add-modal-content {
	& > ion-list {
		background: transparent;
		& > ion-item {
			--background: transparent;

			& > ion-input {
				font-weight: 600;
				font-size: 1.25rem;
				text-align: center;
			}
		}
	}
}
</style>
