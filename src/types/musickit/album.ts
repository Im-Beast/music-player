declare global {
	namespace MusicKit {
		interface AlbumsQuery {
			/** Additional relationships to include in the fetch. */
			include?: (keyof AlbumsRelationships)[];
			/** The localization to use, specified by a language tag. The possible values are in the supportedLanguageTags array belonging to the Storefront object specified by storefront. Otherwise, the default is defaultLanguageTag in Storefront. */
			l?: string;
			/** The views to activate for the resource. */
			views?: string[];
			/** A list of attribute extensions to apply to resources in the response. */
			extend?: string[];
		}

		interface AlbumsRelationships {
			/**
			 * The curator that created the playlist. By default, curator includes identifiers only.
			 * Fetch limits: none
			 */
			artists: AlbumsArtistsRelationships;
			/**
			 * The songs and music videos included in the playlist. By default, tracks includes objects.
			 * Fetch limits: 300 default, 300 maximum
			 */
			tracks: AlbumsTracksRelationships;
		}

		/**
		 * The response to a albums request.
		 * @see https://developer.apple.com/documentation/applemusicapi/playlistsresponse
		 */
		interface AlbumsResponse {
			/** The Albums included in the response for the request. */
			data: Albums[];
		}

		/**
		 * A resource object that represents an album.
		 * @see https://developer.apple.com/documentation/applemusicapi/albums-uib
		 */
		interface Albums {
			/** The identifier for the album. */
			id: string;
			/** This value is always albums. */
			type: "albums";
			/** The relative location for the album resource. */
			href: string;
			/** The attributes for the album. */
			attributes?: AlbumsAttributes;

			/** The relationships for the album. */
			relationships?: AlbumsRelationships;
			/** The relationship views for the album. */
			views?: MusicKit.ResourceViews;
		}

		interface AlbumsAttributes {
			/** The name of the primary artist associated with the album. */
			artistName: string;
			/** The URL of the artist for this content. */
			artistUrl?: string;
			/** The artwork for the album. */
			artwork: Artwork;
			/** Indicates the specific audio variant for the album. */
			audioVariants?: AudioVariant[];
			/** The Recording Industry Association of America (RIAA) rating of the content. No value means no rating. */
			contentRating?: ContentRating;
			/** The copyright text. */
			copyright?: string;
			/** The names of the genres associated with the album. */
			genreNames: string[];
			/** Indicates whether the album is marked as a compilation. If true, the album is a compilation; otherwise, it's not. */
			isCompilation: boolean;
			/** Indicates whether the album is complete. If true, the album is complete; otherwise, it's not. An album is complete if it contains all its tracks and songs. */
			isComplete: boolean;
			/** Indicates whether the album contains a single song. */
			isSingle: boolean;
			/** The localized name of the album. */
			name: string;
			/** When present, this attribute indicates that one or more tracks on the album are available to play with an Apple Music subscription. The value map may be used to initiate playback of available tracks on the album. */
			playParams?: PlayParameters;
			/** The name of the record label for the album. */
			recordLabel?: string;
			/** The release date of the album, when known, in YYYY-MM-DD or YYYY format. Prerelease content may have an expected release date in the future. */
			releaseDate?: string;
			/** The number of tracks for the album. */
			trackCount: number;
			/** The Universal Product Code for the album. */
			upc?: string;
			/** The URL for sharing the album in Apple Music. */
			url?: string;
		}
	}

	/**
	 * The relationships for an album resource.
	 * @see https://developer.apple.com/documentation/applemusicapi/albums/relationships-data.dictionary
	 */
	interface AlbumsRelationships {
		/**
		 * The artists associated with the album. By default, artists includes identifiers only.
		 * Fetch limits: 10 default, 10 maximum
		 */
		artists: AlbumsArtistsRelationships;
		/**
		 * The songs and music videos included in the playlist. By default, tracks includes objects.
		 * Fetch limits: 300 default, 300 maximum
		 */
		tracks: AlbumsTracksRelationships;
	}

	/**
	 * A relationship from the album to its artists.
	 * @see https://developer.apple.com/documentation/applemusicapi/albums/relationships-data.dictionary/albumsartistsrelationship
	 */
	interface AlbumsArtistsRelationships {
		/* A relative location for the relationship. */
		href?: string;
		/* The relative location to request the next page of resources in the collection, if additional resources are available for fetching. */
		next?: string;
		/** The artists for the album. */
		data: MusicKit.Artists[];
	}

	/**
	 * A relationship from the album to its tracks.
	 * @see https://developer.apple.com/documentation/applemusicapi/albums/relationships-data.dictionary/albumstracksrelationship
	 */
	interface AlbumsTracksRelationships {
		/* A relative location for the relationship. */
		href?: string;
		/* The relative location to request the next page of resources in the collection, if additional resources are available for fetching. */
		next?: string;
		/**
		 * The ordered songs and music videos in the tracklist of the album.
		 * Possible types: MusicVideos, Songs
		 */
		data: MusicKit.Songs[];
	}
}

export {};
