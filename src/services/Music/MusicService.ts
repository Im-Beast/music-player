/* eslint-disable @typescript-eslint/unbound-method */
import { alertController } from "@ionic/vue";
import { computed, ref } from "vue";

import {
	SongPreview,
	useMusicPlayer,
	type Album,
	type AnySong,
	type Playlist,
} from "@/stores/music-player";
import { useMusicPlayerState } from "@/stores/music-state";

import { AuthorizationService } from "@/services/Authorization/AuthorizationService";
import { Service } from "@/services/Service";
import { useMusicServices } from "@/stores/music-services";

import { useSongMetadata } from "@/stores/metadata";
import { Maybe } from "@/utils/types";

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

interface Identifiable {
	id: string;
}

export abstract class MusicService<
	Song extends AnySong = AnySong,
> extends Service<MusicServiceState> {
	abstract logName: string;
	abstract type: Song["type"];
	abstract available: boolean;

	authorization?: AuthorizationService;

	state = useMusicPlayerState();
	services = useMusicServices();
	metadata = useSongMetadata();

	initialized = false;
	initialPlayed = false;
	song?: Song;

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

	#cache = new Map<string, unknown>();
	cache<Data extends Identifiable>(data: Data): Data {
		this.#cache.set(data.id, data);
		return data;
	}

	cachePromise<Data extends Identifiable>(data: Promise<Data>): Promise<Data> {
		return data.then((data) => {
			this.#cache.set(data.id, data);
			return data;
		});
	}

	getCached<Data extends Identifiable>(id: string): Maybe<Data> {
		return this.#cache.get(id) as Maybe<Data>;
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

	abstract handleSearchSongs(
		term: string,
		offset: number,
		options?: { signal: AbortSignal },
	): AsyncGenerator<SongPreview<Song>>;
	async *searchSongs(
		term: string,
		offset = 0,
		options?: { signal: AbortSignal },
	): AsyncGenerator<SongPreview<Song>> {
		this.log("searchSongs");
		await this.initialize();

		const results = await this.withErrorHandling(
			undefined!,
			this.handleSearchSongs,
			term,
			offset,
			options,
		);
		if (!results) return;

		for await (const result of results) {
			yield result;
		}
	}

	abstract handleGetSongFromPreview(searchResult: SongPreview<Song>): Song | Promise<Song>;
	async getSongFromPreview(searchResult: SongPreview<Song>): Promise<Song> {
		this.log("getSongFromSearchResult");
		return await this.withUnrecoverableErrorHandling(this.handleGetSongFromPreview, searchResult);
	}

	abstract handleSearchHints(term: string): string[] | Promise<string[]>;
	async searchHints(term: string): Promise<string[]> {
		this.log("searchHints");
		await this.initialize();
		return await this.withErrorHandling([], this.handleSearchHints, term);
	}

	abstract handleLibrarySongs(offset: number): Song[] | Promise<Song[]>;
	async librarySongs(offset = 0): Promise<Song[]> {
		this.log("librarySongs");
		await this.initialize();
		const songs = await this.withErrorHandling([], this.handleLibrarySongs, offset);
		songs.map((song) => this.metadata.applyMetadata(song));
		return songs;
	}

	abstract handleRefreshLibrarySongs(): void | Promise<void>;
	async refreshLibrarySongs(): Promise<void> {
		this.log("refresh");
		await this.withErrorHandling(undefined, this.handleRefreshLibrarySongs);
	}

	handleGetSongsAlbum?(song: Song): Maybe<Album> | Promise<Maybe<Album>>;
	async getSongsAlbum(song: Song): Promise<Maybe<Album>> {
		if (!this.handleGetSongsAlbum) {
			throw new Error("This service does not support getSongsAlbum");
		}

		const album = await this.withErrorHandling(undefined, this.handleGetSongsAlbum, song);
		return album;
	}

	handleGetAlbum?(id: string): Maybe<Album> | Promise<Maybe<Album>>;
	async getAlbum(id: string): Promise<Maybe<Album>> {
		this.log("getAlbum");
		await this.initialize();

		if (!this.handleGetAlbum) {
			throw new Error("This service does not support getAlbum");
		}

		const album = await this.withErrorHandling(undefined, this.handleGetAlbum, id);
		return album;
	}

	handleGetPlaylist?(url: URL): Maybe<Playlist> | Promise<Maybe<Playlist>>;
	async getPlaylist(url: URL): Promise<Maybe<Playlist>> {
		if (!this.handleGetPlaylist) {
			throw new Error("This service does not support getPlaylist");
		}

		const playlist = await this.withErrorHandling(undefined, this.handleGetPlaylist, url);
		return playlist;
	}

	abstract handleGetSong(songId: string): Maybe<Song> | Promise<Maybe<Song>>;
	async getSong(songId: string): Promise<Maybe<Song>> {
		this.log("getSong");
		await this.initialize();

		const song = await this.withErrorHandling(undefined, this.handleGetSong, songId);
		if (song) {
			this.metadata.applyMetadata(song);
			return song;
		}
	}

	abstract handleRefreshSong(song: Song): Maybe<Song> | Promise<Maybe<Song>>;
	async refreshSong(song: Song): Promise<Maybe<Song>> {
		this.log("getSong");
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

	async changeSong(song: Song): Promise<void> {
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
