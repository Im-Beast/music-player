import type { LocalImage } from "@/stores/local-images";
import { DisplayableArtist, filledDisplayableArtist } from "./artist";
import { getCachedFromKey } from "./cache";
import { type Filled, type Identifiable, type ItemKey } from "./shared";
import type { SongKey, SongPreview, SongPreviewKey, SongType } from "./song";

export type AlbumId = string;
export type AlbumKey<Type extends SongType = SongType> = ItemKey<Album<Type>>;
export interface Album<Type extends SongType = SongType> extends Identifiable {
	type: Type;
	id: AlbumId;
	kind: "album";

	title: string;
	artwork?: LocalImage;

	artists: DisplayableArtist<Type>[];
	songs: AlbumSong<Type>[];
}

export type AlbumPreviewKey<Type extends SongType = SongType> = ItemKey<AlbumPreview<Type>>;
export type AlbumPreview<Type extends SongType = SongType> = Identifiable &
	Partial<Omit<Album<Type>, "kind">> & {
		type: Type;
		kind: "albumPreview";
		id: AlbumId;

		title: string;
		artists: DisplayableArtist<Type>[];
	};

export interface AlbumSong<Type extends SongType = SongType> {
	discNumber?: number;
	trackNumber?: number;
	song: SongKey<Type> | SongPreviewKey<Type> | SongPreview<Type, false>;
}

export function filledAlbumSong(albumSong: AlbumSong): Filled<AlbumSong> {
	let song;
	if (typeof albumSong.song === "object") {
		song = {
			...albumSong.song,
			artists: albumSong.song.artists.map(filledDisplayableArtist),
		};
	} else {
		song = getCachedFromKey(albumSong.song);
		if (!song) {
			throw new Error(`Album tried to retrieve song ${albumSong.song}, but it is not cached`);
		}
	}

	return {
		song,
		discNumber: albumSong.discNumber,
		trackNumber: albumSong.trackNumber,
	};
}

export function filledAlbum(album: Album): Filled<Album> {
	return {
		type: album.type,
		id: album.id,
		kind: "album",

		title: album.title,
		artwork: album.artwork,

		artists: album.artists.map((artist) => {
			if (typeof artist === "object") {
				return artist;
			}

			const cached = getCachedFromKey(artist);
			if (!cached) {
				throw new Error(`Album tried to retrieve artist ${cached}, but it is not cached`);
			}
			return cached;
		}),
		songs: album.songs.map(filledAlbumSong),
	};
}
