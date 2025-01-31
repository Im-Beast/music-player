<template>
	<div
		id="music-player-modal"
		v-if="currentSong"
		:style="{
			'--fg-color': currentSong.style.fgColor,
			'--bg-color': currentSong.style.bgColor,
			'--bg-gradient': currentSong.style.bgGradient,
		}"
	>
		<ion-content id="song" :scroll-y="showQueue">
			<!-- FIXME: Make artwork optional -->
			<!-- TODO: Marquee on overflow -->
			<div id="song-details" :class="{ compact: showQueue }">
				<song-img
					id="artwork"
					:src="currentSong.artwork"
					:alt="`Artwork for song '${currentSong.title}'`"
				/>

				<div id="song-info">
					<h1 id="title" class="ion-text-nowrap">
						{{ currentSong.title }}
					</h1>
					<h2 id="artist" class="ion-text-nowrap">
						{{ currentSong.artist }}
					</h2>
				</div>
			</div>

			<div v-if="showQueue" id="queue">
				<ion-list lines="none">
					<ion-item-divider sticky>
						<span ref="queueHeader">Queue</span>
					</ion-item-divider>
					<ion-reorder-group :disabled="false" @ion-item-reorder="reorderQueue">
						<ion-item
							v-for="(song, i) in queuedSongs"
							:key="getUniqueSongId(song)"
							button
							:detail="false"
							:class="{ current: i === queueIndex }"
							v-on-long-press.prevent="[(event) => handleHoldPopover(i, song, event), { delay: 300 }]"
							@contextmenu.prevent="createPopover(i, song, $event)"
							@click.self="queueIndex = i"
						>
							<ion-thumbnail slot="start">
								<song-img :src="song.artwork" :alt="`Artwork for song '${song.title}'`" />
							</ion-thumbnail>

							<ion-label class="ion-text-nowrap">
								<h2>{{ song.title }}</h2>
								<ion-note>
									{{ song.artist }}
								</ion-note>
							</ion-label>

							<ion-reorder slot="end" />
						</ion-item>
					</ion-reorder-group>
				</ion-list>
			</div>
		</ion-content>

		<div class="time-controls">
			<ion-range
				aria-label="Time"
				:min="0"
				:max="1"
				:step="0.001"
				:value="progress"
				@ion-change="progress = $event.detail.value as number"
			/>

			<div class="labels">
				<ion-label id="current-time">{{ secondsToMMSS(time) }}</ion-label>
				<ion-label id="source">
					{{ songTypeDisplayName(currentSong) }}
				</ion-label>
				<ion-label id="time-remaining">{{ secondsToMMSS(timeRemaining) }}</ion-label>
			</div>
		</div>

		<ion-buttons class="media-controls">
			<ion-button
				aria-label="Skip to previous song"
				size="large"
				:disabled="!hasPrevious"
				@click="musicPlayer.skipPrevious"
			>
				<ion-icon aria-hidden="true" :icon="skipPreviousIcon" slot="icon-only" />
			</ion-button>
			<ion-button
				aria-label="Play or pause the song"
				:disabled="loading"
				size="large"
				@click="musicPlayer.togglePlay"
			>
				<ion-spinner v-if="loading" />
				<ion-icon v-else aria-hidden="true" :icon="playing ? pauseIcon : playIcon" slot="icon-only" />
			</ion-button>
			<ion-button
				aria-label="Skip to next song"
				size="large"
				:disabled="!hasNext"
				@click="musicPlayer.skipNext"
			>
				<ion-icon aria-hidden="true" :icon="skipNextIcon" slot="icon-only" />
			</ion-button>
		</ion-buttons>

		<!-- NOTE: volume control does not work on iOS due to Apple putting arbitrary restrictions around setting app volume -->
		<div class="volume-controls" v-if="getPlatform() !== 'ios'">
			<ion-range
				:snaps="false"
				aria-label="Volume"
				:min="0"
				:max="1"
				:step="0.001"
				:value="volume"
				@ion-change="volume = $event.detail.value as number"
			>
				<ion-icon aria-hidden="true" slot="start" :icon="volumeLowIcon" />
				<ion-icon aria-hidden="true" slot="end" :icon="volumeHighIcon" />
			</ion-range>
		</div>

		<div class="actions">
			<ion-button fill="clear" aria-label="Lyrics">
				<ion-icon slot="icon-only" :icon="musicalNotesIcon" />
			</ion-button>

			<ion-button aria-label="Queue" :class="{ active: showQueue }" @click="showQueue = !showQueue">
				<ion-icon slot="icon-only" :icon="listIcon" />
			</ion-button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { storeToRefs } from "pinia";

import {
	play as playIcon,
	pause as pauseIcon,
	playSkipBack as skipPreviousIcon,
	playSkipForward as skipNextIcon,
	volumeLow as volumeLowIcon,
	volumeHigh as volumeHighIcon,
	list as listIcon,
	musicalNotes as musicalNotesIcon,
} from "ionicons/icons";
import {
	IonList,
	IonButton,
	IonButtons,
	IonIcon,
	IonNote,
	IonContent,
	IonSpinner,
	IonRange,
	IonLabel,
	IonItem,
	IonItemDivider,
	IonThumbnail,
	IonReorderGroup,
	IonReorder,
	ItemReorderCustomEvent,
	popoverController,
} from "@ionic/vue";

import MusicPlayerSongMenu from "@/components/MusicPlayerSongMenu.vue";
import SongImg from "@/components/SongImg.vue";

import { AnySong, useMusicPlayer } from "@/stores/music-player";

import { getPlatform } from "@/utils/os";
import { secondsToMMSS } from "@/utils/time";
import { getUniqueSongId, songTypeDisplayName } from "@/utils/songs";
import { useIntersectionObserver } from "@vueuse/core";
import { vOnLongPress } from "@vueuse/components";
import { Haptics } from "@capacitor/haptics";

const musicPlayer = useMusicPlayer();
const {
	queueIndex,
	queuedSongs,
	playing,
	currentSong,
	volume,
	hasPrevious,
	hasNext,
	loading,
	time,
	progress,
	timeRemaining,
} = storeToRefs(musicPlayer);

const showQueue = ref(false);

function reorderQueue(event: ItemReorderCustomEvent): void {
	const { from, to } = event.detail;
	musicPlayer.moveQueueItem(from, to);
	event.detail.complete();
}

async function handleHoldPopover(index: number, song: AnySong, event: Event) {
	// Disable on non-touch devices
	if (!navigator.maxTouchPoints) {
		return;
	}

	event.preventDefault();
	await Haptics.impact().catch(() => {});
	await createPopover(index, song, event);
}

async function createPopover(index: number, song: AnySong, event: Event) {
	const popover = await popoverController.create({
		component: MusicPlayerSongMenu,
		event,
		componentProps: { song, index },
		arrow: false,
		reference: "event",
		alignment: "center",
		side: "right",
		dismissOnSelect: true,
		cssClass: "song-item-popover",
		size: "auto",
	});

	await popover.present();
}

const queueHeader = ref<HTMLElement | null>(null);
useIntersectionObserver(
	queueHeader,
	([entry]) =>
		queueHeader.value?.parentElement?.classList?.toggle?.("is-sticky", !entry.isIntersecting),
	{ rootMargin: "-24px 0px 0px 0px", threshold: [1] },
);
</script>

<style scoped>
@keyframes moving-background {
	0% {
		background-position: 0% 66%;
	}

	33% {
		background-position: 33% 100%;
	}

	66% {
		background-position: 100% 66%;
	}

	100% {
		background-position: 66% 100%;
	}
}

@keyframes details-from-corner {
	from {
		position: absolute;
		top: 0;
		left: 0;
		width: 128px;
	}

	to {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, calc(-50% - 12px));
	}
}

@keyframes details-to-corner {
	from {
		flex-direction: column;
		position: absolute;
		width: 512px;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		opacity: 1;
	}

	15% {
		opacity: 0;
	}

	50% {
		flex-direction: row;
	}

	65% {
		opacity: 1;
	}

	to {
		opacity: 1;
		position: absolute;
		top: 0;
		left: 0;
	}
}

@keyframes queue-slide-out {
	from {
		margin-top: 256px;
		opacity: 0;
	}
	to {
		margin-top: calc(128px + 24px);
		opacity: 1;
	}
}

#music-player-modal {
	user-select: none;

	background: var(--bg-gradient);
	background-size: 500% 500%;
	color: var(--fg-color);
	animation: moving-background 30s linear infinite alternate;

	height: 100%;
	width: 100%;

	display: flex;
	flex-direction: column;

	justify-content: center;
	align-items: center;

	& > #song {
		--background: transparent;
		--color: var(--fg-color);

		& > #song-details {
			pointer-events: none;

			width: 100%;
			height: calc(100% - 24px);
			padding: 12px;

			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: space-around;

			animation: details-from-corner 0.5s;
			&.compact {
				animation: details-to-corner 0.5s;

				height: max-content;
				flex-direction: row;
				justify-content: space-between;
				align-items: center;

				& > #song-info {
					width: calc(100% - 128px);
				}

				& > #artwork {
					width: 128px;
				}
			}

			& > #artwork {
				width: 80%;
				max-width: 512px;
				border-radius: 12px;
				box-shadow: 0 0 24px var(--bg-color);
			}

			& > #song-info {
				width: 100%;
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;

				& > #title,
				& > #artist {
					margin: 0;
					max-width: 90%;
					text-overflow: ellipsis;
					overflow: hidden;
				}

				& > #title {
					font-weight: 800;
					font-size: 2rem;
				}

				& > #artist {
					font-weight: 400;
					font-size: 1.4rem;
				}
			}
		}

		& > #queue {
			display: flex;
			flex-direction: column;
			width: 100%;

			animation: queue-slide-out 0.5s;

			& ion-list {
				background: transparent;

				& ion-item-divider {
					background: transparent;
					padding: 12px 12px;
					backdrop-filter: blur(12px);

					@supports not (backdrop-filter: blur) {
						&.is-sticky {
							background: var(--bg-color);
							box-shadow: 0 8px 12px var(--bg-color);
						}
					}

					font-size: 1.3rem;
					font-weight: 800;
					color: var(--fg-color);
				}

				& ion-item {
					--background: transparent;
					&.current {
						background-color: #fff2;
					}

					& h2 {
						pointer-events: none;
						color: var(--fg-color);
						font-weight: bold;
					}

					& ion-label {
						color: var(--fg-color);
						pointer-events: none;
					}

					& ion-note {
						pointer-events: none;
						font-weight: 500;
						color: color-mix(in srgb, var(--fg-color) 80%, transparent);
					}

					& > ion-thumbnail {
						--border-radius: 8px;
						pointer-events: none;
					}

					& > ion-button {
						height: 48px;
						width: 48px;
						font-size: 1rem;
						color: var(--fg-color);
					}

					&.reorder-selected {
						backdrop-filter: blur(12px);
					}

					& > ion-reorder {
						color: var(--fg-color);

						&::part(icon) {
							opacity: 1;
						}
					}
				}
			}
		}
	}

	& > .time-controls,
	& > .volume-controls {
		display: flex;
		flex-direction: column;
		width: 100%;
		padding-inline: 16px;
		mix-blend-mode: hard-light;

		& > .labels {
			display: grid;
			grid-template-columns: 1fr 1fr 1fr;

			& > #current-time {
				text-align: left;
			}

			& > #source {
				text-align: center;
				font-weight: bold;
			}

			& > #time-remaining {
				text-align: right;
			}
		}
	}

	ion-range {
		--bar-background: color-mix(in srgb, var(--fg-color) 50%, transparent);
		--bar-background-active: var(--fg-color);
		--bar-height: 8px;
		--bar-border-radius: 8px;
		--knob-size: 0;
	}

	& > .media-controls {
		mix-blend-mode: hard-light;

		& > ion-button {
			height: 72px;
			width: 72px;
			--color: var(--fg-color);
			font-size: 1.5rem;
		}
	}

	& > .actions {
		display: flex;
		width: 100%;
		justify-content: space-evenly;
		align-items: center;
		margin-bottom: 32px;
		mix-blend-mode: hard-light;

		& > ion-button {
			--background: transparent;
			--background-hover: transparent;
			--background-activated: transparent;
			--background-focused: transparent;

			--color: var(--fg-color);

			&.active {
				--background: var(--fg-color);
				--color: var(--bg-color);
			}

			font-size: 1.5rem;
		}
	}
}
</style>
