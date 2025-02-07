import { defineStore } from "pinia";
import { computed, Ref, ref, watch } from "vue";
import { useLocalStorage, useStorage, watchDebounced } from "@vueuse/core";
import { useIDBKeyval } from "@vueuse/integrations/useIDBKeyval";

import { LocalMusicPlayerService } from "@/services/MusicPlayer/LocalMusicPlayerService";
import { MusicKitMusicPlayerService } from "@/services/MusicPlayer/MusicKitMusicPlayerService";
import { MusicPlayerService } from "@/services/MusicPlayer/MusicPlayerService";
import { getPlatform } from "@/utils/os";
import { useLocalImages } from "./local-images";

declare global {
	namespace ElectronMusicPlayer {
		// musickit:
		const authorizeMusicKit: undefined | (() => Promise<string>);

		// musicplayer:
		const getMusicPath: () => Promise<string>;
		const readFile: (path: string) => Promise<Uint8Array>;
		const traverseDirectory: (path: string) => Promise<string[]>;
	}
}

export type SongImage = { id: string; url?: never } | { id?: never; url: string };
export interface Song<Type extends string, Data = {}> {
	type: Type;

	id: string;
	title?: string;
	artist?: string;
	album?: string;
	duration?: number;
	genre?: string;

	artwork?: SongImage;
	style: {
		fgColor: string;
		bgColor: string;
		bgGradient: string;
	};

	data: Data;
}

export type MusicKitSong = Song<"musickit">;
export type LocalSong = Song<"local", { path: string }>;

export type AnySong = MusicKitSong | LocalSong;

export const useMusicPlayer = defineStore("MusicPlayer", () => {
	const localImages = useLocalImages();

	const musicPlayerServices: Record<string, MusicPlayerService> = {
		local: new LocalMusicPlayerService(),
	};

	function addMusicPlayerService(type: string, service: MusicPlayerService): void {
		musicPlayerServices[type] = service;
	}

	function getMusicPlayerService(type: string): MusicPlayerService | void {
		return musicPlayerServices[type];
	}

	function removeMusicPlayerService(type: string): void {
		delete musicPlayerServices[type];
	}

	const withAllServices = <T>(callback: (service: MusicPlayerService) => T) =>
		Promise.all(Object.values(musicPlayerServices).map(callback));

	const queuedSongs = useIDBKeyval<AnySong[]>("queuedSongs", []);
	const queueIndex = useStorage("queueIndex", 0);
	const currentSong = computed<AnySong | undefined>(() => queuedSongs.data.value[queueIndex.value]);

	const currentService = computed<MusicPlayerService | undefined>(() => {
		const song = currentSong.value;
		return song && musicPlayerServices[song.type];
	});

	let autoPlay = false;
	watchDebounced(
		[currentSong, currentService],
		async ([song, service]) => {
			if (!service) return;

			if (song) {
				await service.changeSong(song!);
				if (autoPlay) {
					await service.play();
				} else {
					await service.initialize();
					autoPlay = true;
				}
			} else {
				await MusicPlayerService.stopServices();
			}
		},
		{ debounce: 500 },
	);

	const loadingStack = ref<boolean[]>([]);
	const loading = computed({
		get() {
			return loadingStack.value.length > 0;
		},

		set(value) {
			if (value) {
				loadingStack.value.push(true);
			} else {
				loadingStack.value.pop();
			}
		},
	});

	const playing = ref(false);
	const volume = useLocalStorage("volume", 1);

	watch(volume, async (volume) => await withAllServices((service) => service.setVolume(volume)), {
		immediate: true,
	});

	const time = ref(0);
	const duration = ref(1);
	const progress = computed({
		get: () => time.value / duration.value,
		set: (progress) => {
			currentService.value?.seekToTime(progress * duration.value);
		},
	});

	watch([time, duration], async ([time, duration]) => {
		if (Math.floor(duration - time) === 0) await skipNext();
	});

	const hasPrevious = computed(() => queueIndex.value > 0);
	const hasNext = computed(() => queuedSongs.data.value.length > queueIndex.value + 1);

	const timeRemaining = computed(() => duration.value * (1 - progress.value));

	function addToQueue(song: AnySong, index = queuedSongs.data.value.length): void {
		queuedSongs.data.value.splice(index, 0, song);
	}

	function removeFromQueue(index: number): void {
		queuedSongs.data.value.splice(index, 1);
		if (index < queueIndex.value) {
			queueIndex.value -= 1;
		}
	}

	function moveQueueItem(from: number, to: number): void {
		// Move item in the array
		const [item] = queuedSongs.data.value.splice(from, 1);
		queuedSongs.data.value.splice(to, 0, item);

		// Then make sure that currently playing song is still the one playing
		if (from > queueIndex.value && to <= queueIndex.value) {
			queueIndex.value += 1;
		} else if (from < queueIndex.value && to >= queueIndex.value) {
			queueIndex.value -= 1;
		} else if (from === queueIndex.value) {
			queueIndex.value = to;
		}
	}

	function play() {
		return currentService.value?.play();
	}

	function pause() {
		return currentService.value?.pause();
	}

	function togglePlay() {
		return currentService.value?.togglePlay();
	}

	async function skipPrevious() {
		if (!hasPrevious.value) return;
		queueIndex.value--;
	}

	async function skipNext() {
		if (!hasNext.value) return;
		queueIndex.value++;
	}

	async function searchHints(term: string): Promise<string[]> {
		const allHints = await withAllServices((service) => service.searchHints(term));
		return allHints.flat();
	}

	async function searchSongs(term: string, offset = 0): Promise<AnySong[]> {
		const allResults = await withAllServices((service) => service.searchSongs(term, offset));
		return allResults.flat();
	}

	async function librarySongs(offset = 0): Promise<AnySong[]> {
		const allSongs = await withAllServices((service) => service.librarySongs(offset));
		return allSongs.flat();
	}

	async function refreshLibrarySongs(): Promise<void> {
		await withAllServices((service) => service.refreshLibrarySongs());
	}

	async function refreshSong(song: AnySong): Promise<void> {
		await musicPlayerServices[song.type].refreshSong(song);
	}

	//#region System Music Controls
	// Android's WebView doesn't support MediaSession
	if (getPlatform() === "android") {
		import("capacitor-music-controls-plugin").then(({ CapacitorMusicControls }) => {
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
						artist: currentSong?.artist ?? "",
						album: currentSong?.album ?? "",

						// FIXME: Local artworks
						cover: (await localImages.getSongImageUrl(currentSong?.artwork)) ?? "",

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

			watch([playing, time], async ([isPlaying, elapsed]) => {
				if (!musicControlsExist) return;
				await CapacitorMusicControls.updateElapsed({ isPlaying, elapsed });
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
		// These action handlers MUST also be added after audio elements emitted "playing" event
		// Otherwise WKWebView on iOS does not respect the action handlers and shows the seek buttons
		addMusicSessionActionHandlers();

		watch([currentSong], async ([song]) => {
			if (!song) {
				navigator.mediaSession.metadata = null;
				navigator.mediaSession.playbackState = "none";
				return;
			}

			navigator.mediaSession.metadata = new window.MediaMetadata({
				title: song.title,
				artist: song.artist,
				album: song.album,
				artwork: song.artwork && [{ src: (await localImages.getSongImageUrl(song.artwork))! }],
			});
		});
	}

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
	//#endregion

	return {
		loading,
		playing,
		play,
		pause,
		togglePlay,

		volume,
		progress,

		time,
		duration,
		timeRemaining,

		queuedSongs: computed(() => queuedSongs.data.value),
		queueIndex,
		addToQueue,
		removeFromQueue,
		moveQueueItem,

		hasPrevious,
		hasNext,
		skipPrevious,
		skipNext,
		currentSong,

		addMusicSessionActionHandlers,

		searchSongs,
		searchHints,
		librarySongs,
		refreshSong,
		refreshLibrarySongs,

		addMusicPlayerService,
		getMusicPlayerService,
		removeMusicPlayerService,
	};
});
