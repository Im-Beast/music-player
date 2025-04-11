<script lang="ts" setup>
import MiniMusicPlayer from "@/components/MiniMusicPlayer.vue";
import MusicPlayer from "@/components/MusicPlayer.vue";
import {
	IonApp,
	IonIcon,
	IonLabel,
	IonRouterOutlet,
	IonTabBar,
	IonTabButton,
	IonTabs,
} from "@ionic/vue";
import { home as homeIcon, library as libraryIcon, search as searchIcon } from "ionicons/icons";
</script>

<template>
	<ion-app>
		<ion-tabs>
			<ion-router-outlet />

			<div slot="bottom">
				<MusicPlayer />
				<MiniMusicPlayer />

				<ion-tab-bar>
					<ion-tab-button tab="home" href="/home">
						<ion-icon aria-hidden="true" :icon="homeIcon" />
						<ion-label>Home</ion-label>
					</ion-tab-button>

					<ion-tab-button tab="search" href="/search">
						<ion-icon aria-hidden="true" :icon="searchIcon" />
						<ion-label>Search</ion-label>
					</ion-tab-button>

					<ion-tab-button tab="library" href="/library">
						<ion-icon aria-hidden="true" :icon="libraryIcon" />
						<ion-label>Library</ion-label>
					</ion-tab-button>
				</ion-tab-bar>
			</div>
		</ion-tabs>
	</ion-app>
</template>

<style scoped>
/** Fix for ion-router-outlet becoming too short while modal with presenting-element is opened */
ion-tabs:has(~ ion-modal[id^="ion-overlay"]) {
	& > ion-router-outlet {
		height: 100vh;
	}
}

@keyframes fade-in {
	from {
		opacity: 0%;
	}

	40% {
		opacity: 0%;
	}

	to {
		opacity: 100%;
	}
}

ion-app {
	animation: fade-in 400ms forwards;
}
</style>
