<template>
	<ion-page>
		<AppHeader :showToolbar="!isSearching">
			<template #toolbar>
				<ion-title>Search</ion-title>
			</template>

			<template #trailing>
				<ion-toolbar>
					<ion-searchbar
						id="searchbar"
						:class="{ searching: isSearching }"
						:debounce="150"
						v-model="search"
						cancel-button-text="Cancel"
						show-cancel-button="focus"
						inputmode="search"
						enterkeyhint="search"
						@ion-focus="isSearching = true"
						@ion-cancel="isSearching = false"
						@ion-blur="!search && (isSearching = false)"
						@ion-input="updateSearchHints"
						@keyup.enter="searchFor($event.target.value)"
					/>

					<ion-progress-bar v-if="isLoading" type="indeterminate" />
				</ion-toolbar>
			</template>
		</AppHeader>

		<ion-content :fullscreen="true">
			<ion-list id="search-suggestions" v-if="isSearching && searchSuggestions.length">
				<ion-item
					button
					class="search-suggestion"
					v-for="suggestion in searchSuggestions"
					:key="suggestion"
					@click="searchFor(suggestion)"
				>
					<ion-icon :icon="searchIcon" />
					<ion-label>
						{{ suggestion }}
					</ion-label>
				</ion-item>
			</ion-list>

			<ion-list v-if="!isSearching && search" id="search-results">
				<ion-list>
					<SongSearchResultItem
						v-for="searchResult of searchResults"
						:key="getUniqueObjectId(searchResult)"
						:search-result
					/>
				</ion-list>
			</ion-list>
		</ion-content>

		<AppFooter />
	</ion-page>
</template>

<script setup lang="ts">
import {
	IonContent,
	IonIcon,
	IonItem,
	IonLabel,
	IonList,
	IonPage,
	IonProgressBar,
	IonSearchbar,
	IonTitle,
	IonToolbar,
} from "@ionic/vue";
import { search as searchIcon } from "ionicons/icons";
import { ref } from "vue";

import type { SongSearchResult } from "@/services/MusicPlayer/MusicPlayerService";
import { useMusicPlayer } from "@/stores/music-player";

import AppFooter from "@/components/AppFooter.vue";
import AppHeader from "@/components/AppHeader.vue";

import SongSearchResultItem from "./components/SongSearchResultItem.vue";

import { getUniqueObjectId } from "@/utils/vue";

const musicPlayer = useMusicPlayer();
const search = ref("");
const isSearching = ref(false);
const searchSuggestions = ref<string[]>([]);

const searchResults = ref<SongSearchResult[]>([]);
const isLoading = ref(false);

async function updateSearchHints(): Promise<void> {
	searchSuggestions.value = await musicPlayer.searchHints(search.value);
}

async function searchFor(term: string): Promise<void> {
	isLoading.value = true;
	search.value = term;
	isSearching.value = false;
	await updateSearchResults();
	isLoading.value = false;
}

async function updateSearchResults(): Promise<void> {
	searchResults.value = await musicPlayer.searchSongs(search.value);
}
</script>

<style scoped>
#search-suggestions {
	.search-suggestion {
		& > ion-icon {
			font-size: 1.25em;
			color: white;
			margin-right: 8px;
		}
	}
}
</style>
