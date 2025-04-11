import { LocalImage } from "@/stores/local-images";
import type { Identifiable } from "../MusicService";
import { getCachedFromKey } from "./cache";
import { Filled } from "./shared";
import type { SongKey } from "./song";

// TODO: Support in-place playlists on MusicKit
type PlaylistType = "unimusic";
type PlaylistId = string;

export interface Playlist<Type extends PlaylistType = PlaylistType> extends Identifiable {
	type: Type;
	id: PlaylistId;
	kind: "playlist";

	title: string;
	artwork?: LocalImage;

	songs: SongKey[];
}

export function filledPlaylist(playlist: Playlist): Filled<Playlist> {
	return {
		type: playlist.type,
		id: playlist.id,
		kind: "playlist",

		title: playlist.title,
		artwork: playlist.artwork,

		songs: playlist.songs.map((song) => {
			const cached = getCachedFromKey(song);
			if (!cached) {
				const err = new Error(`Playlist tried to retrieve song ${song}, but it is not cached`);
				console.error(err);
				throw err;
			}
			return cached;
		}),
	};
}
