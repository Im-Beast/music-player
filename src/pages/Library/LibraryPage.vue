<template>
	<ion-page>
		<AppHeader>
			<template #toolbar>
				<ion-title>Library</ion-title>
			</template>
		</AppHeader>

		<ion-content :fullscreen="true">
			<ion-item router-link="/library/playlists">
				<ion-icon color="primary" :icon="playlistsIcon" class="padded-icon" size="large" slot="start" />
				<ion-label>Playlists</ion-label>
			</ion-item>

			<ion-item router-link="/library/albums">
				<ion-icon color="primary" :icon="albumsIcon" class="padded-icon" size="large" slot="start" />
				<ion-label>Albums</ion-label>
			</ion-item>

			<ion-item router-link="/library/songs">
				<ion-icon color="primary" :icon="songsIcon" class="padded-icon" size="large" slot="start" />
				<ion-label>Songs</ion-label>
			</ion-item>
		</ion-content>

		<AppFooter />
	</ion-page>
</template>

<script setup lang="ts">
import AppFooter from "@/components/AppFooter.vue";
import AppHeader from "@/components/AppHeader.vue";

import { IonContent, IonIcon, IonItem, IonLabel, IonPage, IonTitle } from "@ionic/vue";
import {
	albumsOutline as albumsIcon,
	musicalNotesOutline as playlistsIcon,
	musicalNoteOutline as songsIcon,
} from "ionicons/icons";
</script>

<style>
.padded-icon {
	padding: 4px;
}
</style>
