<script lang="ts" setup>
import { storeToRefs } from "pinia";
import { computed, ref } from "vue";

import {
	IonButton,
	IonButtons,
	IonIcon,
	IonItem,
	IonLabel,
	IonNote,
	useIonRouter,
} from "@ionic/vue";
import {
	pause as pauseIcon,
	play as playIcon,
	playSkipForward as skipNextIcon,
	playSkipBack as skipPreviousIcon,
} from "ionicons/icons";

import ContextMenu from "@/components/ContextMenu.vue";
import LocalImg from "@/components/LocalImg.vue";

import { useMusicPlayer } from "@/stores/music-player";

import { filledArtistPreview } from "@/services/Music/objects";
import { formatArtists } from "@/utils/songs";
import { useWillKeyboard } from "@/utils/vue";

const { willBeOpen: keyboardOpen } = useWillKeyboard();

const router = useIonRouter();

const musicPlayer = useMusicPlayer();
const state = musicPlayer.state;
const { currentSong, playing } = storeToRefs(state);

const formattedArtists = computed(() =>
	formatArtists(currentSong.value?.artists?.map(filledArtistPreview)),
);

const contextMenuOpen = ref(false);

async function openModal(): Promise<void> {
	const modal = document.querySelector<HTMLIonModalElement>("#music-player");
	await modal?.present();
}

function goToSong(): void {
	const song = currentSong.value;
	if (!song) return;
	router.push(`/library/songs/${song.type}/${song.id}`);
}
</script>

<template>
	<ContextMenu @visibilitychange="contextMenuOpen = $event">
		<ion-item
			button
			:detail="contextMenuOpen"
			v-if="currentSong"
			id="mini-music-player"
			:class="{ hidden: keyboardOpen }"
			:aria-hidden="keyboardOpen"
			@click="contextMenuOpen ? goToSong() : openModal()"
		>
			<LocalImg
				:src="currentSong.artwork"
				slot="start"
				:alt="`Artwork for song '${currentSong.title}' by ${formattedArtists}`"
			/>

			<ion-label>
				<h1>{{ currentSong.title ?? "Unknown title" }}</h1>
				<ion-note>
					<p>
						{{ formattedArtists }}
					</p>
				</ion-note>
			</ion-label>

			<ion-buttons slot="end">
				<ion-button>
					<ion-icon
						color="dark"
						:icon="skipPreviousIcon"
						slot="icon-only"
						@click.stop="musicPlayer.skipPrevious"
						:disabled="!musicPlayer.hasPrevious || state.loading.queueChange"
					/>
				</ion-button>

				<ion-button @click.stop="musicPlayer.togglePlay" :disabled="state.loading.playPause">
					<ion-icon color="dark" v-if="playing" :icon="pauseIcon" slot="icon-only" />
					<ion-icon color="dark" v-else :icon="playIcon" slot="icon-only" />
				</ion-button>

				<ion-button
					@click.stop="musicPlayer.skipNext"
					:disabled="!musicPlayer.hasNext || state.loading.queueChange"
				>
					<ion-icon color="dark" :icon="skipNextIcon" slot="icon-only" />
				</ion-button>
			</ion-buttons>
		</ion-item>
	</ContextMenu>
</template>

<style>
ion-tab-bar {
	--border: none;

	border-radius: 12px 12px 0 0;

	@supports (backdrop-filter: blur(12px)) {
		--background: rgba(var(--ion-color-light-rgb), 80%);
		backdrop-filter: blur(12px);
	}
	@supports not (backdrop-filter: blur(12px)) {
		--background: var(--ion-color-light);
	}

	padding-top: 0;

	ion-tab-button {
		--background: transparent;
	}
}
</style>

<style scoped>
.context-menu:not(.closed) #mini-music-player {
	top: 0;
	width: 100%;
	margin: 0;

	--background: var(--context-menu-item-background);
	box-shadow: none;

	border-radius: 24px;
	--border-color: transparent;

	--padding-top: 12px;
	--padding-bottom: 12px;
	--padding-start: 12px;
	--padding-end: 12px;

	& > .local-img {
		transition: var(--context-menu-transition);

		--img-border-radius: 12px;
		--img-width: 96px;
		--img-height: auto;
	}

	& > [slot="end"] {
		display: none;
	}

	& > ion-label {
		height: max-content;
		white-space: normal;

		& h1 {
			font-size: 1.2rem;
			font-weight: 550;
			line-height: 1;

			@supports (line-clamp: 2) {
				line-clamp: 2;
			}

			@supports not (line-clamp: 2) {
				max-height: 2em;
				overflow: hidden;
				text-overflow: ellipsis;
			}
		}

		& > ion-note {
			margin-top: 1em;
			flex-direction: column;
			align-items: start;

			& > p {
				align-items: start;
				font-size: 1.1em;
			}
		}
	}
}

@keyframes item-show-shadow {
	from {
		box-shadow: 0 0 0px rgba(0, 0, 0, 0);
	}

	to {
		box-shadow: 0 0 12px rgba(0, 0, 0, 0.2);
	}
}

.context-item-container #mini-music-player {
	animation: item-show-shadow 450ms linear forwards;
}

.context-menu.closed #mini-music-player,
.context-item-container #mini-music-player {
	--border-color: transparent;

	--padding-top: 4px;
	--padding-bottom: 4px;
	--padding-start: 8px;
	--padding-end: 8px;
	--inner-padding-end: 0px;

	margin-inline: 5%;
	width: 90%;
	border-radius: 16px;
	z-index: 20;

	&.hidden {
		pointer-events: none;
		visibility: hidden;
	}

	& > .local-img {
		pointer-events: none;

		--img-border-radius: 8px;
		--img-width: auto;
		--img-height: 42px;
	}

	& > ion-label {
		& > h1 {
			font-size: 1em;
			font-weight: 550;
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
		}

		& > ion-note {
			display: none;
		}
	}

	&::part(native) {
		--background: var(--ion-background-color-step-100, #fff);
		@supports (backdrop-filter: blur(12px)) {
			--background: color-mix(in srgb, var(--ion-background-color-step-100, #fff) 80%, transparent);
			backdrop-filter: blur(12px);
		}
	}
}
</style>
