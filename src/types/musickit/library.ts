declare global {
	namespace MusicKit {
		interface LibrarySongsQuery {
			/** Additional relationships to include in the fetch. */
			include?: string[];
			/** The localization to use, specified by a language tag. The possible values are in the supportedLanguageTags array belonging to the Storefront object specified by storefront. Otherwise, the default is defaultLanguageTag in Storefront. */
			l?: string;
			/** The number of objects or number of objects in the specified relationship returned. */
			limit?: number;
			/** The next page or group of objects to fetch. */
			offset?: number;
			/** A list of attribute extensions to apply to resources in the response. */
			extend?: string[];
		}

		/**
		 * The response to a library songs request.
		 * @see https://developer.apple.com/documentation/applemusicapi/librarysongsresponse
		 */
		interface LibrarySongsResponse {
			/** The LibrarySongs included in the response for the request. */
			data: LibrarySongs[];
		}

		/**
		 * A resource object that represents a library song.
		 * @see https://developer.apple.com/documentation/applemusicapi/librarysongs
		 */
		interface LibrarySongs {
			/** The identifier for the library song. */
			id: string;
			/** This value is always songs. */
			type: "library-songs";
			/** The relative location for the album resource. */
			href: string;
			/** The attributes for the library song. */
			attributes?: LibrarySongsAttributes;

			/** The relationships for the library song. */
			relationships?: MusicKit.ResourceRelationships;
		}

		/**
		 * The attributes for a library song resource.
		 * @see https://developer.apple.com/documentation/applemusicapi/librarysongs/attributes
		 */
		interface LibrarySongsAttributes {
			/** The name of the album the song appears on. */
			albumName: string;
			/** The artist’s name. */
			artistName: string;
			/** The URL of the artist for the content. */
			artistUrl?: string;
			/** The album artwork. */
			artwork?: Artwork;
			/** Indicates the specific audio variant for a song. */
			audioVariants?: AudioVariant[];
			/** The song’s composer. */
			composerName?: string;
			/** The Recording Industry Association of America (RIAA) rating of the content. No value means no rating. */
			contentRating?: ContentRating;
			/** The disc number of the album the song appears on. */
			discNumber?: number;
			/** The duration of the song in milliseconds. */
			durationInMillis: number;
			/** The genre names the song is associated with. */
			genreNames: string[];
			/** Indicates whether the song has lyrics available in the Apple Music catalog. If true, the song has lyrics available; otherwise, it doesn't. */
			hasLyrics: boolean;
			/** The International Standard Recording Code (ISRC) for the song. */
			isrc?: string;
			/** The localized name of the song. */
			name: string;
			/** When present, this attribute indicates that the song is available to play with an Apple Music subscription. The value map may be used to initiate playback. Previews of the song audio may be available with or without an Apple Music subscription. */
			playParams?: PlayParameters;
			/** The preview assets for the song. */
			previews: Preview[];
			/** The release date of the song, when known, in YYYY-MM-DD or YYYY format. Prerelease songs may have an expected release date in the future. */
			releaseDate?: string;
			/** The number of the song in the album’s track list. */
			trackNumber?: string;
			/** The URL for sharing the song in Apple Music.  */
			url: string;
		}
	}
}

export {};
