import { useSongMetadata } from "@/stores/metadata";
import { AnySong, SongImage, useMusicPlayer } from "@/stores/music-player";

import { Service } from "@/services/Service";

export interface SongSearchResult<Song extends AnySong = AnySong> {
	type: Song["type"];

	id: string;
	title?: string;
	artist?: string;
	album?: string;
	artwork?: SongImage;
}

export abstract class MusicPlayerService<
	Song extends AnySong = AnySong,
	const SearchResult extends SongSearchResult<Song> = SongSearchResult<Song>,
> extends Service {
	abstract logName: string;

	store = useMusicPlayer();
	metadataStore = useSongMetadata();
	initialized = false;
	initialPlayed = false;
	song?: Song;

	static initializedServices = new Set<MusicPlayerService>();
	static async stopServices(except?: MusicPlayerService): Promise<void> {
		console.log(
			`%cMusicPlayerService:`,
			`color: #91dd80; font-weight: bold;`,
			"Deinitializing MusicPlayer services",
		);

		for (const service of MusicPlayerService.initializedServices) {
			if (service === except) continue;
			await service.stop();
		}
	}

	// TODO: make search and library return reactive arrays
	abstract handleSearchSongs(term: string, offset: number): Promise<SearchResult[]>;
	async searchSongs(term: string, offset = 0): Promise<SearchResult[]> {
		this.log("searchSongs");
		await this.initialize();
		return await this.handleSearchSongs(term, offset);
	}

	abstract handleGetSongFromSearchResult(searchResult: SearchResult): Song | Promise<Song>;
	async getSongFromSearchResult(searchResult: SearchResult): Promise<Song> {
		this.log("getSongFromSearchResult");
		return await this.handleGetSongFromSearchResult(searchResult);
	}

	abstract handleSearchHints(term: string): string[] | Promise<string[]>;
	async searchHints(term: string): Promise<string[]> {
		this.log("searchHints");
		await this.initialize();
		return await this.handleSearchHints(term);
	}

	abstract handleLibrarySongs(offset: number): Promise<Song[]>;
	async librarySongs(offset = 0): Promise<Song[]> {
		this.log("librarySongs");
		await this.initialize();
		const songs = await this.handleLibrarySongs(offset);
		for (const song of songs) {
			await this.applyMetadata(song);
		}
		return songs;
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
		await this.handleApplyMetadata(song);
	}

	abstract handleRefreshLibrarySongs(): void | Promise<void>;
	async refreshLibrarySongs(): Promise<void> {
		this.log("refresh");
		await this.handleRefreshLibrarySongs();
	}

	abstract handleRefreshSong(song: Song): Song | Promise<Song>;
	async refreshSong(song: Song): Promise<void> {
		const refreshed = await this.handleRefreshSong(song);
		if (song.id !== refreshed.id) {
			throw new Error("Refreshing song unexpectedly changed its id");
		}
		await this.applyMetadata(refreshed);

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

	abstract handleInitialization(): void | Promise<void>;
	async initialize(): Promise<void> {
		if (this.initialized) return;
		this.log("initialize");

		await this.handleInitialization();

		this.initialized = true;
		MusicPlayerService.initializedServices.add(this);
	}

	abstract handleDeinitialization(): void | Promise<void>;
	async deinitialize(): Promise<void> {
		this.log("deinitialize");
		if (!this.initialized) return;
		await this.handleDeinitialization();
		this.song = undefined;
		this.initialized = false;
		this.initialPlayed = false;
		MusicPlayerService.initializedServices.delete(this);
	}

	abstract handlePlay(): void | Promise<void>;
	abstract handleResume(): Promise<void>;
	async play(): Promise<void> {
		this.store.loading = true;

		if (this.initialPlayed) {
			this.log("resume");
			await this.handleResume();
		} else {
			this.log("play");
			await this.initialize();
			await MusicPlayerService.stopServices(this);
			await this.handlePlay();
			this.initialPlayed = true;
		}

		this.store.loading = false;
		this.store.playing = true;
	}

	abstract handlePause(): void | Promise<void>;
	async pause(): Promise<void> {
		this.log("pause");
		this.store.loading = true;

		await this.handlePause();

		this.store.loading = false;
		this.store.playing = false;
	}

	abstract handleStop(): void | Promise<void>;
	async stop(): Promise<void> {
		this.log("stop");
		this.store.loading = true;

		await this.handleStop();
		await this.deinitialize();

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
		await this.handleSeekToTime(timeInSeconds);
		this.store.time = timeInSeconds;
	}

	abstract handleSetVolume(volume: number): void | Promise<void>;
	async setVolume(volume: number): Promise<void> {
		this.log("setVolume");
		await this.initialize();
		await this.handleSetVolume(volume);
		this.store.volume = volume;
	}
}
