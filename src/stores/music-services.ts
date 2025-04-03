import { defineStore } from "pinia";
import { computed, reactive } from "vue";

import { MusicService } from "@/services/Music/MusicService";

import { LocalMusicService } from "@/services/Music/LocalMusicService";
import { MusicKitMusicService } from "@/services/Music/MusicKitMusicService";
import { YouTubeMusicService } from "@/services/Music/YouTubeMusicService";

import { Album, AnySong, SongPreview } from "@/stores/music-player";

import { Maybe } from "@/utils/types";

export const useMusicServices = defineStore("MusicServices", () => {
	const registeredServices = reactive<Record<string, MusicService>>({});
	const enabledServices = computed<MusicService[]>(() =>
		Object.values(registeredServices).filter((service) => service.enabled.value),
	);

	// #region Actions for managing services
	function registerService(service: MusicService): void {
		registeredServices[service.type] = service;
	}

	function getService(type: string): Maybe<MusicService> {
		const service = registeredServices[type];
		if (service?.enabled?.value) {
			return service;
		}
	}
	// #endregion

	// #region Actions for calling service methods
	function withAllServices<T>(callback: (service: MusicService) => T): Promise<Awaited<T>[]> {
		return Promise.all(enabledServices.value.map(callback));
	}

	async function searchHints(term: string): Promise<string[]> {
		const allHints = await withAllServices((service) => service.searchHints(term));
		return allHints.flat();
	}

	async function* searchSongs(
		term: string,
		offset = 0,
		options?: { signal: AbortSignal },
	): AsyncGenerator<SongPreview> {
		for (const service of enabledServices.value) {
			yield* service.searchSongs(term, offset, options);
		}
	}

	async function librarySongs(offset = 0): Promise<AnySong[]> {
		const allSongs = await withAllServices((service) => service.librarySongs(offset));
		return allSongs.flat();
	}

	async function refreshLibrarySongs(): Promise<void> {
		await withAllServices((service) => service.refreshLibrarySongs());
	}

	async function refreshSong(song: AnySong): Promise<Maybe<AnySong>> {
		return await getService(song.type)?.refreshSong(song);
	}

	async function getSongFromPreview(searchResult: SongPreview): Promise<AnySong> {
		const service = getService(searchResult.type)!;
		const song = await service.getSongFromPreview(searchResult);
		return song;
	}

	async function getSong(type: AnySong["type"], id: string): Promise<Maybe<AnySong>> {
		return await getService(type)?.getSong(id);
	}

	async function getAlbum(type: AnySong["type"], id: string): Promise<Maybe<Album>> {
		return await getService(type)?.getAlbum(id);
	}

	async function getSongsAlbum(song: AnySong): Promise<Maybe<Album>> {
		return await getService(song.type)?.getSongsAlbum(song);
	}
	// #endregion

	registerService(new MusicKitMusicService());
	registerService(new YouTubeMusicService());
	registerService(new LocalMusicService());

	return {
		registeredServices,
		enabledServices,

		registerService,
		getService,

		withAllServices,
		searchHints,
		searchSongs,
		librarySongs,
		refreshLibrarySongs,
		refreshSong,
		getSong,
		getSongFromPreview,
		getAlbum,
		getSongsAlbum,
	};
});
