<script setup lang="ts">
import {
	InfiniteScrollCustomEvent,
	IonIcon,
	IonInfiniteScroll,
	IonInfiniteScrollContent,
	IonItem,
	IonLabel,
	IonList,
	IonSearchbar,
	IonToolbar,
	useIonRouter,
} from "@ionic/vue";
import { watchDebounced } from "@vueuse/core";
import {
	addOutline as addIcon,
	hourglassOutline as hourglassIcon,
	playOutline as playIcon,
	search as searchIcon,
} from "ionicons/icons";
import { ref } from "vue";

import { SongPreview, useMusicPlayer } from "@/stores/music-player";

import AppPage from "@/components/AppPage.vue";
import GenericSongItem from "@/components/GenericSongItem.vue";
import SkeletonItem from "@/components/SkeletonItem.vue";

const musicPlayer = useMusicPlayer();

const searchTerm = ref("");
const searchSuggestions = ref<string[]>([]);
const searchResults = ref<SongPreview[]>([]);

const offset = ref(0);
const searched = ref(false);
const isLoading = ref(false);

watchDebounced(
	searchTerm,
	async (searchTerm) => {
		searchSuggestions.value = await musicPlayer.services.searchHints(searchTerm);
	},
	{ debounce: 150, maxWait: 500 },
);

async function fetchResults(term: string, offset: number, signal: AbortSignal): Promise<void> {
	for await (const result of musicPlayer.services.searchSongs(term, offset, { signal })) {
		searchResults.value.push(result);
	}
}

let controller = new AbortController();
async function searchFor(term: string): Promise<void> {
	// Hide keyboard on mobile after searching
	const { activeElement } = document;
	if (activeElement instanceof HTMLElement) {
		activeElement.blur();
	}

	if (!term) return;

	searchTerm.value = term;

	isLoading.value = true;
	searchResults.value = [];
	offset.value = 0;
	controller.abort();
	controller = new AbortController();
	await fetchResults(term, 0, controller.signal);

	isLoading.value = false;
	searched.value = true;
}

async function loadMoreContent(event: InfiniteScrollCustomEvent): Promise<void> {
	await fetchResults(searchTerm.value, ++offset.value, controller.signal);
	await event.target.complete();
}

async function playNow(searchResult: SongPreview): Promise<void> {
	const song = await musicPlayer.services.getSongFromPreview(searchResult);
	await musicPlayer.state.addToQueue(song, musicPlayer.state.queueIndex);
}

async function playNext(searchResult: SongPreview): Promise<void> {
	const song = await musicPlayer.services.getSongFromPreview(searchResult);
	await musicPlayer.state.addToQueue(song, musicPlayer.state.queueIndex + 1);
}

async function addToQueue(searchResult: SongPreview): Promise<void> {
	const song = await musicPlayer.services.getSongFromPreview(searchResult);
	await musicPlayer.state.addToQueue(song);
}

const router = useIonRouter();
function goToSong(searchResult: SongPreview): void {
	if (!searchResult) return;
	router.push(`/library/songs/${searchResult.type}/${searchResult.id}`);
}
</script>

<template>
	<AppPage title="Search">
		<template #header-trailing>
			<ion-toolbar class="searchbar">
				<ion-searchbar
					:debounce="50"
					v-model="searchTerm"
					cancel-button-text="Cancel"
					show-cancel-button="focus"
					inputmode="search"
					enterkeyhint="search"
					@ion-input="searched = false"
					@keydown.enter="searchFor(searchTerm)"
				/>
			</ion-toolbar>
		</template>

		<div>
			<ion-list v-if="!(searched || isLoading)" id="search-suggestions">
				<ion-item
					button
					class="search-suggestion"
					v-for="suggestion in searchSuggestions"
					:key="suggestion"
					@click="searchFor(suggestion)"
					lines="full"
				>
					<ion-icon slot="start" :icon="searchIcon" />
					<ion-label>
						{{ suggestion }}
					</ion-label>
				</ion-item>
			</ion-list>

			<ion-list v-else id="search-song-items">
				<GenericSongItem
					v-for="(searchResult, i) of searchResults"
					:key="i"
					:title="searchResult.title"
					:artists="searchResult.artists"
					:artwork="searchResult.artwork"
					:type="searchResult.type"
					@item-click="playNow(searchResult)"
					@context-menu-click="goToSong(searchResult)"
				>
					<template #options>
						<ion-item :button="true" :detail="false" @click="playNow(searchResult)">
							<ion-icon aria-hidden="true" :icon="playIcon" slot="end" />
							Play now
						</ion-item>

						<ion-item :button="true" :detail="false" @click="playNext(searchResult)">
							<ion-icon aria-hidden="true" :icon="hourglassIcon" slot="end" />
							Play next
						</ion-item>

						<ion-item :button="true" :detail="false" @click="addToQueue(searchResult)">
							<ion-icon aria-hidden="true" :icon="addIcon" slot="end" />
							Add to queue
						</ion-item>
					</template>
				</GenericSongItem>
			</ion-list>
			<ion-list v-if="isLoading && searchResults.length < 25">
				<SkeletonItem v-for="i in 25 - searchResults.length" :key="i + searchResults.length" />
			</ion-list>

			<ion-infinite-scroll v-if="searchTerm" @ion-infinite="loadMoreContent">
				<ion-infinite-scroll-content loading-spinner="dots" />
			</ion-infinite-scroll>
		</div>
	</AppPage>
</template>

<style global>
ion-header:not(#search) {
	& > ion-toolbar {
		--border-color: transparent;
	}
}
</style>

<style scoped>
.searchbar {
	transition: opacity, height, 150ms;
	opacity: var(--opacity-scale);
	height: calc(var(--min-height) + 8px);
	transform-origin: top center;
	transform: scaleY(var(--opacity-scale));
}

.header-collapse-condense-inactive > .searchbar {
	height: 0;
}

:not(.header-collapse-condense-inactive) > .searchbar {
	ion-searchbar {
		& ion-icon {
			font-size: 0.1em;
		}
	}
}

#search-suggestions {
	& > .search-suggestion {
		& ion-icon {
			font-size: 1.1em;
		}
	}
}
</style>
