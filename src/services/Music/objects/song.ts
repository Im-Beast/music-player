import type { LocalImage } from "@/stores/local-images";
import { DisplayableArtist, filledDisplayableArtist } from "./artist";
import type { Filled, Identifiable, ItemKey } from "./shared";

type SongTypes = {
	youtube: { albumId?: string };
	musickit: { catalogId?: string };
	local: { path: string; discNumber?: number; trackNumber?: number; isrc?: string[] };
};

export type SongType = "youtube" | "musickit" | "local";
export type SongId = string;
export type SongKey<Type extends SongType = SongType> = ItemKey<Song<Type>>;

export type Song<Type extends SongType = SongType> = Identifiable & {
	type: Type;
	id: SongId;
	kind: "song";

	available: boolean;
	explicit: boolean;

	artists: DisplayableArtist<Type>[];
	genres: string[];

	title?: string;
	album?: string;
	duration?: number;
	artwork?: LocalImage;
	// TODO: Move this to LocalImage, and use the background color as a fallback
	style: { fgColor: string; bgColor: string; bgGradient: string };

	data: SongTypes[Type];
};

export type SongPreviewKey<Type extends SongType = SongType> = ItemKey<SongPreview<Type, true>>;

export type SongPreview<Type extends SongType = SongType, HasId extends boolean = false> =
	| Song<Type>
	| ((HasId extends true ? Identifiable : Record<never, never>) &
			Partial<Omit<Song<Type>, "kind">> & {
				type: Type;
				id?: SongId;
				kind: "songPreview";

				artists: DisplayableArtist<Type>[];
				genres: string[];
			});

export function filledSong(song: Song): Filled<Song> {
	return {
		...song,
		kind: "song",
		artists: song.artists.map(filledDisplayableArtist),
	};
}
