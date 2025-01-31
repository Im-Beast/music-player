declare global {
	namespace MusicKit {
		type CatalogSearchType =
			| "activities"
			| "albums"
			| "apple-curators"
			| "artists"
			| "curators"
			| "music-videos"
			| "playlists"
			| "record-labels"
			| "songs"
			| "stations";

		/**
		 * Search the catalog by using a query.
		 * @see https://api.music.apple.com/v1/catalog/{storefront}/search
		 */
		interface CatalogSearchQuery {
			/** The entered text for the search with ‘+’ characters between each word, to replace spaces (for example term=james+br). */
			term: string;
			/** The localization to use, specified by a language tag. The possible values are in the supportedLanguageTags array belonging to the Storefront object specified by storefront. Otherwise, the default is defaultLanguageTag in Storefront. */
			l?: string;
			/**
			 * The number of objects or number of objects in the specified relationship returned.\
			 * Default: 5\
			 * Maximum Value: 25
			 */
			limit?: number;
			/** The next page or group of objects to fetch. */
			offset?: number;
			/** The list of the types of resources to include in the results. */
			types: CatalogSearchType[];
			/** A list of modifications to apply to the request. */
			with?: string[];
		}

		/**
		 * The response to a search request.
		 * @see https://developer.apple.com/documentation/applemusicapi/searchresponse
		 */
		interface SearchResponse {
			/** The results included in the response to a search request. */
			results: SearchResponseResults;
		}

		/**
		 * An object that represents the results of a catalog search query.
		 * @see https://developer.apple.com/documentation/applemusicapi/searchresponse
		 * @nonexhaustive
		 */
		interface SearchResponseResults {
			albums?: SearchResponseResultsAlbumsSearchResult;
			artists?: SearchResponseResultsArtistsSearchResult;
			playlists?: SearchResponseResultsPlaylistsSearchResult;
			songs?: SearchResponseResultsSongsSearchResult;
		}

		/**
		 * An object containing an albums’ search result.
		 * @see https://developer.apple.com/documentation/applemusicapi/searchresponse/results/albumssearchresult
		 */
		interface SearchResponseResultsAlbumsSearchResult {
			/** The resources for the search result. */
			data: MusicKit.Albums[];
			/** The relative location to fetch the search result. */
			href?: string;
			/** A relative cursor to fetch the next paginated collection of resources in the result, if more exist. */
			next?: string;
		}

		/**
		 * An object containing an artists’ search result.
		 * @see https://developer.apple.com/documentation/applemusicapi/searchresponse/results/artistssearchresult
		 */
		interface SearchResponseResultsArtistsSearchResult {
			/** The resources for the search result. */
			data: MusicKit.Artists[];
			/** The relative location to fetch the search result. */
			href?: string;
			/** A relative cursor to fetch the next paginated collection of resources in the result, if more exist. */
			next?: string;
		}

		/**
		 * An object containing an playlists' search result.
		 * @see https://developer.apple.com/documentation/applemusicapi/searchresponse/results/playlistssearchresult
		 */
		interface SearchResponseResultsPlaylistsSearchResult {
			/** The resources for the search result. */
			data: MusicKit.Playlists[];
			/** The relative location to fetch the search result. */
			href?: string;
			/** A relative cursor to fetch the next paginated collection of resources in the result, if more exist. */
			next?: string;
		}

		/**
		 * An object containing an songs' search result.
		 * @see https://developer.apple.com/documentation/applemusicapi/searchresponse/results/songssearchresult
		 */
		interface SearchResponseResultsSongsSearchResult {
			/** The resources for the search result. */
			data: MusicKit.Songs[];
			/** The relative location to fetch the search result. */
			href?: string;
			/** A relative cursor to fetch the next paginated collection of resources in the result, if more exist. */
			next?: string;
		}
	}
}

export {};
