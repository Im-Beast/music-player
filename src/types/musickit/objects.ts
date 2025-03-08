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
			relationships?: MusicKit.ResourceRelationships;
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
			relationships?: MusicKit.ResourceRelationships;
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
	}
}

export {};
