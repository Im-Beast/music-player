import { defineStore } from "pinia";
import { computed, reactive } from "vue";

import { MusicService } from "@/services/Music/MusicService";

import { LocalMusicService } from "@/services/Music/LocalMusicService";
import { MusicKitMusicService } from "@/services/Music/MusicKitMusicService";
import { YouTubeMusicService } from "@/services/Music/YouTubeMusicService";

import { Album, AlbumPreview, Artist, Song, SongPreview } from "@/services/Music/objects";
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
	): AsyncGenerator<SongPreview | Song> {
		for (const service of enabledServices.value) {
			yield* service.searchSongs(term, offset, options);
		}
	}

	async function* librarySongs(offset = 0): AsyncGenerator<Song> {
		for (const service of enabledServices.value) {
			if (!service.handleGetLibrarySongs) continue;
			yield* service.getLibrarySongs(offset);
		}
	}

	async function refreshLibrarySongs(): Promise<void> {
		await withAllServices((service) => {
			return service.handleRefreshLibrarySongs && service.refreshLibrarySongs();
		});
	}

	async function* libraryAlbums(): AsyncGenerator<AlbumPreview> {
		for (const service of enabledServices.value) {
			if (!service.handleGetLibraryAlbums) continue;
			yield* service.getLibraryAlbums();
		}
	}

	async function refreshLibraryAlbums(): Promise<void> {
		await withAllServices((service) => {
			return service.handleRefreshLibraryAlbums && service.refreshLibraryAlbums();
		});
	}

	async function refreshSong(song: Song): Promise<Maybe<Song>> {
		return await getService(song.type)?.refreshSong(song);
	}

	async function getSongFromPreview(searchResult: SongPreview): Promise<Song> {
		const service = getService(searchResult.type)!;
		const song = await service.getSongFromPreview(searchResult);
		return song;
	}

	async function retrieveSong(song: Song | SongPreview): Promise<Song> {
		if (song.kind === "songPreview") {
			return await getSongFromPreview(song);
		}
		return song;
	}

	async function getAvailableSongs(songs: (Song | SongPreview)[]): Promise<Song[]> {
		return await Promise.all(songs.filter((song) => song?.available).map(retrieveSong));
	}

	async function getSong(type: Song["type"], id: string): Promise<Maybe<Song>> {
		return await getService(type)?.getSong(id);
	}

	async function getAlbum(type: Song["type"], id: string): Promise<Maybe<Album>> {
		return await getService(type)?.getAlbum(id);
	}

	async function getSongsAlbum(song: Song): Promise<Maybe<Album>> {
		return await getService(song.type)?.getSongsAlbum(song);
	}

	async function getArtist(type: Song["type"], id: string): Promise<Maybe<Artist>> {
		return await getService(type)?.getArtist(id);
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

		getSong,
		refreshSong,
		retrieveSong,
		getSongFromPreview,
		getAvailableSongs,
		librarySongs,
		refreshLibrarySongs,

		getAlbum,
		libraryAlbums,
		refreshLibraryAlbums,
		getSongsAlbum,

		getArtist,
	};
});
