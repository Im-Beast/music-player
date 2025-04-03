import { useIDBKeyval } from "@vueuse/integrations/useIDBKeyval.mjs";
import { computed } from "vue";

import Fuse from "fuse.js";
import { parseBuffer, selectCover } from "music-metadata";

import LocalMusic from "@/plugins/LocalMusicPlugin";

import { LocalImage, useLocalImages } from "@/stores/local-images";
import { LocalSong } from "@/stores/music-player";

import { MusicService, MusicServiceEvent } from "@/services/Music/MusicService";

import { base64StringToBuffer } from "@/utils/buffer";
import { generateUUID } from "@/utils/crypto";
import { getPlatform } from "@/utils/os";
import { audioMimeTypeFromPath } from "@/utils/path";
import { generateSongStyle } from "@/utils/songs";
import { Maybe } from "@/utils/types";

const $localSongs = useIDBKeyval<LocalSong[]>("localMusicSongs", []);
const localSongs = computed<LocalSong[]>({
	get: () => $localSongs.data.value,
	set: (value) => ($localSongs.data.value = value),
});

async function* getSongPaths(): AsyncGenerator<{ filePath: string; id?: string }> {
	switch (getPlatform()) {
		case "android": {
			const { songs } = await LocalMusic.getSongs();
			for (const song of songs) {
				yield { id: song.id, filePath: song.path };
			}
			break;
		}
		case "electron": {
			const musicPath = await ElectronMusicPlayer!.getMusicPath();
			yield* traverseDirectory(musicPath);
			break;
		}
		default:
			yield* traverseDirectory("/");
			break;
	}
}

async function* traverseDirectory(path: string): AsyncGenerator<{ filePath: string }> {
	if (getPlatform() === "electron") {
		for (const filePath of await ElectronMusicPlayer!.traverseDirectory(path)) {
			yield { filePath };
		}
	} else {
		const { Directory, Filesystem } = await import("@capacitor/filesystem");

		const { files } = await Filesystem.readdir({
			path,
			directory: Directory.Documents,
		});

		for (const file of files) {
			// Ignore deleted files
			if (file.name === ".Trash") {
				continue;
			}

			const filePath = `${path}/${file.name}`;

			if (file.type === "directory") {
				yield* traverseDirectory(filePath);
				continue;
			}

			yield { filePath };
		}
	}
}

async function readSongFile(path: string): Promise<Uint8Array> {
	switch (getPlatform()) {
		case "android": {
			const { data } = await LocalMusic.readSong({ path });
			const buffer = base64StringToBuffer(data);
			return buffer;
		}
		case "electron": {
			const buffer = await ElectronMusicPlayer!.readFile(path);
			return buffer;
		}
		default: {
			const { Filesystem, Directory } = await import("@capacitor/filesystem");

			const { data } = await Filesystem.readFile({
				path,
				directory: Directory.Documents,
			});

			if (data instanceof Blob) return await data.bytes();
			const buffer = base64StringToBuffer(data);
			return buffer;
		}
	}
}

async function parseLocalSong(buffer: Uint8Array, path: string, id: string): Promise<LocalSong> {
	const metadata = await parseBuffer(buffer, {
		path,
		mimeType: audioMimeTypeFromPath(path),
	});

	const { common, format } = metadata;

	const artists = common.artists ?? [];
	const album = common.album;
	const title = common.title ?? path.split("\\").pop()!.split("/").pop();
	const duration = format.duration;
	const genres = common.genre ?? [];

	const coverImage = selectCover(common.picture);
	let artwork: Maybe<LocalImage>;
	if (coverImage) {
		const localImages = useLocalImages();
		const { data, type } = coverImage;
		const artworkBlob = new Blob([data], { type });
		await localImages.associateImage(id, artworkBlob, {
			maxHeight: 512,
			maxWidth: 512,
		});
		artwork = { id };
	}

	return {
		type: "local",

		available: true,
		// TODO: Try to find a way to classify local files as explicit
		explicit: false,

		id,
		artists,
		album,
		title,
		duration,
		genres,

		artwork,
		style: await generateSongStyle(artwork),

		data: { path },
	};
}

async function getLocalSongs(clearCache = false): Promise<LocalSong[]> {
	if (clearCache) {
		localSongs.value = [];
	} else if (localSongs.value.length) {
		return localSongs.value;
	}

	// Required for Documents folder to show up in Files
	// NOTE: Hidden file doesn't work
	if (getPlatform() === "ios") {
		const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");

		try {
			await Filesystem.writeFile({
				path: "/readme.txt",
				data:
					"Place your music files in this directory. They should be automatically recognized by the app.",
				encoding: Encoding.UTF8,
				directory: Directory.Documents,
			});
		} catch (error) {
			console.log("Errored on writing readme.txt:", error instanceof Error ? error.message : error);
		}
	}

	try {
		for await (const { filePath, id } of getSongPaths()) {
			// Skip non-audio file types
			// We ignore this check for android, since it uses MediaStore API
			// and content paths don't have an extension
			if (getPlatform() !== "android" && !audioMimeTypeFromPath(filePath)) continue;

			const data = await readSongFile(filePath);
			const song = await parseLocalSong(data, filePath, id ?? generateUUID());
			localSongs.value.push(song);
		}
	} catch (error) {
		console.log("Errored on getSongs:", error instanceof Error ? error.message : error);
	}

	return localSongs.value;
}

export class LocalMusicService extends MusicService<LocalSong> {
	logName = "LocalMusicService";
	logColor = "#ddd480";
	type = "local" as const;
	available = getPlatform() !== "web";

	audio?: HTMLAudioElement;

	constructor() {
		super();
	}

	handleSearchHints(_term: string): string[] {
		return [];
	}

	#fuse?: Fuse<LocalSong>;
	async *handleSearchSongs(
		term: string,
		offset: number,
		options?: { signal: AbortSignal },
	): AsyncGenerator<LocalSong> {
		// TODO: Maybe split results in smaller chunks and actually paginate it?
		if (offset > 0) {
			return;
		}

		if (!this.#fuse) {
			const allSongs = await getLocalSongs();

			// TODO: This might require some messing around with distance/threshold settings to not make it excessively loose
			this.#fuse = new Fuse(allSongs, {
				keys: ["title", "artists", "album", "genres"] satisfies (keyof LocalSong)[],
			});
		}

		const results = this.#fuse.search(term);
		for (const { item } of results) {
			if (options?.signal?.aborted) {
				return;
			}

			yield item;
		}
	}

	handleGetSongFromPreview(searchResult: LocalSong): LocalSong {
		return searchResult;
	}

	async handleLibrarySongs(_offset: number): Promise<LocalSong[]> {
		// TODO: Just like search, maybe paginate?
		return getLocalSongs();
	}

	async handleRefreshLibrarySongs(): Promise<void> {
		this.#fuse = undefined;
		await getLocalSongs(true);
	}

	handleGetSong(songId: string): Maybe<LocalSong> {
		const cached = this.getCached<LocalSong>(songId);
		if (cached) return cached;

		const song = localSongs.value.find((song) => song.id === songId);
		return song && this.cache(song);
	}

	async handleRefreshSong(song: LocalSong): Promise<LocalSong> {
		const filePath = song.data.path;
		const data = await readSongFile(filePath);
		const refreshed = await parseLocalSong(data, filePath, song.id);
		return this.cache(refreshed);
	}

	handleInitialization(): void {
		// TODO: Make an abstract MusicService class that uses HTMLAudioElement
		// 		 Since this is shared between {YouTube,Local}MusicService's, and possibly more in the future
		const audio = new Audio();
		audio.addEventListener("timeupdate", () => {
			this.dispatchEvent(new MusicServiceEvent("timeupdate", audio.currentTime));
		});
		audio.addEventListener("playing", () => {
			this.dispatchEvent(new MusicServiceEvent("playing"));
		});
		audio.addEventListener("ended", () => {
			this.dispatchEvent(new MusicServiceEvent("ended"));
		});
		this.audio = audio;
	}

	handleDeinitialization(): void {}

	async handlePlay(): Promise<void> {
		const { path } = this.song!.data;
		const buffer = await readSongFile(path);
		const blob = new Blob([buffer], { type: audioMimeTypeFromPath(path) });
		const url = URL.createObjectURL(blob);

		const audio = this.audio;
		audio!.src = url;

		try {
			await audio!.play();
		} catch (error) {
			// Someone skipped or stopped the song while it was still trying to play it, let it slide
			if (error instanceof Error && error.name === "AbortError") {
				return;
			}
		}
	}

	async handleResume(): Promise<void> {
		await this.audio?.play?.();
	}

	handlePause(): void {
		this.audio?.pause?.();
	}

	handleStop(): void {
		if (this.audio) {
			this.audio.pause();
			URL.revokeObjectURL(this.audio.src);
		}
	}

	handleSeekToTime(timeInSeconds: number): void {
		this.audio!.currentTime = timeInSeconds;
	}

	handleSetVolume(volume: number): void {
		this.audio!.volume = volume;
	}
}
