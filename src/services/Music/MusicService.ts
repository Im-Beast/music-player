/* eslint-disable @typescript-eslint/unbound-method */
import { alertController } from "@ionic/vue";
import { computed, ref } from "vue";

import { useMusicPlayerState } from "@/stores/music-state";

import { AuthorizationService } from "@/services/Authorization/AuthorizationService";
import { Service } from "@/services/Service";

import { useLocalImages } from "@/stores/local-images";
import { useSongMetadata } from "@/stores/metadata";
import { useMusicPlayer } from "@/stores/music-player";
import { useMusicServices } from "@/stores/music-services";

import { Maybe } from "@/utils/types";

import {
	Album,
	AlbumPreview,
	Artist,
	ArtistPreview,
	Filled,
	Playlist,
	Song,
	SongPreview,
	SongType,
} from "./objects";

export interface MusicServiceState {
	enabled: boolean;
}

interface MusicServiceEventTypes {
	playing: never;
	ended: never;
	timeupdate: number;
}
type MusicServiceEventType = keyof MusicServiceEventTypes;

export class MusicServiceEvent<Type extends MusicServiceEventType> extends CustomEvent<
	MusicServiceEventTypes[Type]
> {
	constructor(type: Type, detail?: MusicServiceEventTypes[Type]) {
		super(type, { detail });
	}
}

export class SilentError extends Error {
	constructor(message?: string, options?: ErrorOptions) {
		super(message, options);
	}
}

export type SearchFilter = "top-results" | "songs" | "artists" | "albums";
export type SearchResultItem<Type extends SongType = SongType> =
	| Song<Type>
	| SongPreview<Type>
	| Artist<Type>
	| ArtistPreview<Type>
	| Album<Type>
	| AlbumPreview<Type>;

type AnyGenerator<T, TReturn = unknown, TNext = unknown> =
	| Generator<T, TReturn, TNext>
	| AsyncGenerator<T, TReturn, TNext>;

export abstract class MusicService<
	Type extends SongType = SongType,
> extends Service<MusicServiceState> {
	abstract logName: string;
	abstract type: Type;
	abstract available: boolean;

	authorization?: AuthorizationService;

	state = useMusicPlayerState();
	services = useMusicServices();
	metadata = useSongMetadata();

	initialized = false;
	initialPlayed = false;
	song?: Song<Type>;

	#enabled = ref(false);
	enabled = computed({
		get: () => {
			const enabled = this.#enabled.value;
			return this.available && enabled;
		},
		set: async (value) => {
			if (value) {
				await this.enable();
			} else {
				await this.disable();
			}
		},
	});

	constructor() {
		super();

		// Execute restoreState after the whole class has been instantiated
		queueMicrotask(() => void this.restoreState());

		this.addEventListener("playing", () => {
			const musicPlayer = useMusicPlayer();
			musicPlayer.addMusicSessionActionHandlers();
		});

		this.addEventListener("ended", async () => {
			const musicPlayer = useMusicPlayer();
			await musicPlayer.skipNext();
		});

		this.addEventListener("timeupdate", (event) => {
			this.state.time = event.detail;
		});
	}

	dispatchEvent<Type extends MusicServiceEventType>(event: MusicServiceEvent<Type>): boolean {
		return super.dispatchEvent(event);
	}

	addEventListener<Type extends MusicServiceEventType>(
		type: Type,
		callback:
			| ((event: MusicServiceEvent<Type>) => void)
			| { handleEvent(object: MusicServiceEvent<Type>): void }
			| null,
		options?: AddEventListenerOptions | boolean,
	): void {
		super.addEventListener(type, callback as EventListenerOrEventListenerObject | null, options);
	}

	async enable(): Promise<void> {
		this.log("enable");
		this.#enabled.value = true;
		await this.initialize();
		await this.saveState({ enabled: true });
	}

	async disable(): Promise<void> {
		this.log("disable");
		this.#enabled.value = false;
		await this.deinitialize();
		await this.saveState({ enabled: false });
	}

	async restoreState(): Promise<void> {
		if (!this.available) return;

		this.log("restoreState");
		const state = await this.getSavedState();
		if (!state) return;

		this.enabled.value = state.enabled;
	}

	// TODO: Rework error handling, instead of wrapping function in this
	//		 just allow throwing {Silent,Unrecoverable,Recoverable}Error classes
	async withUnrecoverableErrorHandling<const Fn extends (...args: any) => any>(
		fn: Fn,
		...args: Parameters<Fn>
	): Promise<Awaited<ReturnType<Fn>>> {
		try {
			return await fn.apply(this, args);
		} catch (error) {
			if (error instanceof SilentError) throw error;

			console.error("Unrecoverable", error);

			const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);

			const alert = await alertController.create({
				header: "Unrecoverable error!",
				subHeader: this.logName,
				message: `${this.logName} threw an unrecoverable error:\n${errorMessage}`,
				buttons: [
					{ text: "Retry", role: "cancel" },
					{ text: "Ignore", role: "confirm" },
					{ text: "Disable", role: "destructive" },
				],
			});

			await alert.present();
			const { role } = await alert.onDidDismiss();
			switch (role) {
				case "cancel":
					return this.withUnrecoverableErrorHandling(fn, ...args);
				case "destructive":
					await this.disable();
					throw error;
			}

			return null as any;
		}
	}

	async withErrorHandling<const Fn extends (...args: any) => any>(
		fallback: Awaited<ReturnType<Fn>>,
		fn: Fn,
		...args: Parameters<Fn>
	): Promise<Awaited<ReturnType<Fn>>> {
		try {
			return await fn.apply(this, args);
		} catch (error) {
			if (error instanceof SilentError) return fallback;

			console.error("Recoverable", error);

			const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);

			const alert = await alertController.create({
				header: "Error!",
				subHeader: this.logName,
				message: `${this.logName} threw an error:\n${errorMessage}`,
				buttons: [
					{ text: "Retry", role: "cancel" },
					{ text: "Ignore", role: "confirm" },
					{ text: "Disable", role: "destructive" },
				],
			});

			await alert.present();
			const { role } = await alert.onDidDismiss();

			switch (role) {
				case "cancel":
					return this.withErrorHandling(fallback, fn, ...args);
				case "destructive":
					await this.disable();
					break;
			}

			return fallback;
		}
	}

	handleSearchForItems?(
		term: string,
		filter: SearchFilter,
		signal?: AbortSignal,
	): AnyGenerator<SearchResultItem<Type>>;
	async *searchForItems(
		term: string,
		filter: SearchFilter,
		signal?: AbortSignal,
	): AsyncGenerator<SearchResultItem<Type>> {
		this.log("searchForItems");
		await this.initialize();

		if (!this.handleSearchForItems) {
			throw new Error("This service does not support handleSearchForItems");
		}

		const results = await this.withErrorHandling(
			undefined!,
			this.handleSearchForItems,
			term,
			filter,
			signal,
		);
		if (!results) return;

		yield* results;
	}

	abstract handleGetSongFromPreview(
		songPreview: SongPreview<Type>,
	): Song<Type> | Promise<Song<Type>>;
	async getSongFromPreview(songPreview: SongPreview<Type>): Promise<Song<Type>> {
		this.log("getSongFromPreview");
		return await this.withUnrecoverableErrorHandling(this.handleGetSongFromPreview, songPreview);
	}

	handleGetSearchHints?(term: string): AnyGenerator<string>;
	async *getSearchHints(term: string): AsyncGenerator<string> {
		this.log("getSearchHints");
		await this.initialize();
		if (!this.handleGetSearchHints) {
			throw new Error("This service does not support getSearchHints");
		}

		const searchHints = await this.withErrorHandling(undefined!, this.handleGetSearchHints, term);
		if (!searchHints) return;

		yield* searchHints;
	}

	handleGetLibrarySongs?(): AnyGenerator<Song<Type>>;
	async *getLibrarySongs(): AsyncGenerator<Song<Type>> {
		this.log("librarySongs");
		if (!this.handleGetLibrarySongs) return;

		await this.initialize();
		const songs = await this.withErrorHandling(undefined!, this.handleGetLibrarySongs);

		for await (const song of songs) {
			yield this.metadata.applyMetadata(song);
		}

		return songs;
	}

	handleRefreshLibrarySongs?(): void | Promise<void>;
	async refreshLibrarySongs(): Promise<void> {
		this.log("refreshLibrarySongs");
		if (!this.handleRefreshLibrarySongs) {
			throw new Error("This service does not support refreshLibrarySongs");
		}
		await this.withErrorHandling(undefined, this.handleRefreshLibrarySongs);

		const localImages = useLocalImages();
		localImages.deduplicate();
	}

	handleGetLibraryAlbums?(options?: {
		signal?: AbortSignal;
	}): AnyGenerator<AlbumPreview<Type> | Album<Type>>;
	async *getLibraryAlbums(options?: {
		signal?: AbortSignal;
	}): AsyncGenerator<AlbumPreview<Type> | Album<Type>> {
		this.log("getLibraryAlbums");
		if (!this.handleGetLibraryAlbums) {
			throw new Error("This service does not support getLibraryAlbums");
		}

		const albums = await this.withErrorHandling(undefined!, this.handleGetLibraryAlbums, options);
		if (!albums) return;

		yield* albums;
	}

	handleRefreshLibraryAlbums?(): void | Promise<void>;
	async refreshLibraryAlbums(): Promise<void> {
		this.log("refreshLibraryAlbums");
		if (!this.handleRefreshLibraryAlbums) {
			throw new Error("This service does not support refreshLibraryAlbums");
		}

		await this.withErrorHandling(undefined!, this.handleRefreshLibraryAlbums);
	}

	handleGetLibraryArtists?(options?: {
		signal?: AbortSignal;
	}): AnyGenerator<ArtistPreview<Type> | Artist<Type>>;
	async *getLibraryArtists(options?: {
		signal?: AbortSignal;
	}): AsyncGenerator<ArtistPreview<Type> | Artist<Type>> {
		this.log("getLibraryArtists");
		if (!this.handleGetLibraryArtists) {
			throw new Error("This service does not support getLibraryArtists");
		}

		const artists = await this.withErrorHandling(undefined!, this.handleGetLibraryArtists, options);
		if (!artists) return;

		yield* artists;
	}

	handleRefreshLibraryArtists?(): void | Promise<void>;
	async refreshLibraryArtists(): Promise<void> {
		this.log("refreshLibraryArtists");
		if (!this.handleRefreshLibraryArtists) {
			throw new Error("This service does not support refreshLibraryArtists");
		}

		await this.withErrorHandling(undefined!, this.handleRefreshLibraryArtists);
	}

	handleGetSongsAlbum?(song: Song<Type>): Maybe<Album<Type>> | Promise<Maybe<Album<Type>>>;
	async getSongsAlbum(song: Song<Type>): Promise<Maybe<Album<Type>>> {
		this.log("getSongsAlbum");
		if (!this.handleGetSongsAlbum) {
			throw new Error("This service does not support getSongsAlbum");
		}

		const album = await this.withErrorHandling(undefined, this.handleGetSongsAlbum, song);
		return album;
	}

	handleGetAlbum?(id: string): Maybe<Album<Type>> | Promise<Maybe<Album<Type>>>;
	async getAlbum(id: string): Promise<Maybe<Album<Type>>> {
		this.log("getAlbum");
		await this.initialize();

		if (!this.handleGetAlbum) {
			throw new Error("This service does not support getAlbum");
		}

		const album = await this.withErrorHandling(undefined, this.handleGetAlbum, id);
		return album;
	}

	abstract handleGetAlbumFromPreview(
		albumPreview: AlbumPreview<Type>,
	): Album<Type> | Promise<Album<Type>>;
	async getAlbumFromPreview(albumPreview: AlbumPreview<Type>): Promise<Album<Type>> {
		this.log("getAlbumFromPreview");
		return await this.withUnrecoverableErrorHandling(this.handleGetAlbumFromPreview, albumPreview);
	}

	handleGetPlaylist?(url: URL): Maybe<Playlist> | Promise<Maybe<Playlist>>;
	async getPlaylist(url: URL): Promise<Maybe<Playlist>> {
		this.log("getPlaylist");
		if (!this.handleGetPlaylist) {
			throw new Error("This service does not support getPlaylist");
		}

		const playlist = await this.withErrorHandling(undefined, this.handleGetPlaylist, url);
		return playlist;
	}

	handleGetArtist?(id: string): Maybe<Artist<Type>> | Promise<Maybe<Artist<Type>>>;
	async getArtist(id: string): Promise<Maybe<Artist<Type>>> {
		this.log("getArtist");
		if (!this.handleGetArtist) {
			throw new Error("This service does not support getArtist");
		}

		const artist = await this.withErrorHandling(undefined, this.handleGetArtist, id);
		return artist;
	}

	handleGetArtistsSongs?(
		artist: Artist | Filled<Artist>,
		signal?: AbortSignal,
	): AnyGenerator<Song<Type> | SongPreview<Type>>;
	async *getArtistsSongs(
		artist: Artist | Filled<Artist>,
		signal?: AbortSignal,
	): AsyncGenerator<Song<Type> | SongPreview<Type>> {
		this.log("getArtistsSongs");
		if (!this.handleGetArtistsSongs) {
			throw new Error("This service does not support getArtistsSongs");
		}

		const songs = await this.withErrorHandling(
			undefined!,
			this.handleGetArtistsSongs,
			artist,
			signal,
		);
		if (!songs) return;

		yield* songs;
	}

	abstract handleGetSong(songId: string): Maybe<Song<Type>> | Promise<Maybe<Song<Type>>>;
	async getSong(songId: string): Promise<Maybe<Song<Type>>> {
		this.log("getSong");
		await this.initialize();

		const song = await this.withErrorHandling(undefined, this.handleGetSong, songId);
		if (song) {
			this.metadata.applyMetadata(song);
			return song;
		}
	}

	abstract handleRefreshSong(song: Song<Type>): Maybe<Song<Type>> | Promise<Maybe<Song<Type>>>;
	async refreshSong(song: Song<Type>): Promise<Maybe<Song<Type>>> {
		this.log("refreshSong");
		await this.initialize();

		const refreshed = await this.withErrorHandling(undefined, this.handleRefreshSong, song);
		if (!refreshed) {
			return;
		}

		this.metadata.applyMetadata(refreshed);
		for (const { song } of this.state.queue) {
			if (song.id === refreshed.id) {
				this.metadata.applyMetadata(song);
				Object.assign(song, refreshed);
			}
		}

		return refreshed;
	}

	async changeSong(song: Song<Type>): Promise<void> {
		this.log("changeSong");
		if (this.song === song) return;

		if (this.initialized) {
			await this.stop();
		}
		this.song = song;

		this.state.time = 0;
		this.state.duration = song.duration ?? 1;
	}

	#initialization?: PromiseWithResolvers<void>;
	abstract handleInitialization(): void | Promise<void>;
	async initialize(): Promise<void> {
		this.log("initialize");
		if (this.initialized) {
			this.log("already initialized");
			return;
		} else if (this.#initialization) {
			this.log("awaiting already pending initialization");
			return await this.#initialization.promise;
		} else {
			this.#initialization = Promise.withResolvers();
		}

		if (this.authorization) {
			await this.withUnrecoverableErrorHandling(() => this.authorization!.passivelyAuthorize());
		}

		this.log("initializing");

		try {
			await this.withUnrecoverableErrorHandling(this.handleInitialization);
		} catch (error) {
			this.#initialization?.reject(error);
			this.#initialization = undefined;

			if (error instanceof SilentError) throw error;
			throw error;
		}

		this.initialized = true;
		this.#initialization.resolve();
		this.#initialization = undefined;
	}

	#deinitialization?: PromiseWithResolvers<void>;
	abstract handleDeinitialization(): void | Promise<void>;
	async deinitialize(): Promise<void> {
		this.log("deinitialize");
		if (!this.initialized) {
			this.log("Already deinitialized");
			return;
		} else if (this.#deinitialization) {
			return await this.#deinitialization.promise;
		} else {
			this.#deinitialization = Promise.withResolvers();
		}

		try {
			await this.withUnrecoverableErrorHandling(this.handleDeinitialization);
		} catch (error) {
			this.#deinitialization.reject(error);
			this.#deinitialization = undefined;
			throw error;
		}

		this.initialized = false;
		this.#deinitialization.resolve();
		this.#deinitialization = undefined;
	}

	abstract handlePlay(): void | Promise<void>;
	abstract handleResume(): Promise<void>;
	// TODO: Support cancelling pending operations
	async play(): Promise<void> {
		this.state.loading.playPause = true;

		try {
			if (this.initialPlayed) {
				this.log("resume");
				await this.withUnrecoverableErrorHandling(this.handleResume);
			} else {
				await this.initialize();

				await this.seekToTime(0);
				await this.setVolume(this.state.volume);

				this.log("stopping other services");
				for (const service of this.services.enabledServices) {
					if (service === this) {
						continue;
					}
					await service.stop();
				}

				this.log("play");
				await this.withUnrecoverableErrorHandling(this.handlePlay);
				this.initialPlayed = true;
			}
		} catch (error) {
			this.state.loading.playPause = false;
			throw error;
		}

		this.state.loading.playPause = false;
		this.state.playing = true;
	}

	abstract handlePause(): void | Promise<void>;
	async pause(): Promise<void> {
		this.log("pause");
		this.state.loading.playPause = true;

		try {
			await this.withUnrecoverableErrorHandling(this.handlePause);
		} catch (error) {
			this.state.loading.playPause = false;
			throw error;
		}

		this.state.loading.playPause = false;
		this.state.playing = false;
	}

	abstract handleStop(): void | Promise<void>;
	async stop(): Promise<void> {
		this.log("stop");

		this.song = undefined;
		this.initialPlayed = false;

		this.state.loading.playPause = true;

		try {
			await this.withUnrecoverableErrorHandling(this.handleStop);
		} catch (error) {
			this.state.loading.playPause = false;
			throw error;
		}

		this.state.loading.playPause = false;
		this.state.playing = false;
	}

	async togglePlay(): Promise<void> {
		this.log("togglePlay");
		if (this.state.playing) {
			await this.pause();
		} else {
			await this.play();
		}
	}

	abstract handleSeekToTime(timeInSeconds: number): void | Promise<void>;
	async seekToTime(timeInSeconds: number): Promise<void> {
		this.log("seekToTime");
		await this.initialize();
		await this.withUnrecoverableErrorHandling(this.handleSeekToTime, timeInSeconds);
		this.state.time = timeInSeconds;
	}

	abstract handleSetVolume(volume: number): void | Promise<void>;
	async setVolume(volume: number): Promise<void> {
		this.log("setVolume");
		await this.initialize();
		await this.withUnrecoverableErrorHandling(this.handleSetVolume, volume);
		this.state.volume = volume;
	}
}
