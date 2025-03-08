/* eslint-disable @typescript-eslint/unbound-method */

import { useSongMetadata } from "@/stores/metadata";
import { AnySong, Playlist, SongImage, useMusicPlayer } from "@/stores/music-player";

import { Service } from "@/services/Service";
import { Maybe } from "@/utils/types";
import { alertController } from "@ionic/vue";
import { computed, reactive, ref } from "vue";
import { AuthorizationService } from "../Authorization/AuthorizationService";

export interface MusicPlayerServiceState {
	enabled: boolean;
}

export interface SongSearchResult<Song extends AnySong = AnySong> {
	type: Song["type"];

	id: string;
	artists: string[];
	title?: string;
	album?: string;
	artwork?: SongImage;
}

export class SilentError extends Error {
	constructor(message?: string, options?: ErrorOptions) {
		super(message, options);
	}
}

export abstract class MusicPlayerService<
	Song extends AnySong = AnySong,
	const SearchResult extends SongSearchResult<Song> = SongSearchResult<Song>,
> extends Service<MusicPlayerServiceState> {
	abstract logName: string;
	abstract type: Song["type"];
	abstract available: boolean;

	authorization?: AuthorizationService;

	store = useMusicPlayer();
	metadataStore = useSongMetadata();
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
	}

	async restoreState(): Promise<void> {
		if (!this.available) return;

		this.log("restoreState");
		const state = await this.getSavedState();
		if (!state) return;

		this.enabled.value = state.enabled;
	}

	async disable(): Promise<void> {
		this.log("disable");
		this.#enabled.value = false;
		await this.deinitialize();
		await this.saveState({ enabled: false });
	}

	async enable(): Promise<void> {
		this.log("enable");
		this.#enabled.value = true;
		await this.initialize();
		await this.saveState({ enabled: true });
	}

	static #registeredServices: Record<string, MusicPlayerService> = reactive({});
	static registerService(service: MusicPlayerService): void {
		this.#registeredServices[service.type] = service;
	}
	static getRegisteredServices(): Readonly<Record<string, MusicPlayerService>> {
		return this.#registeredServices;
	}
	static getEnabledServices(): MusicPlayerService[] {
		return Object.values(this.#registeredServices).filter((service) => service.enabled.value);
	}
	static getService(type: string): Maybe<MusicPlayerService> {
		const service = this.#registeredServices[type];
		if (!service.enabled) return undefined;
		return service;
	}

	static async stopServices(except?: MusicPlayerService): Promise<void> {
		console.log(
			`%cMusicPlayerService:`,
			`color: #91dd80; font-weight: bold;`,
			"Deinitializing MusicPlayer services",
		);

		for (const service of MusicPlayerService.getEnabledServices()) {
			if (service === except) continue;
			await service.stop();
		}
	}

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

	// TODO: make search and library return reactive arrays
	abstract handleSearchSongs(term: string, offset: number): Promise<SearchResult[]>;
	async searchSongs(term: string, offset = 0): Promise<SearchResult[]> {
		this.log("searchSongs");
		await this.initialize();
		return await this.withErrorHandling([], this.handleSearchSongs, term, offset);
	}

	abstract handleGetSongFromSearchResult(searchResult: SearchResult): Song | Promise<Song>;
	async getSongFromSearchResult(searchResult: SearchResult): Promise<Song> {
		this.log("getSongFromSearchResult");
		return await this.withUnrecoverableErrorHandling(
			this.handleGetSongFromSearchResult,
			searchResult,
		);
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
		const songs = await this.withUnrecoverableErrorHandling(async () => {
			const songs = await this.handleLibrarySongs(offset);
			for (const song of songs) {
				await this.applyMetadata(song);
			}
			return songs;
		});
		return songs;
	}

	handleGetPlaylist?(url: URL): Maybe<Playlist> | Promise<Maybe<Playlist>>;
	async getPlaylist(url: URL): Promise<Maybe<Playlist>> {
		if (!this.handleGetPlaylist) {
			throw new Error("This service does not support getPlaylist");
		}

		const playlist = await this.withErrorHandling(undefined, this.handleGetPlaylist, url);
		return playlist;
	}

	async handleApplyMetadata(song: Song): Promise<void> {
		const metadata = await this.metadataStore.getMetadata(song);
		if (Object.keys(metadata).length > 0) {
			this.log("Applied metadata override for", song.id);
			Object.assign(song, metadata satisfies Partial<AnySong>);
		}
	}
	async applyMetadata(song: Song): Promise<void> {
		this.log("applyMetadata");
		await this.withErrorHandling(undefined, this.handleApplyMetadata, song);
	}

	abstract handleRefreshLibrarySongs(): void | Promise<void>;
	async refreshLibrarySongs(): Promise<void> {
		this.log("refresh");
		await this.withErrorHandling(undefined, this.handleRefreshLibrarySongs);
	}

	abstract handleRefreshSong(song: Song): Song | Promise<Song>;
	async refreshSong(song: Song): Promise<void> {
		const refreshed = await this.handleRefreshSong(song);
		if (song.id !== refreshed.id) {
			throw new Error("Refreshing song unexpectedly changed its id");
		}
		await this.withErrorHandling(undefined, this.applyMetadata, refreshed);

		for (const [i, song] of this.store.queuedSongs.entries()) {
			if (song.id === refreshed.id) {
				this.store.queuedSongs[i] = refreshed;
			}
		}
	}

	async changeSong(song: Song): Promise<void> {
		this.log("changeSong");
		if (this.song === song) return;

		if (this.initialized) {
			await this.stop();
		}

		this.song = song;
		this.store.time = 0;
		this.store.duration = song.duration ?? 1;
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

		await this.seekToTime(0);
		await this.setVolume(this.store.volume);
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
	async play(): Promise<void> {
		this.store.loading = true;

		try {
			if (this.initialPlayed) {
				this.log("resume");
				await this.withUnrecoverableErrorHandling(this.handleResume);
			} else {
				await this.initialize();
				await MusicPlayerService.stopServices(this);
				this.log("play");
				await this.withUnrecoverableErrorHandling(this.handlePlay);
				this.initialPlayed = true;
			}
		} catch (error) {
			this.store.loading = false;
			throw error;
		}

		this.store.loading = false;
		this.store.playing = true;
	}

	abstract handlePause(): void | Promise<void>;
	async pause(): Promise<void> {
		this.log("pause");
		this.store.loading = true;

		try {
			await this.withUnrecoverableErrorHandling(this.handlePause);
		} catch (error) {
			this.store.loading = false;
			throw error;
		}

		this.store.loading = false;
		this.store.playing = false;
	}

	abstract handleStop(): void | Promise<void>;
	async stop(): Promise<void> {
		this.log("stop");

		this.song = undefined;
		this.initialPlayed = false;

		this.store.loading = true;

		try {
			await this.withUnrecoverableErrorHandling(this.handleStop);
		} catch (error) {
			this.store.loading = false;
			throw error;
		}

		this.store.loading = false;
		this.store.playing = false;
	}

	async togglePlay(): Promise<void> {
		this.log("togglePlay");
		if (this.store.playing) {
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
		this.store.time = timeInSeconds;
	}

	abstract handleSetVolume(volume: number): void | Promise<void>;
	async setVolume(volume: number): Promise<void> {
		this.log("setVolume");
		await this.initialize();
		await this.withUnrecoverableErrorHandling(this.handleSetVolume, volume);
		this.store.volume = volume;
	}
}
