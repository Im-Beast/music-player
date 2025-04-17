import type { LocalImage } from "@/stores/local-images";
import type { AlbumKey, AlbumPreviewKey } from "./album";
import { getCachedFromKey } from "./cache";
import { Filled, type Identifiable, type ItemKey } from "./shared";
import type { SongKey, SongPreviewKey, SongType } from "./song";

export type ArtistId = string;
export type ArtistKey<Type extends SongType = SongType> = ItemKey<Artist<Type>>;
export interface Artist<Type extends SongType = SongType> extends Identifiable {
	type: Type;
	id: ArtistId;
	kind: "artist";

	title: string;
	artwork?: LocalImage;

	albums: (AlbumPreviewKey<Type> | AlbumKey<Type>)[];
	songs: (SongKey<Type> | SongPreviewKey<Type>)[];
}

export type ArtistPreviewKey<Type extends SongType = SongType> = ItemKey<ArtistPreview<Type>>;
export type ArtistPreview<Type extends SongType = SongType> = Identifiable &
	Partial<Omit<Artist<Type>, "kind">> & {
		id: ArtistId;
		kind: "artistPreview";
		type: Type;

		title: string;
	};

export interface InlineArtist {
	title: string;
	artwork?: LocalImage;
}

export type DisplayableArtist<Type extends SongType = SongType> =
	| ArtistKey<Type>
	| ArtistPreview<Type>
	| InlineArtist;

export function filledDisplayableArtist<Type extends SongType = SongType>(
	artist: DisplayableArtist<Type>,
): Filled<DisplayableArtist<Type>> {
	if (typeof artist === "object") {
		return artist;
	}

	const cached = getCachedFromKey(artist);
	if (!cached) {
		throw new Error(`Artist tried to retrieve cached ${cached}, but it is not cached`);
	}
	return cached;
}

export function filledArtist(artist: Artist): Filled<Artist> {
	return {
		...artist,
		albums: artist.albums.map((albumKey) => {
			const album = getCachedFromKey(albumKey);
			if (!album) {
				throw new Error(`Artist tried to retrieve album ${album}, but it is not cached`);
			}
			return album;
		}),
		songs: artist.songs.map((songKey) => {
			const song = getCachedFromKey(songKey);
			if (!song) {
				throw new Error(`Artist tried to retrieve song ${song}, but it is not cached`);
			}
			return song;
		}),
	};
}
