declare global {
	namespace MusicKit {
		/**
		 * A resource object that represents the artist of an album where an artist can be one or more people.
		 * @see https://developer.apple.com/documentation/applemusicapi/artists-uip
		 */
		interface Artists {
			/** The identifier for the artist. */
			id: string;
			/** This value is always artists. */
			type: "artists";
			/** The relative location for the artist resource. */
			href: string;
			/** The attributes for the artist. */
			attributes?: ArtistsAttributes;

			/** The relationships for the artist. */
			relationships?: ArtistsRelationships;
			/** The relationship views for the artist. */
			views?: MusicKit.ResourceViews;
		}

		/**
		 * The attributes for an artist resource.
		 * @see https://developer.apple.com/documentation/applemusicapi/artists/attributes
		 */
		interface ArtistsAttributes {
			/** The artwork for the artist image. */
			artwork?: Artwork;
			/** The names of the genres associated with this artist. */
			genreNames: string[];
			/** The localized name of the artist. */
			name: string;
			/** The URL for sharing the artist in Apple Music. */
			url: string;
		}

		/**
		 * The relationships for an artist resource.
		 * @see https://developer.apple.com/documentation/applemusicapi/artistsresponse
		 */
		interface ArtistsRelationships {
			/**
			 * The albums associated with the artist. By default, albums includes identifiers only.
			 * Fetch limits: 25 default, 100 maximum
			 */
			albums: ArtistsAlbumsRelationship;
			/**
			 * The songs associated with the artist.
			 */
			songs: ArtistsSongsRelationship;
		}

		/**
		 * @see https://developer.apple.com/documentation/applemusicapi/artistsresponse
		 */
		interface ArtistsAlbumsRelationship {
			/* A relative location for the relationship. */
			href?: string;
			/* A relative cursor to fetch the next paginated collection of resources in the relationship if more exist. */
			next?: string;
			/**
			 * The albums for the artist.
			 */
			data: MusicKit.Albums[];
		}

		interface ArtistsSongsRelationship {
			/* A relative location for the relationship. */
			href?: string;
			/* A relative cursor to fetch the next paginated collection of resources in the relationship if more exist. */
			next?: string;
			/**
			 * The songs for the artist.
			 */
			data: MusicKit.Songs[];
		}

		interface ArtistsQuery {
			/** Additional relationships to include in the fetch. */
			include?: (keyof ArtistsRelationships)[];
			/** The localization to use, specified by a language tag. The possible values are in the supportedLanguageTags array belonging to the Storefront object specified by storefront. Otherwise, the default is defaultLanguageTag in Storefront. */
			l?: string;
			/** The views to activate for the resource. */
			views?: string[];
			/** A list of attribute extensions to apply to resources in the response. */
			extend?: string[];
		}

		/**
		 * The response to a  artists request.
		 * @see https://developer.apple.com/documentation/applemusicapi/artistsresponse
		 */
		interface ArtistsResponse {
			/** The LibraryArtists included in the response for the request. */
			data: Artists[];
		}

		/**
		 * A resource object that represents an artist present in a user’s library.
		 * @see https://developer.apple.com/documentation/applemusicapi/libraryartists
		 */
		interface LibraryArtists {
			/** The identifier for the artist. */
			id: string;
			/** This value is always artists. */
			type: "library-artists";
			/** The relative location for the artist resource. */
			href: string;
			/** The attributes for the artist. */
			attributes?: LibraryArtistsAttributes;

			/** The relationships for the artist. */
			relationships?: LibraryArtistsRelationships;
		}

		/**
		 * The attributes for a library artist resource.
		 * @see https://developer.apple.com/documentation/applemusicapi/libraryartists/attributes-data.dictionary
		 */
		interface LibraryArtistsAttributes {
			/** The artist’s name. */
			name: string;
		}

		/**
		 * The relationships for a library artist resource.
		 * @see https://developer.apple.com/documentation/applemusicapi/libraryartists/relationships-data.dictionary
		 */
		interface LibraryArtistsRelationships {
			/**
			 * The library albums associated with the artist. By default, albums not included. It’s available only when fetching a single library artist resource by ID.
			 * Fetch limits: 25 default, 100 maximum
			 */
			albums?: LibraryArtistsAlbumsRelationship;
			/**
			 * The artist in the Apple Music catalog the library artist is associated with, when known.
			 * Fetch limits: None (associated with, at most, one catalog artist).
			 */
			catalog?: LibraryArtistsCatalogRelationship;
		}

		/**
		 * A relationship from the library artist to their albums.
		 * @see https://developer.apple.com/documentation/applemusicapi/libraryartists/relationships-data.dictionary/libraryartistsalbumsrelationship
		 */
		interface LibraryArtistsAlbumsRelationship {
			/* A relative location for the relationship. */
			href?: string;
			/* A relative cursor to fetch the next paginated collection of resources in the relationship if more exist. */
			next?: string;
			/**
			 * The albums for the library artist present in the user’s library.
			 */
			data: MusicKit.Albums[];
		}

		/**
		 * A relationship from the library artist to their associated catalog content.
		 * @see https://developer.apple.com/documentation/applemusicapi/libraryartists/relationships-data.dictionary/libraryartistscatalogrelationship
		 */
		interface LibraryArtistsCatalogRelationship {
			/* A relative location for the relationship. */
			href?: string;
			/* A relative cursor to fetch the next paginated collection of resources in the relationship if more exist. */
			next?: string;
			/**
			 * The artist from the Apple Music catalog associated with the library artist, if any.
			 */
			data: MusicKit.Artists[];
		}

		/**
		 * A relationship from the album to its artists.
		 * @see https://developer.apple.com/documentation/applemusicapi/libraryartists/relationships-data.dictionary/libraryartistsalbumsrelationship
		 */
		interface LibraryArtistsAlbumsRelationship {
			/* A relative location for the relationship. */
			href?: string;
			/* The relative location to request the next page of resources in the collection, if additional resources are available for fetching. */
			next?: string;
			/** The artists for the album. */
			data: MusicKit.Albums[];
		}

		interface LibraryArtistsQuery {
			/** Additional relationships to include in the fetch. */
			include?: (keyof LibraryArtistsRelationships)[];
			/** The localization to use, specified by a language tag. The possible values are in the supportedLanguageTags array belonging to the Storefront object specified by storefront. Otherwise, the default is defaultLanguageTag in Storefront. */
			l?: string;
			/** The views to activate for the resource. */
			views?: string[];
			/** A list of attribute extensions to apply to resources in the response. */
			extend?: string[];
		}

		/**
		 * The response to a library artists request.
		 * @see https://developer.apple.com/documentation/applemusicapi/artistsresponse
		 */
		interface LibraryArtistsResponse {
			/** The LibraryArtists included in the response for the request. */
			data: LibraryArtists[];
		}
	}
}

export {};
