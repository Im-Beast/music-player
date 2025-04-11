import { toRaw } from "vue";

import Fuse, { FuseResult } from "fuse.js";
import { parseWebStream, selectCover } from "music-metadata";

import LocalMusic from "@/plugins/LocalMusicPlugin";
import { Capacitor } from "@capacitor/core";

import { LocalImage, useLocalImages } from "@/stores/local-images";

import { MusicService, MusicServiceEvent } from "@/services/Music/MusicService";

import { base64StringToBuffer } from "@/utils/buffer";
import { generateHash, generateUUID } from "@/utils/crypto";
import { getPlatform } from "@/utils/os";
import { audioMimeTypeFromPath } from "@/utils/path";
import { generateSongStyle } from "@/utils/songs";
import { Maybe } from "@/utils/types";
import {
	Album,
	AlbumSong,
	Artist,
	ArtistKey,
	ArtistPreview,
	cache,
	filledArtistPreview,
	generateCacheMethod,
	getAllCached,
	getKey,
	removeFromCache,
	Song,
	SongPreview,
} from "./objects";

const getCached = generateCacheMethod("local");

type LocalAlbum = Album<"local">;
type LocalAlbumSong = AlbumSong<"local">;
type _LocalArtist = Artist<"local">;
type LocalArtistPreview<Full extends boolean = boolean> = ArtistPreview<"local", Full>;
type _LocalArtistKey = ArtistKey<"local">;
type LocalSong = Song<"local">;
type LocalSongPreview = SongPreview<"local">;

// const localSongs = useIDBKeyval<LocalSong[]>("localMusicSongs", []);
// const albums = useIDBKeyval<LocalAlbum[]>("localAlbums", []);

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

async function getFileStream(path: string): Promise<ReadableStream<Uint8Array>> {
	switch (getPlatform()) {
		case "electron": {
			const buffer = await ElectronMusicPlayer!.readFile(path);
			const stream = new ReadableStream({
				start(controller): void {
					controller.enqueue(buffer);
					controller.close();
				},
			});
			return stream;
		}
		// TODO: Stream data on Android?
		case "android": {
			const { data } = await LocalMusic.readSong({ path });
			const buffer = base64StringToBuffer(data);
			const stream = new ReadableStream({
				start(controller): void {
					controller.enqueue(buffer);
					controller.close();
				},
			});
			return stream;
		}
		default: {
			const { Filesystem, Directory } = await import("@capacitor/filesystem");

			const { uri } = await Filesystem.getUri({
				path: path,
				directory: Directory.Documents,
			});
			const fileSrc = Capacitor.convertFileSrc(uri);
			const response = await fetch(fileSrc);
			if (!response.body) {
				throw new Error(`Failed retrieving file stream for ${path}: body is empty.`);
			}
			return response.body;
		}
	}
}

async function parseLocalSong(path: string, id: string): Promise<LocalSong> {
	const stream = await getFileStream(path);

	const metadata = await parseWebStream(stream, {
		path,
		mimeType: audioMimeTypeFromPath(path),
	});

	const { common, format } = metadata;

	const artists: LocalArtistPreview[] = [];
	if (common.artists?.length) {
		for (let i = 0; i < common.artists.length; ++i) {
			const title = common.artists[i]!;
			const id = common.musicbrainz_artistid?.[i];
			artists.push({ id, title });
		}
	}

	const album = common.album;
	const title = common.title ?? path.split("\\").pop()!.split("/").pop();
	const duration = format.duration;
	const genres = common.genre ?? [];

	const discNumber = common.disk.no ?? undefined;
	const trackNumber = common.track.no ?? undefined;

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
		kind: "song",

		// TODO: Check if format is supported
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

		data: {
			path,
			discNumber,
			trackNumber,
		},
	};
}

async function* getLocalSongs(clearCache = false): AsyncGenerator<LocalSong> {
	const localSongs = getAllCached<LocalSong>("local", "song").toArray();

	if (clearCache) {
		for (const song of localSongs) {
			removeFromCache(song);
		}
	} else if (localSongs.length) {
		yield* localSongs;
		return;
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

			// Instead of generating UUID and then managing the proper song object
			// We use hashed filePath as an alternative id.
			// We have to hash it to prevent clashing with routes when used as a route parameter.
			const fileId = id ?? String(generateHash(filePath));

			const song = await parseLocalSong(filePath, fileId);
			cache(song);
			yield song;
		}
	} catch (error) {
		console.log("Errored on getSongs:", error instanceof Error ? error.message : error);
	}
}

export class LocalMusicService extends MusicService<"local"> {
	logName = "LocalMusicService";
	logColor = "#ddd480";
	type = "local" as const;
	available = getPlatform() !== "web";

	audio?: HTMLAudioElement;

	constructor() {
		super();
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

	handleSearchHints(_term: string): string[] {
		return [];
	}

	handleGetSongsAlbum(song: LocalSong): Maybe<LocalAlbum> {
		const songKey = getKey(song);
		return getAllCached<LocalAlbum>("local", "album").find(({ songs }) =>
			songs.some((albumSong) => albumSong.song === songKey),
		);
	}

	handleGetAlbum(albumId: string): Maybe<LocalAlbum> {
		return getAllCached<LocalAlbum>("local", "album").find(({ id }) => id === albumId);
	}

	#fuse?: Fuse<LocalSong>;
	#search = {
		term: "",
		pages: [] as Maybe<FuseResult<LocalSong>[]>[],
	};
	async *handleSearchSongs(
		term: string,
		offset: number,
		options?: { signal: AbortSignal },
	): AsyncGenerator<LocalSong> {
		if (!this.#fuse) {
			const allSongs = await Array.fromAsync(getLocalSongs());
			// TODO: This might require some messing around with distance/threshold settings to not make it excessively loose
			this.#fuse = new Fuse(allSongs, {
				keys: ["title", "artists", "album", "genres"] satisfies (keyof LocalSong)[],
			});
		}

		if (term === this.#search.term) {
			const page = this.#search.pages[offset];
			if (!page) return;

			for (const { item } of page) {
				if (options?.signal?.aborted) return;
				yield item;
			}
			return;
		}

		const results = this.#fuse.search(term);
		const pages = Object.values(Object.groupBy(results, (_, index) => Math.floor(index / 25)));
		this.#search.pages = pages;

		for (const { item } of pages[0] ?? []) {
			if (options?.signal?.aborted) return;
			yield item;
		}
	}

	handleGetSongFromPreview(searchResult: LocalSongPreview): LocalSong {
		return searchResult as unknown as LocalSong;
	}

	async *handleGetLibraryAlbums(options?: { signal?: AbortSignal }): AsyncGenerator<LocalAlbum> {
		let iterator = getAllCached<LocalAlbum>("local", "album");
		const first = iterator.next();
		if (first.done) {
			await this.refreshLibraryAlbums();
			iterator = getAllCached<LocalAlbum>("local", "album");
		} else {
			yield first.value;
		}

		for (const album of iterator) {
			if (options?.signal?.aborted) return;
			yield album;
		}
	}

	handleRefreshLibraryAlbums(): void {
		// First we cleanup songs from albums, in case some were removed
		// This also allows us to then remove albums that are empty
		const localAlbums = getAllCached<LocalAlbum>("local", "album").toArray();

		for (const album of localAlbums) {
			album.songs.length = 0;
		}

		for (const song of getAllCached<LocalSong>("local", "song")) {
			if (!song.album) continue;

			const discSong: LocalAlbumSong = {
				song: getKey(song),
				discNumber: song.data.discNumber,
				trackNumber: song.data.trackNumber,
			};

			// Find all albums that match the songs album title and has at least 1 shared artist
			const possibleAlbums = localAlbums.filter((album) => {
				if (album.title !== song.album) return false;

				return album.artists.some((artist) => {
					const albumArtist = filledArtistPreview(artist);
					return song.artists.find(
						(songArtist) => filledArtistPreview(songArtist).title == albumArtist.title,
					);
				});
			});

			// If no such albums exist, create a new one
			if (!possibleAlbums.length) {
				const album: LocalAlbum = cache({
					type: "local",
					kind: "album",
					id: generateUUID(),
					title: song.album,
					songs: [discSong],
					artists: toRaw(song.artists),
					artwork: toRaw(song.artwork),
				});

				localAlbums.push(album);
				continue;
			}

			for (const album of possibleAlbums) {
				album.songs.push(discSong);
			}
		}

		for (const [i, album] of localAlbums.entries()) {
			// Remove albums with no songs
			if (album.songs.length === 0) {
				album.songs.splice(i, 1);
				continue;
			}

			// Sort album songs so they match the disc and track order
			album.songs.sort(
				(a, b) =>
					(a.discNumber ?? 0) - (b.discNumber ?? 0) || (a.trackNumber ?? 0) - (b.trackNumber ?? 0),
			);
		}
	}

	async *handleGetLibrarySongs(_offset: number): AsyncGenerator<LocalSong> {
		// TODO: Just like search, maybe paginate?
		yield* getLocalSongs();
	}

	async handleRefreshLibrarySongs(): Promise<void> {
		this.#fuse = undefined;
		await Array.fromAsync(getLocalSongs(true));
	}

	handleGetSong(songId: string): Maybe<LocalSong> {
		const cached = getCached("song", songId);
		if (cached) return cached;

		const song = getAllCached<LocalSong>("local", "song").find((song) => song.id === songId);
		return song && cache(song);
	}

	async handleRefreshSong(song: LocalSong): Promise<LocalSong> {
		const filePath = song.data.path;
		const refreshed = await parseLocalSong(filePath, song.id);
		return cache(refreshed);
	}

	async handlePlay(): Promise<void> {
		const { path } = this.song!.data;

		const stream = await getFileStream(path);
		const buffer = await new Response(stream).arrayBuffer();
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
