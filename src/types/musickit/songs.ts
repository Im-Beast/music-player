declare global {
	namespace MusicKit {
		/**
		 * A resource object that represents a song.
		 * @see https://developer.apple.com/documentation/applemusicapi/songs-um8
		 */
		interface Songs {
			/** The identifier for the song. */
			id: string;
			/** This value is always songs. */
			type: "songs";
			/** The relative location for the album resource. */
			href: string;
			/** The attributes for the playlist. */
			attributes?: SongsAttributes;

			/** The relationships for the album. */
			relationships?: SongsRelationships;
		}

		/**
		 * The attributes for a song resource.
		 * @see https://developer.apple.com/documentation/applemusicapi/songs/attributes
		 */
		interface SongsAttributes {
			/** The name of the album the song appears on. */
			albumName: string;
			/** The artist’s name. */
			artistName: string;
			/** The URL of the artist for the content. */
			artistUrl?: string;
			/** The album artwork. */
			artwork: Artwork;
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

		/**
		 * The response to a songs request.
		 * @see https://developer.apple.com/documentation/applemusicapi/songsresponse
		 */
		interface SongsResponse {
			/** The Songs included in the response for the request. */
			data: MusicKit.Songs[];
		}

		/**
		 * The relationships for a song resource.
		 * @see https://developer.apple.com/documentation/applemusicapi/songs/relationships-data.dictionary
		 */
		interface SongsRelationships {
			/**
			 * The artists associated with the song. By default, artists includes identifiers only.
			 * Fetch limits: 10 default, 10 maximum
			 */
			artists: SongsArtistsRelationships;
			/**
			 * The genres associated with the song. By default, genres is not included.
			 * Fetch limits: None
			 */
			genres: SongsGenresRelationships;
		}

		/**
		 * A relationship from the song to its artists.
		 * @see https://developer.apple.com/documentation/applemusicapi/songs/relationships-data.dictionary/songsartistsrelationship
		 */
		interface SongsArtistsRelationships {
			/* A relative location for the relationship. */
			href?: string;
			/* A relative cursor to fetch the next paginated collection of resources in the relationship if more exist. */
			next?: string;
			/**
			 * The artists associated with the song.
			 */
			data: MusicKit.Artists[];
		}

		/**
		 * A relationship from the song to its genres.
		 * @see https://developer.apple.com/documentation/applemusicapi/songs/relationships-data.dictionary/songsgenresrelationship
		 */
		interface SongsGenresRelationships {
			/* A relative location for the relationship. */
			href?: string;
			/* A relative cursor to fetch the next paginated collection of resources in the relationship if more exist. */
			next?: string;
			/**
			 * The artists associated with the song.
			 */
			data: MusicKit.Genres[];
		}

		/**
		 * The response to a songs request.
		 * @see https://developer.apple.com/documentation/applemusicapi/librarysongsresponse
		 */
		interface LibrarySongsResponse {
			/** The LibrarySongs included in the response for the request. */
			data: MusicKit.LibrarySongs[];
		}
	}
}

export {};
