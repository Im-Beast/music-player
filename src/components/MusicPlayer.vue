<script lang="ts" setup>
import { Haptics } from "@capacitor/haptics";
import { storeToRefs } from "pinia";
import { computed, ref, useTemplateRef, watch } from "vue";

import ContextMenu from "@/components/ContextMenu.vue";
import GenericSongItem from "@/components/GenericSongItem.vue";
import LocalImg from "@/components/LocalImg.vue";
import WrappingMarquee from "@/components/WrappingMarquee.vue";
import {
	IonButton,
	IonIcon,
	IonItem,
	IonItemDivider,
	IonList,
	IonListHeader,
	IonModal,
	IonRange,
	IonReorderGroup,
	ItemReorderCustomEvent,
	useIonRouter,
} from "@ionic/vue";
import {
	pencilOutline as editIcon,
	ellipsisHorizontal as ellipsisIcon,
	musicalNotes as lyricsIcon,
	pause as pauseIcon,
	play as playIcon,
	listOutline as playLastIcon,
	playOutline as playNextIcon,
	list as queueIcon,
	trashOutline as removeIcon,
	playSkipForward as skipNextIcon,
	playSkipBack as skipPreviousIcon,
} from "ionicons/icons";

import { AnySong, useMusicPlayer } from "@/stores/music-player";

import { isMobilePlatform } from "@/utils/os";
import { formatArtists, songTypeToDisplayName } from "@/utils/songs";
import { secondsToMMSS } from "@/utils/time";

const router = useIonRouter();
const musicPlayer = useMusicPlayer();
const state = musicPlayer.state;
const { currentSong, time, playing, duration } = storeToRefs(state);

const formattedArtists = computed(() => formatArtists(currentSong.value?.artists));
const currentTime = computed(() => secondsToMMSS(time.value));
const timeRemaining = computed(() => secondsToMMSS(musicPlayer.timeRemaining));
const currentService = computed(
	() => currentSong.value && songTypeToDisplayName(currentSong.value.type),
);

const queueOpen = ref(false);
const canDismiss = ref(true);

const modal = useTemplateRef("music-player");

function toggleQueue(): void {
	queueOpen.value = !queueOpen.value;
	if (!queueOpen.value) {
		canDismiss.value = true;
	}
}

const seekPreview = ref(false);
const seekPreviewValue = ref(0);
const seekPreviewTime = computed(() => secondsToMMSS(seekPreviewValue.value * duration.value));
if (isMobilePlatform()) {
	watch(seekPreviewValue, async (value) => {
		if (value === 0 || value === 1) {
			await Haptics.impact();
		}
	});
}

const seekPreviewRemainingTime = computed(() =>
	secondsToMMSS(duration.value * (1 - seekPreviewValue.value)),
);

function reorderQueue(event: ItemReorderCustomEvent): void {
	const { from, to } = event.detail;
	// We offset from and to by 1 because of "Queue" label
	musicPlayer.state.moveQueueItem(from, to);
	event.detail.complete();
}

function goToSong(song: AnySong, hash?: string): void {
	dismiss();
	router.push(`/library/songs/${song.type}/${song.id}` + (hash ? `#${hash}` : ""));
}

function dismiss(): void {
	modal.value?.$el?.dismiss();
}
</script>

<template>
	<ion-modal
		v-show="currentSong"
		ref="music-player"
		id="music-player"
		:keep-contents-mounted="true"
		:can-dismiss="canDismiss"
		:initial-breakpoint="1"
		:breakpoints="[0, 1]"
		:class="{ 'queue-view': queueOpen }"
		:style="{
			'--bg': currentSong?.style.bgGradient,
			'--bg-color': currentSong?.style.bgColor,
			'--fg-color': currentSong?.style.fgColor,
		}"
	>
		<div id="song-lols">
			<LocalImg :class="{ playing }" :src="currentSong?.artwork" />

			<div id="song-info">
				<div id="song-details">
					<h1>
						<WrappingMarquee :text="currentSong?.title ?? 'Unknown title'" />
					</h1>
					<h2>
						<WrappingMarquee :text="formattedArtists" />
					</h2>
				</div>

				<div id="song-actions">
					<ContextMenu
						event="click"
						:move="false"
						:backdrop="false"
						:haptics="false"
						x="right"
						y="center"
					>
						<ion-button id="song-menu" size="small" fill="clear">
							<ion-icon :icon="ellipsisIcon" slot="icon-only" />
						</ion-button>

						<template #options>
							<ion-item
								aria-label="Edit song"
								lines="full"
								button
								:detail="false"
								@click="goToSong(currentSong!, 'edit')"
							>
								Edit song
								<ion-icon aria-hidden="true" :icon="editIcon" slot="end" />
							</ion-item>
						</template>
					</ContextMenu>
				</div>
			</div>
		</div>

		<div
			v-show="queueOpen"
			id="player-queue"
			@pointercancel="canDismiss = true"
			@pointerout="canDismiss = true"
			@pointermove="canDismiss = false"
		>
			<ion-list>
				<ion-list-header>Queue</ion-list-header>
				<!-- FIXME: Reorder does not work on desktop -->
				<ion-reorder-group :disabled="false" @ion-item-reorder="reorderQueue">
					<GenericSongItem
						v-for="({ song, id }, i) in state.queue"
						reorder
						:key="id"
						:class="{ 'current-song': i === state.queueIndex }"
						:title="song.title"
						:artists="song.artists"
						:artwork="song.artwork"
						:type="song.type"
						@item-click="musicPlayer.setQueueIndex(i)"
						@context-menu-click="goToSong(song)"
					>
						<template #options>
							<ion-item
								aria-label="Play next"
								lines="full"
								button
								:detail="false"
								@click="state.moveQueueItem(i, state.queueIndex + 1)"
							>
								Play next
								<ion-icon aria-hidden="true" :icon="playNextIcon" slot="end" />
							</ion-item>
							<ion-item
								aria-label="Play last"
								lines="full"
								button
								:detail="false"
								@click="state.moveQueueItem(i, state.queue.length - 1)"
							>
								Play last
								<ion-icon aria-hidden="true" :icon="playLastIcon" slot="end" />
							</ion-item>

							<ion-item-divider />

							<ion-item
								@click="state.removeFromQueue(i)"
								class="remove-song-item"
								aria-label="Remove"
								lines="full"
								button
								:detail="false"
							>
								Remove
								<ion-icon aria-hidden="true" :icon="removeIcon" slot="end" />
							</ion-item>
						</template>
					</GenericSongItem>
				</ion-reorder-group>
			</ion-list>
		</div>

		<div id="song-controls">
			<div id="time-control">
				<ion-range
					aria-label="Volume"
					:snaps="false"
					:min="0"
					:max="1"
					:step="0.01"
					:value="seekPreview ? seekPreviewValue : musicPlayer.progress"
					@pointerdown="seekPreview = true"
					@pointerup="seekPreview = false"
					@ion-input="seekPreviewValue = <number>$event.detail.value"
					@ion-change="musicPlayer.progress = <number>$event.detail.value"
				/>

				<div id="time-control-labels">
					<p>{{ seekPreview ? seekPreviewTime : currentTime }}</p>
					<p>{{ currentService }}</p>
					<p>-{{ seekPreview ? seekPreviewRemainingTime : timeRemaining }}</p>
				</div>
			</div>

			<div id="player-controls">
				<ion-button
					aria-label="Skip to previous song"
					size="large"
					fill="clear"
					@click="musicPlayer.skipPrevious"
					:disabled="!musicPlayer.hasPrevious || state.loading.queueChange"
				>
					<ion-icon aria-hidden="true" :icon="skipPreviousIcon" slot="icon-only" />
				</ion-button>

				<ion-button
					:aria-label="playing ? 'Pause' : 'Play'"
					size="large"
					fill="clear"
					@click="musicPlayer.togglePlay"
					:data-loading="state.loading.playPause"
					:disabled="state.loading.playPause"
				>
					<ion-icon aria-hidden="true" v-if="playing" :icon="pauseIcon" slot="icon-only" />
					<ion-icon aria-hidden="true" v-else :icon="playIcon" slot="icon-only" />
				</ion-button>

				<ion-button
					aria-label="Skip to next song"
					size="large"
					fill="clear"
					@click="musicPlayer.skipNext"
					:disabled="!musicPlayer.hasNext || state.loading.queueChange"
				>
					<ion-icon aria-hidden="true" :icon="skipNextIcon" slot="icon-only" />
				</ion-button>
			</div>

			<div id="player-actions">
				<ion-button aria-label="Show lyrics" fill="clear" size="default">
					<ion-icon aria-hidden="true" :icon="lyricsIcon" slot="icon-only" />
				</ion-button>

				<ion-button
					:aria-label="queueOpen ? 'Hide song queue' : 'Open song queue'"
					id="queue-toggle"
					fill="clear"
					size="default"
					:class="{ toggled: queueOpen }"
					@pointerdown="toggleQueue"
				>
					<ion-icon :icon="queueIcon" slot="icon-only" />
				</ion-button>
			</div>
		</div>
	</ion-modal>
</template>

<style global>
#music-player .context-menu.closed ion-item,
#music-player .context-item-container > ion-item {
	--background: transparent;
	--border-color: transparent;
	--color: white;

	&.current-song {
		--background: color-mix(in srgb, #fff2 70%, var(--bg-color));
	}

	& ion-note {
		color: white;
		opacity: 60%;
	}
}
</style>

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

@keyframes move-in {
	from {
		opacity: 0%;
		transform: scale(50%);
	}

	to {
		opacity: 100%;
		transform: scale(100%);
	}
}

@keyframes move-out {
	from {
		opacity: 50%;
		transform: scale(50%);
	}

	to {
		opacity: 100%;
		transform: scale(100%);
	}
}

@keyframes show-queue {
	from {
		opacity: 0%;
		transform: scaleY(0%);
	}

	to {
		opacity: 100%;
		transform: scaleY(100%);
	}
}

@keyframes button-loading-animation {
	from {
		opacity: 0%;
		transform: scale(70%);
	}

	to {
		opacity: 30%;
		transform: scale(80%);
	}
}

#music-player {
	--width: 100%;
	--height: 100%;
	--player-max-width: 640px;

	--background: linear-gradient(to top, #0009 2%, transparent 50%), var(--bg);
	@media (prefers-color-scheme: dark) {
		--background: linear-gradient(to top, #000b 2%, transparent), var(--bg);
	}

	color: white;

	--modal-handle-top: calc(var(--ion-safe-area-top) + 6px);
	@media screen and (min-width: 640px) {
		--modal-handle-top: calc(var(--ion-safe-area-top) + 24px);
	}

	&::part(handle) {
		background-color: white;
		opacity: 80%;
		box-shadow: 0 0 12px #0006;
		top: var(--modal-handle-top);
	}

	&::part(content) {
		background-size:
			100% 100%,
			500% 500% !important;
		animation: moving-background 30s linear infinite alternate;
	}

	ion-button[size="large"] ion-icon {
		font-size: 2.5rem;
	}

	ion-button[size="default"] ion-icon {
		font-size: 1.75rem;
	}

	&:not(.queue-view) #song-lols > #song-info {
		animation: move-out 450ms cubic-bezier(0.32, 0.885, 0.55, 1.175);
	}

	&.queue-view #song-lols {
		&::before {
			opacity: 30%;
		}

		flex-direction: row;
		align-items: center;
		min-height: calc(var(--modal-handle-top) + 80px);
		max-height: calc(var(--modal-handle-top) + 80px);

		& > .local-img,
		& > #song-info {
			top: calc(var(--modal-handle-top) + 6px);
		}

		& > .local-img {
			position: absolute;
			z-index: 100;
			left: 24px;

			align-self: start;
			justify-self: start;

			transform: translate(0);

			width: 64px !important;
		}

		& > #song-info {
			position: absolute;
			right: 0;
			width: calc(100% - 128px);
			height: 64px;
			align-items: center;

			animation: move-in 350ms cubic-bezier(0.32, 0.885, 0.55, 1.175);

			& > #song-details {
				overflow: visible;
				text-shadow: 0 0 12px #0004;
				width: 100%;
			}

			& > #song-actions {
				display: none;
			}
		}
	}

	& #player-queue {
		margin-inline: auto;
		max-width: var(--player-max-width);
		width: 100%;
		height: 100%;

		overflow: auto;
		mask-image: linear-gradient(to bottom, transparent, black 5% 95%, transparent);

		transform-origin: bottom center;
		animation: show-queue 450ms cubic-bezier(0.175, 0.885, 0.32, 1.075);

		& > ion-list {
			background: transparent;
			padding-bottom: 16px;

			& > ion-list-header {
				--background: transparent;
				--color: white;
				text-shadow: 0 0 6px #0002;
			}

			& .remove-song-item {
				--color: var(--ion-color-danger);
				&:hover {
					--color: var(--ion-color-danger-tint);
				}
				&:active {
					--color: var(--ion-color-danger-shade);
				}
			}
		}
	}

	& #song-lols {
		position: relative;
		margin-inline: auto;
		max-width: var(--player-max-width);
		width: 100%;
		padding-top: 24px;

		&::before {
			transition: opacity 500ms;
			content: "";
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background-color: black;
			opacity: 0;
			pointer-events: none;
		}

		display: flex;
		flex-direction: column;
		height: 100%;

		& > .local-img {
			justify-self: center;
			align-self: center;
			margin-block: auto;

			pointer-events: none;

			/** Offset image by the halfe of safe area padding to make it look actually centered */
			top: calc(var(--ion-safe-area-top) / 2);

			transition: all 350ms cubic-bezier(0.32, 0.885, 0.55, 1.175);
			height: auto;

			width: min(40vh, 60%);
			&.playing {
				width: min(50vh, 85%);
			}

			border-radius: 12px;
			box-shadow: 0 0 32px #0006;
		}

		& > #song-info {
			display: flex;
			margin-inline: 24px;
			margin-bottom: 8px;

			& #song-details {
				width: 80%;
				overflow: hidden;
				white-space: nowrap;

				& > h1 {
					--marquee-duration: 20s;
					--marquee-gap: 12px;

					.wrapping {
						mask-image: linear-gradient(to right, transparent, black 10% 90%, transparent);
					}

					font-size: 1.45rem;
					font-weight: 700;
					margin: 0;
				}

				& > h2 {
					overflow: hidden;
					.wrapping {
						mask-image: linear-gradient(to right, transparent, black 10% 90%, transparent);
					}

					font-size: 1.25rem;
					font-weight: 550;
					margin: 0;
					opacity: 80%;
				}
			}

			& #song-actions {
				flex-grow: 1;

				display: flex;
				align-items: center;
				justify-content: end;

				ion-button {
					--background: #fff2;
					--border-radius: 9999px;

					ion-icon {
						color: white;
					}
				}
			}
		}
	}

	& #song-controls {
		margin-inline: auto;
		max-width: min(calc(100% - 64px), var(--player-max-width));
		width: 100%;

		display: flex;
		flex-direction: column;
		margin-bottom: calc(32px + var(--ion-safe-area-bottom));

		& > #time-control {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			opacity: 80%;

			transition:
				transform,
				opacity,
				550ms cubic-bezier(0.175, 0.885, 0.32, 1.075);
			transform-origin: bottom center;
			&:has(> ion-range:active) {
				transform: scaleX(102%);
				opacity: 100%;
			}

			& > ion-range {
				width: 100%;

				transition: transform 550ms cubic-bezier(0.175, 0.885, 0.32, 1.075);
				transform-origin: bottom center;
				&:active {
					transform: scaleY(115%);
				}

				--bar-background: color-mix(in srgb, white 50%, transparent);
				--bar-background-active: white;
				--bar-border-radius: 8px;
				--bar-height: 8px;
				--knob-size: 0;

				&::part(bar) {
					top: 0;
					transition: height 350ms cubic-bezier(0.175, 0.885, 0.32, 1.075);
				}

				&::part(bar-active) {
					top: 0;
					z-index: -1;
				}

				&:hover {
					--bar-height: 10px;
				}

				&:active {
					--bar-height: 12px;
				}
			}

			& > #time-control-labels {
				margin-top: 0;
				width: 100%;
				display: flex;
				align-items: center;
				justify-content: space-between;

				& > p {
					margin-top: 0;
					letter-spacing: 0px;
					font-weight: bold;
					font-size: 0.8rem;
					font-feature-settings: "tnum";
					font-variant-numeric: tabular-nums;
				}
			}
		}

		& > #player-controls {
			display: flex;
			align-items: center;
			justify-content: space-evenly;
			margin-block: 16px;

			& > ion-button {
				& > ion-icon {
					color: white;
				}
			}
		}

		& > #player-actions {
			display: flex;
			align-items: center;
			justify-content: space-evenly;
			padding-block: 16px;

			& > ion-button {
				opacity: 70%;

				& > ion-icon {
					color: white;
				}
			}

			& > #queue-toggle.toggled {
				--background: white;
				--border-radius: 12px;
				& > ion-icon {
					color: black;
				}
			}
		}
	}
}
</style>
