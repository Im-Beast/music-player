import { useLocalStorage } from "@vueuse/core";
import { useIDBKeyval } from "@vueuse/integrations/useIDBKeyval.mjs";
import { defineStore } from "pinia";
import { computed, ref, toRaw } from "vue";

import type { AnySong, Playlist } from "@/stores/music-player";

import { generateUUID } from "@/utils/crypto";
import { Maybe } from "@/utils/types";
import { useLoadingCounter } from "@/utils/vue";

interface QueueSong {
	id: string;
	song: AnySong;
}

export const useMusicPlayerState = defineStore("MusicPlayerState", () => {
	// #region Playlist
	const $playlists = useIDBKeyval<Playlist[]>("playlists", []);
	const playlists = computed(() => $playlists.data.value);

	function addPlaylist(playlist: Playlist): void {
		playlists.value.push(playlist);
	}

	function removePlaylist(id: string): void {
		const index = playlists.value.findIndex((playlist) => playlist.id === id);
		if (index !== -1) {
			playlists.value.splice(index, 1);
		}
	}

	function getPlaylist(id: string): Maybe<Playlist> {
		return playlists.value.find((playlist) => playlist.id === id);
	}
	// #endregion

	// #region Queue
	const $queue = useIDBKeyval<QueueSong[]>("queue", []);
	const queue = computed<QueueSong[]>({
		get: () => $queue.data.value,
		set: (value) => ($queue.data.value = value),
	});
	const queueIndex = useLocalStorage("queueIndex", 0);
	const currentQueueSong = computed<Maybe<QueueSong>>(() => queue.value[queueIndex.value]);
	const currentSong = computed<Maybe<AnySong>>(() => currentQueueSong.value?.song);

	function songToQueueSong(song: AnySong): QueueSong {
		return {
			id: generateUUID(),
			song: toRaw(song),
		};
	}

	function setQueue(songs: AnySong[]): void {
		queue.value = songs.map(songToQueueSong);
	}

	async function addToQueue(song: AnySong, index = queue.value.length): Promise<void> {
		queue.value.splice(index, 0, songToQueueSong(song));
		await loadingCounters.queueChange.onLoaded();
	}

	async function removeFromQueue(index: number): Promise<void> {
		queue.value.splice(index, 1);
		if (index < queueIndex.value) {
			queueIndex.value -= 1;
		}

		if (queueIndex.value >= queue.value.length) {
			queueIndex.value = queue.value.length - 1;
		}

		await loadingCounters.queueChange.onLoaded();
	}

	/**
	 * Moves song in queue from {@linkcode from} to {@linkcode to} index.
	 *
	 * If moving the item would change the song – {@linkcode queueIndex} is adapted accordingly,
	 * so this function doesn't cause song to change.
	 *
	 * @throws if either {@linkcode from} or {@linkcode to} is an invalid index
	 */
	function moveQueueItem(from: number, to: number): void {
		if (from < 0 || from >= queue.value.length) {
			throw new Error(`Tried to move inexisting queue item (from = ${from})`);
		} else if (to < 0 || to >= queue.value.length) {
			throw new Error(`Tried to move item outside of queue bounds (to = ${to})`);
		}

		const [item] = queue.value.splice(from, 1);

		queue.value.splice(to, 0, item!);

		// Then make sure that currently playing song is still the one playing
		if (from > queueIndex.value && to <= queueIndex.value) {
			queueIndex.value += 1;
		} else if (from < queueIndex.value && to >= queueIndex.value) {
			queueIndex.value -= 1;
		} else if (from === queueIndex.value) {
			queueIndex.value = to;
		}
	}
	// #endregion

	// #region Properties
	const playing = ref(false);
	const autoplay = ref<"auto" | boolean>("auto");
	const volume = useLocalStorage("volume", 1);
	const time = ref(0);
	const duration = ref(1);

	const loadingCounters = {
		playPause: useLoadingCounter(),
		queueChange: useLoadingCounter(),
	};
	const loading = {
		playPause: loadingCounters.playPause.loading,
		queueChange: loadingCounters.queueChange.loading,
	};
	// #endregion

	return {
		playlists,
		addPlaylist,
		removePlaylist,
		getPlaylist,

		loading,
		loadingCounters,

		queue,
		queueIndex,
		currentQueueSong,
		currentSong,
		setQueue,
		addToQueue,
		removeFromQueue,
		moveQueueItem,

		playing,
		autoplay,
		volume,
		time,
		duration,
	};
});
