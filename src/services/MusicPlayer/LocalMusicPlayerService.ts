import Fuse from "fuse.js";
import { parseBuffer, selectCover } from "music-metadata";

import { LocalSong, SongImage } from "@/stores/music-player";

import LocalMusic from "@/plugins/LocalMusicPlugin";
import { MusicPlayerService } from "@/services/MusicPlayer/MusicPlayerService";

import { base64StringToBuffer } from "@/utils/buffer";
import { audioMimeTypeFromPath } from "@/utils/path";
import { getPlatform } from "@/utils/os";
import { generateSongStyle } from "@/utils/songs";
import { useIDBKeyvalAsync } from "@/utils/vue";
import { useLocalImages } from "@/stores/local-images";

const localSongs = useIDBKeyvalAsync<LocalSong[]>("localMusicSongs", []);

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
			const musicPath = await ElectronMusicPlayer.getMusicPath();
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
		for (const filePath of await ElectronMusicPlayer.traverseDirectory(path)) {
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
			const buffer = await ElectronMusicPlayer.readFile(path);
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

	const artist = common.artist;
	const album = common.album;
	const title = common.title ?? path.split("\\").pop()!.split("/").pop();
	const duration = format.duration;
	const genre = common.genre?.[0];
	let artwork: SongImage | undefined;
	const coverImage = selectCover(common.picture);
	if (coverImage) {
		const { data, type } = coverImage;
		const localImages = useLocalImages();
		await localImages.localImageManagementService.associateImage(id, new Blob([data], { type }), {
			width: 256,
			height: 256,
		});
		artwork = { id };
	}

	return {
		type: "local",

		id,
		artist,
		album,
		title,
		duration,
		genre,

		artwork,
		style: await generateSongStyle(artwork),

		data: { path },
	};
}

async function getLocalSongs(clearCache = false): Promise<LocalSong[]> {
	const songs = await localSongs;

	if (clearCache) {
		songs.value = [];
	} else if (songs.value.length) {
		return songs.value;
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
			const song = await parseLocalSong(data, filePath, id ?? filePath);
			songs.value.push(song);
		}
	} catch (error) {
		console.log("Errored on getSongs:", error instanceof Error ? error.message : error);
	}

	return songs.value;
}

export class LocalMusicPlayerService extends MusicPlayerService<LocalSong> {
	logName = "LocalMusicPlayerService";
	logColor = "#ddd480";
	audio?: HTMLAudioElement;

	constructor() {
		super();
	}

	async handleSearchHints(term: string): Promise<string[]> {
		return [];
	}

	#fuse?: Fuse<LocalSong>;
	async handleSearchSongs(term: string, offset: number): Promise<LocalSong[]> {
		// TODO: Maybe split results in smaller chunks and actually paginate it?
		if (offset > 0) {
			return [];
		}

		if (!this.#fuse) {
			const allSongs = await getLocalSongs();

			// TODO: This might require some messing around with distance/threshold settings to not make it excessively loose
			this.#fuse = new Fuse(allSongs, {
				keys: ["title", "artist", "album", "genre"] satisfies (keyof LocalSong)[],
			});
		}

		const results = this.#fuse.search(term);
		const songs = results.map((value) => value.item);
		return songs;
	}

	async handleLibrarySongs(_offset: number): Promise<LocalSong[]> {
		// TODO: Just like search, maybe paginate?
		return getLocalSongs();
	}

	async handleRefresh(): Promise<void> {
		await getLocalSongs(true);
	}

	async handleInitialization(): Promise<void> {
		const audio = new Audio();
		audio.addEventListener("timeupdate", () => {
			this.store.time = audio.currentTime;
		});
		audio.addEventListener("playing", () => {
			this.store.addMusicSessionActionHandlers();
		});
		this.audio = audio;
	}

	async handleDeinitialization(): Promise<void> {
		URL.revokeObjectURL(this.audio!.src);
		this.audio!.remove();
		this.audio = undefined;
	}

	async handlePlay(): Promise<void> {
		const { path } = this.song!.data;
		const buffer = await readSongFile(path);
		const blob = new Blob([buffer], { type: audioMimeTypeFromPath(path) });
		const url = URL.createObjectURL(blob);
		this.audio!.src = url;
		this.audio!.play();
	}

	async handleResume(): Promise<void> {
		await this.audio!.play();
	}

	async handlePause(): Promise<void> {
		await this.audio!.pause();
	}

	async handleStop(): Promise<void> {
		await this.audio!.pause();
	}

	handleSeekToTime(timeInSeconds: number): void {
		this.audio!.currentTime = timeInSeconds;
	}

	handleSetVolume(volume: number): void {
		this.audio!.volume = volume;
	}
}
