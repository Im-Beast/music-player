import { defineStore, storeToRefs } from "pinia";
import { computed, watch } from "vue";

import { useLocalImages } from "@/stores/local-images";
import { useMusicServices } from "@/stores/music-services";
import { useMusicPlayerState } from "@/stores/music-state";

import type { MusicService } from "@/services/Music/MusicService";

import { filledArtistPreview } from "@/services/Music/objects";
import { getPlatform } from "@/utils/os";
import { formatArtists } from "@/utils/songs";
import { Maybe } from "@/utils/types";

export const useMusicPlayer = defineStore("MusicPlayer", () => {
	const localImages = useLocalImages();

	const state = useMusicPlayerState();
	const { currentQueueSong, currentSong, autoplay, playing, time, volume } = storeToRefs(state);

	const services = useMusicServices();

	// #region Managing services
	const currentService = computed<Maybe<MusicService>>(() => {
		const song = currentSong.value;
		if (!song) return;
		return services.getService(song.type);
	});

	watch(volume, async (volume) => {
		await services.withAllServices((service) => service.setVolume(volume));
	});

	// Automatically change songs
	let abortController = new AbortController();
	watch(currentQueueSong, async () => {
		abortController.abort();
		abortController = new AbortController();

		await state.loadingCounters.queueChange.onLoaded();

		state.loading.queueChange = true;

		try {
			const service = currentService.value;
			if (service) {
				await service.changeSong(currentSong.value!);

				abortController.signal.throwIfAborted();

				switch (autoplay.value) {
					case true:
						await play();
						break;
					case "auto":
						autoplay.value = true;
						break;
					case false:
						break;
				}
			} else {
				await services.withAllServices((service) => service.stop());
			}
		} catch {}

		state.loading.queueChange = false;
	});
	// #endregion

	// #region Actions for managing MusicPlayer
	const hasPrevious = computed(() => state.queueIndex > 0);
	const hasNext = computed(() => state.queue.length > state.queueIndex + 1);

	async function setQueueIndex(index: number): Promise<void> {
		if (index < 0 || index >= state.queue.length) {
			throw new Error(`Tried to set queue index outside of queue bounds (index = ${index})`);
		}
		state.queueIndex = index;
		await state.loadingCounters.queueChange.onLoaded();
	}
	async function skipPrevious(): Promise<void> {
		if (!hasPrevious.value) return;
		state.queueIndex -= 1;
		await state.loadingCounters.queueChange.onLoaded();
	}
	async function skipNext(): Promise<void> {
		if (!hasNext.value) return;
		state.queueIndex += 1;
		await state.loadingCounters.queueChange.onLoaded();
	}

	async function play(): Promise<void> {
		await currentService.value?.play();
	}
	async function pause(): Promise<void> {
		await currentService.value?.pause();
	}

	async function togglePlay(): Promise<void> {
		await currentService.value?.togglePlay();
	}
	// #endregion

	// #region System Music Controls
	// Android's WebView doesn't support MediaSession
	if (getPlatform() === "android") {
		void import("capacitor-music-controls-plugin").then(({ CapacitorMusicControls }) => {
			let musicControlsExist = false;
			watch(
				[hasPrevious, hasNext, currentSong],
				async ([hasPrev, hasNext, currentSong]) => {
					if (musicControlsExist) {
						musicControlsExist = false;
						await CapacitorMusicControls.destroy();
					}

					await CapacitorMusicControls.create({
						isPlaying: false,
						hasPrev,
						hasSkipBackward: false,
						hasNext,
						hasSkipForward: false,

						track: currentSong?.title ?? "",
						artist: formatArtists(currentSong?.artists?.map(filledArtistPreview)),
						album: currentSong?.album ?? "",

						// FIXME: Local artworks
						cover: localImages.getUrl(currentSong?.artwork) ?? "",

						hasClose: false,
						dismissable: false,

						hasScrubbing: true,
						elapsed: 0,
						duration: currentSong?.duration ?? 0,

						playIcon: "media_play",
						pauseIcon: "media_pause",
						prevIcon: "media_prev",
						nextIcon: "media_next",
						closeIcon: "media_close",
						notificationIcon: "notification",
					});
					musicControlsExist = true;
				},
				{ immediate: true },
			);

			watch([playing, time], ([isPlaying, elapsed]) => {
				if (!musicControlsExist) return;
				CapacitorMusicControls.updateElapsed({ isPlaying, elapsed });
			});

			document.addEventListener("controlsNotification", async (event: Event) => {
				if (!("message" in event)) return;

				switch (event.message) {
					case "music-controls-play":
						await play();
						break;
					case "music-controls-pause":
						await pause();
						break;
					case "music-controls-next":
						await skipNext();
						break;
					case "music-controls-previous":
						await skipPrevious();
						break;
				}
			});
		});
	}

	// iOS, Web and Electron
	if (getPlatform() !== "android" && "mediaSession" in navigator) {
		addMusicSessionActionHandlers();

		watch(currentSong, (song) => {
			if (!song) {
				navigator.mediaSession.metadata = null;
				navigator.mediaSession.playbackState = "none";
				return;
			}

			// Since iOS's WKWebView is actually its own separate app setting AVAudioSession inside this app does nothing.
			// However I was lucky enough to find this W3C AudioSession draft: https://w3c.github.io/audio-session.
			// And Apple does indeed support it in both Safari and WKWebView. According to https://caniwebview.com/search/?s=audiosession it is supported since iOS 16.4
			// NOTE: This might change in the future, since its not a web standard
			if ("audioSession" in navigator) {
				(navigator.audioSession as { type: string }).type = "playback";
			}

			const artworkUrl = localImages.getUrl(song.artwork);

			navigator.mediaSession.metadata = new window.MediaMetadata({
				title: song.title,
				artist: formatArtists(song.artists.map(filledArtistPreview)),
				album: song.album,
				artwork: typeof artworkUrl === "string" ? [{ src: artworkUrl }] : undefined,
			});
		});
	}

	/**
	 * These action handlers MUST also be added after audio elements emitted "playing" event
	 * Otherwise WKWebView on iOS does not respect the action handlers and shows the seek buttons
	 */
	function addMusicSessionActionHandlers(): void {
		if (!("mediaSession" in navigator)) return;

		navigator.mediaSession.setActionHandler("pause", async () => {
			await pause();
			navigator.mediaSession.playbackState = "paused";
		});
		navigator.mediaSession.setActionHandler("play", async () => {
			await play();
			navigator.mediaSession.playbackState = "playing";
		});
		navigator.mediaSession.setActionHandler("previoustrack", async () => {
			await skipPrevious();
		});
		navigator.mediaSession.setActionHandler("nexttrack", async () => {
			await skipNext();
		});
	}
	// #endregion

	// #region Properties
	const progress = computed({
		get: () => state.time / state.duration,
		set: async (progress) => {
			const time = progress * state.duration;
			await currentService?.value?.seekToTime(time);
		},
	});

	const timeRemaining = computed(() => state.duration - state.time);
	// #endregion

	return {
		play,
		pause,
		togglePlay,
		hasPrevious,
		skipPrevious,
		hasNext,
		skipNext,
		setQueueIndex,

		progress,
		timeRemaining,

		addMusicSessionActionHandlers,

		state,
		services,
	};
});
