import type { LocalImage } from "@/stores/local-images";
import { filledArtistPreview, type Artist, type ArtistPreview } from "./artist";
import { getCachedFromKey } from "./cache";
import { type Filled, type Identifiable, type ItemKey } from "./shared";
import type { SongKey, SongPreview, SongPreviewKey, SongType } from "./song";

export type AlbumId = string;
export type AlbumKey = ItemKey<Album>;

export interface Album<Type extends SongType = SongType> extends Identifiable {
	type: Type;
	id: AlbumId;
	kind: "album";

	title: string;
	artwork?: LocalImage;

	artists: ArtistPreview<Type>[];
	songs: AlbumSong<Type>[];
}

export type AlbumPreview<Type extends SongType = SongType> =
	| Album<Type>
	| (Identifiable &
			Partial<Omit<Album<Type>, "kind">> & {
				type: Type;
				id: AlbumId;
				kind: "albumPreview";

				title: string;
				artists: ArtistPreview<Type>[];
			});

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
			artists: albumSong.song.artists.map(filledArtistPreview),
		};
	} else {
		song = getCachedFromKey(albumSong.song);
		if (!song) {
			const err = new Error(`Album tried to retrieve song ${albumSong.song}, but it is not cached`);
			console.error(err);
			throw err;
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
			if (typeof artist === "object") return artist;
			const cached = getCachedFromKey<Artist>(artist);
			if (!cached) {
				const err = new Error(`Album tried to retrieve artist ${artist}, but it is not cached`);
				console.error(err);
				throw err;
			}
			return cached;
		}),
		songs: album.songs.map(filledAlbumSong),
	};
}
