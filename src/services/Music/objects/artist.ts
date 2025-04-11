import type { LocalImage } from "@/stores/local-images";
import type { AlbumKey } from "./album";
import { getCachedFromKey } from "./cache";
import { Filled, type Identifiable, type ItemKey } from "./shared";
import type { SongKey, SongType } from "./song";

export type ArtistId = string;
export type ArtistKey<Type extends SongType = SongType> = ItemKey<Artist<Type>>;

export interface Artist<Type extends SongType = SongType> extends Identifiable {
	type: Type;
	id: ArtistId;
	kind: "artist";

	title: string;
	artwork?: LocalImage;

	albums: AlbumKey[];
	songs: SongKey[];
}

export type ArtistPreview<
	Type extends SongType = SongType,
	Full extends true | false = true | false,
> =
	| Artist<Type>
	| (Full extends true ? ArtistKey<Type> : { id?: ArtistId; title: string; artwork?: LocalImage });

export function filledArtistPreview<Type extends SongType>(
	artist: ArtistPreview<Type>,
): Filled<ArtistPreview<Type>> {
	if (typeof artist === "object") {
		return artist;
	}

	const cached = getCachedFromKey<Artist>(artist);
	if (!cached) {
		const err = new Error(`Tried to retrieve artist ${artist}, but it is not cached`);
		console.error(err);
		throw err;
	}
	return cached;
}
