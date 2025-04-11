<script lang="ts" setup>
import LocalImg from "@/components/LocalImg.vue";

import {
	IonButton,
	IonButtons,
	IonIcon,
	IonItem,
	IonLabel,
	IonList,
	IonThumbnail,
} from "@ionic/vue";
import { add as addIcon, downloadOutline as importIcon } from "ionicons/icons";

import { useMusicPlayer } from "@/stores/music-player";

import AppPage from "@/components/AppPage.vue";
import PlaylistAddModal from "./components/PlaylistAddModal.vue";
import PlaylistImportModal from "./components/PlaylistImportModal.vue";

const musicPlayer = useMusicPlayer();
</script>

<template>
	<AppPage title="Playlists" back-button="Library">
		<template #toolbar-end>
			<ion-buttons>
				<ion-button id="import-playlist">
					<ion-icon slot="icon-only" :icon="importIcon" />
				</ion-button>
				<ion-button id="add-playlist">
					<ion-icon slot="icon-only" :icon="addIcon" />
				</ion-button>
			</ion-buttons>
		</template>

		<PlaylistImportModal trigger="import-playlist" />
		<PlaylistAddModal trigger="add-playlist" />

		<ion-list id="playlists-content">
			<ion-item
				v-for="playlist in musicPlayer.state.playlists"
				:key="playlist.id"
				:router-link="`/library/playlists/${playlist.id}`"
			>
				<ion-thumbnail slot="start">
					<LocalImg :src="playlist.artwork" :alt="`Artwork for playlist '${playlist.title}'`" />
				</ion-thumbnail>

				<ion-label class="ion-text-nowrap">
					<h2>{{ playlist.title }}</h2>
				</ion-label>
			</ion-item>
		</ion-list>
	</AppPage>
</template>

<style>
/**  TODO: Clean up CSS in playlist routes */

#playlists-content {
	background: transparent;
	& > ion-item {
		--background: transparent;
		min-height: 60px;

		& > ion-thumbnail {
			display: flex;
			align-items: center;

			& > .local-img {
				border-radius: 8px;
			}
		}
	}
}
</style>
