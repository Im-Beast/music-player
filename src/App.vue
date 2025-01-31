<template>
	<ion-app>
		<ion-tabs>
			<ion-router-outlet></ion-router-outlet>

			<ion-tab-bar slot="bottom">
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
		</ion-tabs>
	</ion-app>
</template>

<script setup lang="ts">
import {
	IonApp,
	IonRouterOutlet,
	IonTabs,
	IonTabBar,
	IonTabButton,
	IonIcon,
	IonLabel,
} from "@ionic/vue";
import { search as searchIcon, home as homeIcon, library as libraryIcon } from "ionicons/icons";
import { useMusicKit } from "./stores/musickit";

// Initialize MusicKit store to initialize authorization service
useMusicKit();
</script>
