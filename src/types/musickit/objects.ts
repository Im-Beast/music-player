declare global {
	namespace MusicKit {
		type ContentRating = "explicit" | "clean";
		type AudioVariant =
			| "dolby-atmos"
			| "dolby-audio"
			| "hi-res-lossless"
			| "lossless"
			| "lossy-stereo";
		type TrackType = "music-videos" | "songs";

		/**
		 * An object that represents play parameters for resources.
		 * @see https://developer.apple.com/documentation/applemusicapi/playparameters
		 */
		interface PlayParameters {
			/** The ID of the content to use for playback. */
			id: string;
			/** The kind of the content to use for playback. */
			kind: string;
		}

		/**
		 * An object that represents a description attribute.
		 * @see An object that represents a description attribute.
		 */
		interface DescriptionAttribute {
			/** An abbreviated description to show inline or when the content appears alongside other content. */
			short?: string;
			/** A description to show when the content is prominently displayed. */
			standard?: string;
		}

		/**
		 * An object that represents a preview for resources.
		 * @see https://developer.apple.com/documentation/applemusicapi/preview
		 */
		interface Preview {
			/** The preview artwork for the associated preview music video. */
			artwork?: Artwork;
			/** The preview URL for the content. */
			url: string;
			/** The HLS preview URL for the content. */
			hlsUrl?: string;
		}

		/**
		 * An object that represents play parameters for resources.
		 * @see https://developer.apple.com/documentation/applemusicapi/playparameters
		 */
		interface PlayParameters {
			/** The ID of the content to use for playback. */
			id: string;
			/** The kind of the content to use for playback. */
			kind: string;
		}

		/**
		 * An object that represents artwork.
		 * @see https://developer.apple.com/documentation/applemusicapi/artwork
		 */
		interface Artwork {
			/** The average background color of the image. */
			bgColor?: string;
			/** The maximum height available for the image. */
			height: number;
			/** The maximum width available for the image. */
			width: number;
			/** The primary text color used if the background color gets displayed. */
			textColor1?: string;
			/** The secondary text color used if the background color gets displayed. */
			textColor2?: string;
			/** The tertiary text color used if the background color gets displayed. */
			textColor3?: string;
			/** The final post-tertiary text color used if the background color gets displayed. */
			textColor4?: string;
			/** The URL to request the image asset.\
			 * {w}x{h}must precede image filename, as placeholders for the width and height values as described above.\
			 * For example, {w}x{h}bb.jpeg).
			 */
			url: string;
		}

		/**
		 * A resource object that represents a music genre.
		 * @see https://developer.apple.com/documentation/applemusicapi/genres
		 */
		interface Genres {
			/** The identifier for the genre. */
			id: string;
			/** This value must always be genres. */
			type: "genres";
			/** The relative location for the genre resource. */
			href: string;
			/** The attributes for the genre. */
			attributes?: GenresAttributes;
		}

		/** The attributes for a genre resource. */
		interface GenresAttributes {
			/** The localized name of the genre. */
			name: string;
			/** The identifier of the parent for the genre. */
			parentId?: string;
			/** The localized name of the parent genre. */
			parentName?: string;
			/** (Extended) A localized string to use when displaying the genre in relation to charts. */
			chartLabel?: string;
		}

		/**
		 * A resource object that represents the artist of an album where an artist can be one or more people.
		 * @see https://developer.apple.com/documentation/applemusicapi/artists-uip
		 */
		interface Artists {
			/** The identifier for the album. */
			id: string;
			/** This value is always artists. */
			type: "artists";
			/** The relative location for the album resource. */
			href: string;
			/** The attributes for the artist. */
			attributes?: ArtistsAttributes;

			/** The relationships for the album. */
			relationships?: MusicKit.ResourceRelationships;
			/** The relationship views for the album. */
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
		 * The attributes for a playlist resource.
		 * @see https://developer.apple.com/documentation/applemusicapi/playlists/attributes
		 */
		interface PlaylistsAttributes {
			/** The playlist artwork. */
			artwork?: Artwork;
			/** The display name of the curator. */
			curatorName: string;
			/** A description of the playlist. */
			description?: DescriptionAttribute;
			/** Indicates whether the playlist represents a popularity chart. */
			isChart: boolean;
			/** The date the playlist was last modified. */
			lastModifiedDate?: string;
			/** The localized name of the playlist. */
			name: string;
			/**
			 * The type of playlist. Possible values are:
			 * - Editorial: A playlist created by an Apple Music curator.
			 * - External: A playlist created by a non-Apple curator or brand.
			 * - Personal-mix: A personalized playlist for an Apple Music user.
			 * - Replay: A personalized Apple Music Replay playlist for an Apple Music user.
			 * - User-shared: A playlist created and shared by an Apple Music user.
			 */
			playlistType: PlaylistType;
			/** The value map may be used to initiate playback of available tracks in the playlist. */
			playParams: PlayParameters;
			/** The URL for sharing the playlist in Apple Music. */
			url: string;
			/** The resource types that are present in the tracks of the playlists. */
			trackTypes?: TrackType[];
		}

		type PlaylistType = "editorial" | "external" | "personal-mix" | "replay" | "user-shared";
	}
}

export {};
