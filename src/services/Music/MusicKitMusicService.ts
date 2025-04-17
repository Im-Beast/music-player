import { alertController } from "@ionic/vue";

import { LocalImage, useLocalImages } from "@/stores/local-images";

import { MusicKitAuthorizationService } from "@/services/Authorization/MusicKitAuthorizationService";
import { MusicService, MusicServiceEvent, SilentError } from "@/services/Music/MusicService";

import { generateUUID } from "@/utils/crypto";
import { generateSongStyle } from "@/utils/songs";
import { Maybe } from "@/utils/types";

import {
	Album,
	AlbumKey,
	AlbumPreview,
	AlbumPreviewKey,
	AlbumSong,
	Artist,
	ArtistId,
	ArtistKey,
	ArtistPreview,
	cache,
	DisplayableArtist,
	Filled,
	generateCacheMethod,
	getKey,
	Playlist,
	Song,
	SongKey,
	SongPreview,
	SongPreviewKey,
} from "./objects";

const getCached = generateCacheMethod("musickit");

type MusicKitAlbum = Album<"musickit">;
type MusicKitAlbumKey = AlbumKey<"musickit">;
type MusicKitAlbumPreviewKey = AlbumPreviewKey<"musickit">;
type MusicKitAlbumPreview = AlbumPreview<"musickit">;
type MusicKitAlbumSong = AlbumSong<"musickit">;
type MusicKitArtist = Artist<"musickit">;
type MusicKitArtistPreview = ArtistPreview<"musickit">;
type _MusicKitArtistKey = ArtistKey<"musickit">;
type MusicKitSong = Song<"musickit">;
type MusicKitSongKey = SongKey<"musickit">;
type MusicKitSongPreview = SongPreview<"musickit", true>;
type MusicKitSongPreviewKey = SongPreviewKey<"musickit">;
type MusicKitDisplayableArtist = DisplayableArtist<"musickit">;

export function extractDisplayableArtists(
	artists: MusicKit.Artists[] | Maybe<string>,
): MusicKitDisplayableArtist[] {
	if (!artists) {
		return [];
	} else if (typeof artists === "string") {
		return [{ title: artists }];
	}

	const keys: MusicKitDisplayableArtist[] = [];
	for (const artist of artists) {
		if (!artist.attributes?.name) continue;

		let artwork: Maybe<LocalImage>;
		if (artist.attributes.artwork) {
			artwork = { url: MusicKit.formatArtworkURL(artist.attributes.artwork, 256, 256) };
		}

		const item: MusicKitArtistPreview = {
			type: "musickit",
			kind: "artistPreview",
			id: artist.id,

			title: artist.attributes.name,
			artwork,
		};
		cache(item);
		keys.push(getKey(item));
	}
	return keys;
}

export function extractCatalogId(
	data?: string | MusicKit.Songs | MusicKit.LibrarySongs | MusicKit.LibrarySongsRelationships,
): Maybe<string> {
	if (!data) {
		return;
	}

	if (typeof data === "string") {
		if (musicKitIdType(data) === "catalog") {
			return data;
		}
		return;
	}

	if ("id" in data) {
		if (musicKitIdType(data.id) === "catalog") return data.id;
		return;
	}

	if ("catalog" in data) {
		const song = data.catalog?.data?.[0];
		if (song?.id && musicKitIdType(song.id) === "catalog") {
			return song.id;
		}
	}
}

export function extractArtistNames(artists: MusicKit.Artists[] | Maybe<string>): string[] {
	if (!Array.isArray(artists)) {
		return typeof artists === "string" ? [artists] : [];
	}

	return artists
		.map((artists) => artists.attributes?.name)
		.filter((artist) => typeof artist === "string");
}

export function extractGenres(genres: MusicKit.Genres[] | Maybe<string[]>): string[] {
	if (!genres) {
		return [];
	}

	return genres
		.map((genre) => (typeof genre === "string" ? genre : genre.attributes?.name))
		.filter((genre) => typeof genre === "string");
}

export async function extractArtwork(id: string, artwork: MusicKit.Artwork): Promise<LocalImage>;
export async function extractArtwork(
	id: string,
	artwork?: MusicKit.Artwork,
): Promise<Maybe<LocalImage>>;
export async function extractArtwork(
	id: string,
	artwork?: MusicKit.Artwork,
): Promise<Maybe<LocalImage>> {
	if (!artwork) return;

	const localImages = useLocalImages();
	const artworkUrl = MusicKit.formatArtworkURL(artwork, 256, 256);
	try {
		const artworkBlob = await (await fetch(artworkUrl)).blob();
		await localImages.associateImage(id, artworkBlob);
		return { id };
	} catch {
		// TODO: Remove this after Apple fixes artwork CORS issues
		return { url: artworkUrl };
	}
}

export function musicKitSongPreview(
	song: MusicKit.Songs | MusicKit.LibrarySongs,
): MusicKitSongPreview {
	const { id, attributes, relationships } = song;

	let artwork: Maybe<LocalImage>;
	if (attributes?.artwork) {
		const artworkUrl = MusicKit.formatArtworkURL(attributes.artwork, 256, 256);
		artwork = { url: artworkUrl };
	}

	const artists = extractDisplayableArtists(relationships?.artists?.data ?? attributes?.artistName);
	const genres = extractGenres(relationships?.genres?.data ?? attributes?.genreNames);
	const explicit = song.attributes?.contentRating === "explicit";
	const available = typeof song.attributes?.playParams === "object";

	const catalogId = extractCatalogId(
		relationships && "catalog" in relationships ? relationships : song,
	);

	return cache<MusicKitSongPreview>({
		id,
		type: "musickit",
		kind: "songPreview",

		artists,

		title: attributes?.name,
		album: attributes?.albumName,
		duration: attributes?.durationInMillis && attributes?.durationInMillis / 1000,
		genres,

		explicit,
		available,

		artwork,

		data: { catalogId },
	});
}

export async function musicKitPreviewToSong(
	searchResult: MusicKitSongPreview,
): Promise<MusicKitSong> {
	const { id, title, album, artists, duration, available = false, explicit = false } = searchResult;

	const genres = searchResult.genres ?? [];
	let artwork: Maybe<LocalImage>;
	if (searchResult.artwork) {
		const localImages = useLocalImages();
		try {
			const response = await fetch(searchResult.artwork.url!);
			const artworkBlob = await response.blob();
			await localImages.associateImage(id, artworkBlob);
			artwork = { id };
		} catch {
			artwork = searchResult.artwork;
		}
	}

	const catalogId = extractCatalogId(searchResult.data?.catalogId ?? id);

	return {
		type: "musickit",
		kind: "song",
		id,

		artists,
		genres,

		title,
		album,
		duration,

		explicit,
		available,

		artwork,
		style: await generateSongStyle(artwork),

		data: { catalogId },
	};
}

export async function musicKitSong(
	song: MusicKit.Songs | MusicKit.LibrarySongs,
): Promise<MusicKitSong> {
	const { id, attributes, relationships } = song;

	const artwork = await extractArtwork(id, attributes?.artwork);
	const artists = extractDisplayableArtists(relationships?.artists?.data ?? attributes?.artistName);
	const genres = extractGenres(relationships?.genres?.data ?? attributes?.genreNames);
	const explicit = song.attributes?.contentRating === "explicit";
	const available = typeof song.attributes?.playParams === "object";

	const catalogId = extractCatalogId(
		relationships && "catalog" in relationships ? relationships : song,
	);

	return cache<MusicKitSong>({
		type: "musickit",
		kind: "song",
		id,

		artists,
		genres,

		explicit,
		available,

		title: attributes?.name,
		album: attributes?.albumName,
		duration: attributes?.durationInMillis && attributes?.durationInMillis / 1000,

		artwork,
		style: await generateSongStyle(artwork),

		data: { catalogId },
	});
}

export async function musicKitAlbum(album: MusicKit.Albums): Promise<MusicKitAlbum> {
	const { id, attributes, relationships } = album;

	const title = attributes?.name ?? "Unknown title";
	const artwork = await extractArtwork(id, attributes?.artwork);
	const artists = extractDisplayableArtists(relationships?.artists?.data ?? attributes?.artistName);

	const songs: MusicKitAlbumSong[] = [];
	const tracks = relationships?.tracks?.data;
	if (tracks) {
		for (const track of tracks) {
			const cached = getCached("song", track.id) ?? getCached("songPreview", track.id);
			const songPreview: MusicKitSongPreview = cached ?? musicKitSongPreview(track);

			songs.push({
				discNumber: track.attributes?.discNumber,
				trackNumber: Number(track.attributes?.trackNumber),
				song: getKey(songPreview),
			});
		}
	}

	return cache<MusicKitAlbum>({
		type: "musickit",
		kind: "album",
		id,

		title,
		artwork,

		artists,
		songs,
	});
}

export function musicKitAlbumPreview(album: MusicKit.Albums): MusicKitAlbumPreview {
	const { id, attributes, relationships } = album;

	const title = attributes?.name ?? "Unknown title";
	const artists = extractDisplayableArtists(relationships?.artists?.data ?? attributes?.artistName);

	let artwork: Maybe<LocalImage>;
	if (attributes?.artwork) {
		const artworkUrl = MusicKit.formatArtworkURL(attributes.artwork, 256, 256);
		artwork = { url: artworkUrl };
	}

	return {
		id,
		type: "musickit",
		kind: "albumPreview",

		title,
		artists,
		artwork,
	};
}

export function musicKitArtistPreview(artist: MusicKit.LibraryArtists): MusicKitArtistPreview {
	const { id, attributes, relationships } = artist;
	const catalogArtist = relationships?.catalog?.data?.[0];

	let artwork: Maybe<LocalImage>;
	if (catalogArtist?.attributes?.artwork) {
		const artworkUrl = MusicKit.formatArtworkURL(catalogArtist.attributes.artwork, 256, 256);
		artwork = { url: artworkUrl };
	}

	return {
		id,
		type: "musickit",
		kind: "artistPreview",

		title: (attributes?.name ?? catalogArtist?.attributes?.name)!,
		artwork,
	};
}

export async function musicKitArtist(
	artist: MusicKit.Artists | MusicKit.LibraryArtists,
): Promise<MusicKitArtist> {
	const { id, attributes, relationships } = artist;

	const catalogArtist =
		artist.type === "library-artists" ? artist.relationships?.catalog?.data?.[0] : artist;

	const artwork = await extractArtwork(id, catalogArtist?.attributes?.artwork);

	const albums: (MusicKitAlbumKey | MusicKitAlbumPreviewKey)[] = [];
	const catalogAlbums = relationships?.albums?.data;
	if (catalogAlbums?.length) {
		for (const album of catalogAlbums) {
			const albumPreview =
				getCached("album", album.id) ??
				getCached("albumPreview", album.id) ??
				cache(musicKitAlbumPreview(album));

			albums.push(getKey(albumPreview));
		}
	}

	const songs: (MusicKitSongKey | MusicKitSongPreviewKey)[] = [];
	if (relationships && "songs" in relationships) {
		for (const song of relationships.songs.data) {
			const songPreview =
				getCached("song", song.id) ??
				getCached("songPreview", song.id) ??
				cache(musicKitSongPreview(song));

			songs.push(getKey(songPreview));
		}
	}

	return {
		id,
		type: "musickit",
		kind: "artist",

		title: (attributes?.name ?? catalogArtist?.attributes?.name)!,
		artwork,

		albums,
		songs,
	};
}

export function musicKitIdType(id: string): "library" | "catalog" {
	if (!isNaN(Number(id))) {
		return "catalog";
	}
	return "library";
}

export class MusicKitMusicService extends MusicService<"musickit"> {
	logName = "MusicKitMusicService";
	logColor = "#cc80dd";
	type = "musickit" as const;
	available = true;

	music?: MusicKit.MusicKitInstance;
	authorization = new MusicKitAuthorizationService();

	constructor() {
		super();
	}

	async handleSearchHints(term: string): Promise<string[]> {
		if (!term) return [];

		const response = await this.music!.api.music<{ results: { terms: string[] } }>(
			"/v1/catalog/{{storefrontId}}/search/hints",
			{ term },
		);

		const { terms } = response.data.results;
		return terms;
	}

	async *handleGetLibraryArtists(options?: {
		signal?: AbortSignal;
	}): AsyncGenerator<MusicKitArtistPreview> {
		const response = await this.music!.api.music<
			MusicKit.LibraryArtistsResponse,
			MusicKit.LibraryArtistsQuery
		>(`/v1/me/library/artists`, {
			include: ["catalog"],
		});

		const artists = response.data.data;
		if (!artists.length) return;

		for (const artist of artists) {
			if (options?.signal?.aborted) return;
			yield musicKitArtistPreview(artist);
		}
	}

	async handleGetArtist(id: string): Promise<Maybe<Artist<"musickit">>> {
		const cachedArtist = getCached("artist", id);
		if (cachedArtist) return cachedArtist;

		const idType = musicKitIdType(id);

		let response: { data: MusicKit.ArtistsResponse | MusicKit.LibraryArtistsResponse };
		if (idType === "catalog") {
			response = await this.music!.api.music<MusicKit.ArtistsResponse, MusicKit.ArtistsQuery>(
				`/v1/catalog/{{storefrontId}}/artists/${id}`,
				{ include: ["albums", "songs"] },
			);
		} else {
			response = await this.music!.api.music<
				MusicKit.LibraryArtistsResponse,
				MusicKit.LibraryArtistsQuery
			>(`/v1/me/library/artists/${id}`, { include: ["catalog", "albums"] });
		}

		const artist = response.data?.data?.[0];
		if (!artist) return;

		return cache(await musicKitArtist(artist));
	}

	// TODO: Make a unified way to handle pagination in MusicKit, that uses "next" instead of calculating it manually
	#artistsSongsPagination: Record<ArtistId, { maxOffset?: number; pages: string[] }> = {};
	async *handleGetArtistsSongs(
		artist: MusicKitArtist | Filled<MusicKitArtist>,
		offset: number,
		options?: { signal?: AbortSignal },
	): AsyncGenerator<MusicKitSong | MusicKitSongPreview> {
		const pagination = (this.#artistsSongsPagination[artist.id] ??= { pages: [] });

		if (options?.signal?.aborted || (pagination.maxOffset && offset > pagination.maxOffset)) {
			return;
		}

		const response = await this.music!.api.music<MusicKit.SongsResponse>(
			`/v1/catalog/{{storefrontId}}/artists/${artist.id}/view/top-songs`,
			{ offset: offset * 25, limit: 25 },
		);

		if (!response?.data?.next) {
			pagination.maxOffset = offset;
		}

		if (!response?.data?.data || options?.signal?.aborted) {
			return;
		}

		for (const song of response.data.data) {
			if (options?.signal?.aborted) return;

			const songPreview =
				getCached("song", song.id) ??
				getCached("songPreview", song.id) ??
				cache(musicKitSongPreview(song));

			yield songPreview;
		}
	}

	async *handleGetLibraryAlbums(options?: {
		signal?: AbortSignal;
	}): AsyncGenerator<MusicKitAlbumPreview> {
		const response = await this.music!.api.music<MusicKit.AlbumsResponse, MusicKit.AlbumsQuery>(
			`/v1/me/library/albums`,
			{ include: ["artists"] },
		);

		const albums = response.data.data;
		if (!albums.length) return;

		for (const album of albums) {
			if (options?.signal?.aborted) return;
			yield musicKitAlbumPreview(album);
		}
	}

	async handleGetSongsAlbum(song: MusicKitSong, useCache = true): Promise<Maybe<MusicKitAlbum>> {
		let { catalogId } = song.data;

		// In case cached version doesn't have catalogId, get it
		// TODO: Prevent overriding valid cached instances that contain more information
		if (!catalogId) {
			const refreshed = await this.refreshSong(song);
			catalogId = refreshed!.data.catalogId;
		}

		// We want to retrieve catalog album
		const response = await this.music!.api.music<MusicKit.AlbumsResponse, MusicKit.AlbumsQuery>(
			`/v1/catalog/{{storefrontId}}/songs/${catalogId}/albums`,
			{ include: ["artists", "tracks"] },
		);

		const album = response.data?.data?.[0];
		if (!album) return;

		if (useCache) {
			const cachedAlbum = getCached("album", album.id);
			if (cachedAlbum) return cachedAlbum;
		}

		return cache(await musicKitAlbum(album));
	}

	async handleGetAlbum(id: string, useCache = true): Promise<Maybe<MusicKitAlbum>> {
		if (useCache) {
			const cachedAlbum = getCached("album", id);
			if (cachedAlbum) return cachedAlbum;
		}

		const idType = musicKitIdType(id);

		const response = await this.music!.api.music<MusicKit.AlbumsResponse, MusicKit.AlbumsQuery>(
			idType === "catalog"
				? `/v1/catalog/{{storefrontId}}/albums/${id}`
				: `/v1/me/library/albums/${id}`,
			{ include: ["artists", "tracks"] },
		);

		const album = response.data?.data?.[0];
		if (!album) return;

		return cache(await musicKitAlbum(album));
	}

	async handleGetPlaylist(url: URL): Promise<Maybe<Playlist>> {
		let endpoint: string | undefined;

		const { pathname } = url;

		if (!url.origin.endsWith("music.apple.com")) {
			return;
		}

		/// e.g.
		// https://music.apple.com/library/playlist/<libraryPlaylistId>
		if (pathname.includes("library")) {
			endpoint = "/v1/me/library/playlists";
		} else {
			// https://music.apple.com/pl/playlist/heavy-rotation-mix/<storefrontPlaylistId>
			// https://music.apple.com/pl/playlist/get-up-mix/<storefrontPlaylistId>
			endpoint = "/v1/catalog/{{storefrontId}}/playlists";
		}

		const idStartIndex = pathname.lastIndexOf("/");
		if (idStartIndex === -1) {
			return;
		}

		const musicKitId = pathname.slice(idStartIndex + 1);
		if (!musicKitId) {
			return;
		}

		const response = await this.music!.api.music<MusicKit.PlaylistsResponse, MusicKit.PlaylistsQuery>(
			`${endpoint}/${musicKitId}`,
			{
				extend: ["editorialArtwork", "editorialVideo", "offers"],
				include: ["tracks"],
			},
		);
		const playlist = response.data.data?.[0];

		if (!playlist) {
			return;
		}

		const id = generateUUID();
		const { attributes } = playlist;
		const title = attributes?.name ?? "Unknown title";

		let artwork: Maybe<LocalImage>;
		if (attributes?.artwork) {
			const localImages = useLocalImages();
			const artworkUrl = MusicKit.formatArtworkURL(attributes.artwork, 256, 256);
			const artworkBlob = await (await fetch(artworkUrl)).blob();
			await localImages.associateImage(id, artworkBlob);
			artwork = { id };
		}

		const tracks = playlist.relationships?.tracks.data ?? [];
		const songs = await Promise.all(tracks.map((track) => musicKitSong(track).then(getKey)));

		return {
			type: "unimusic",
			kind: "playlist",
			id,
			title,
			artwork,
			songs,
		};
	}

	async *handleSearchSongs(
		term: string,
		offset: number,
		options?: { signal: AbortSignal },
	): AsyncGenerator<MusicKitSongPreview> {
		const response = await this.music!.api.music<
			MusicKit.SearchResponse,
			MusicKit.CatalogSearchQuery
		>("/v1/catalog/{{storefrontId}}/search", {
			term,
			types: ["songs", "music-videos"],
			limit: 25,
			offset: offset * 25 + 1,
		});

		const songs = response?.data?.results?.songs?.data;
		if (!songs) return;

		for (const song of songs) {
			if (options?.signal?.aborted) {
				return;
			}
			yield musicKitSongPreview(song);
		}
	}

	async handleGetSongFromPreview(searchResult: MusicKitSongPreview): Promise<MusicKitSong> {
		return await musicKitPreviewToSong(searchResult);
	}

	async handleRefreshLibrarySongs(): Promise<void> {
		// TODO: Unimplemented
	}

	async handleGetSong(songId: string, useCache = true): Promise<MusicKitSong> {
		if (useCache) {
			const cachedSong = getCached("song", songId);
			if (cachedSong) return cachedSong;
		}

		const idType = musicKitIdType(songId);

		const response = await this.music!.api.music<
			MusicKit.SongsResponse | MusicKit.LibrarySongsResponse
		>(
			idType === "catalog"
				? `/v1/catalog/{{storefrontId}}/songs/${songId}`
				: `/v1/me/library/songs/${songId}`,
			{ include: ["artists", "catalog"] },
		);

		const [responseSong] = response.data.data;
		if (!responseSong) {
			throw new Error(`Failed to find a song with id: ${songId}`);
		}

		return cache(await musicKitSong(responseSong));
	}

	async handleRefreshSong(song: MusicKitSong): Promise<MusicKitSong> {
		return await this.handleGetSong(song.id, false);
	}

	async *handleGetLibrarySongs(offset: number): AsyncGenerator<MusicKitSong> {
		const response = await this.music!.api.music<
			MusicKit.LibrarySongsResponse,
			MusicKit.LibrarySongsQuery
		>("/v1/me/library/songs", { limit: 25, offset, include: ["catalog"] });

		for (const song of response.data.data) {
			// Filter out songs that cannot be played
			if (!song.attributes?.playParams) continue;
			yield getCached("song", song.id) ?? cache(musicKitSong(song));
		}
	}

	async handleInitialization(): Promise<void> {
		while (!this.authorization.authorized.value) {
			const alert = await alertController.create({
				header: "You need to authorize MusicKit",
				subHeader: this.logName,
				message: "To use MusicKit you have to be authorized",
				buttons: [
					{ text: "Authorize", role: "confirm" },
					{ text: "Disable", role: "destructive" },
				],
			});

			await alert.present();
			const { role } = await alert.onDidDismiss();
			if (role === "confirm") {
				await this.authorization.authorize();
			} else {
				await this.disable();
				throw new SilentError("Failed authorization");
			}
		}

		const music = MusicKit.getInstance()!;
		this.music = music;

		music.repeatMode = MusicKit.PlayerRepeatMode.none;
		music.addEventListener("playbackTimeDidChange", () => {
			this.dispatchEvent(new MusicServiceEvent("timeupdate", this.music!.currentPlaybackTime));
		});
		music.addEventListener("mediaCanPlay", () => {
			this.dispatchEvent(new MusicServiceEvent("playing"));
		});

		// MusicKit attaches listeners to persist playback state on visibility state changes
		// Since we can pause/play/skip songs while in the background this isn't what we want, thus we make sure it is in the correct state
		music.addEventListener("playbackStateDidChange", async ({ state }) => {
			switch (state) {
				case MusicKit.PlaybackStates.ended:
					this.dispatchEvent(new MusicServiceEvent("ended"));
					break;
				case MusicKit.PlaybackStates.playing:
					if (!this.song) {
						await music.stop();
					}
					break;
			}
		});

		// NOTE: Required for Music Videos to work
		const dummyVideoContainer = document.createElement("div");
		music.videoContainerElement = dummyVideoContainer;
	}

	handleDeinitialization(): void {}

	async handlePlay(): Promise<void> {
		try {
			const { music, song } = this;
			if (!music || !song) return;

			await music.stop();
			await music.setQueue({ song: song.id, startPlaying: true, startTime: 0 });
		} catch (error) {
			console.log("err:", error);

			if (error instanceof Error) {
				// Someone skipped or stopped the song while it was still trying to play it, let it slide
				if (
					error.name === "AbortError" ||
					error.message.includes(
						"The play() method was called without a previous stop() or pause() call.",
					)
				) {
					return;
				}
			}

			throw error;
		}
	}

	async handleResume(): Promise<void> {
		await this.music?.play();
	}

	async handlePause(): Promise<void> {
		await this.music?.pause();
	}

	async handleStop(): Promise<void> {
		await this.music?.stop();
	}

	async handleSeekToTime(timeInSeconds: number): Promise<void> {
		await this.music?.seekToTime(timeInSeconds);
	}

	handleSetVolume(volume: number): void {
		if (!this.music) return;
		this.music.volume = volume;
	}
}
