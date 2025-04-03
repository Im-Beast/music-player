import { alertController } from "@ionic/vue";

import { LocalImage, useLocalImages } from "@/stores/local-images";
import { Album, Artist, MusicKitSong, Playlist, SongPreview } from "@/stores/music-player";

import { MusicKitAuthorizationService } from "@/services/Authorization/MusicKitAuthorizationService";
import { MusicService, MusicServiceEvent, SilentError } from "@/services/Music/MusicService";

import { generateUUID } from "@/utils/crypto";
import { generateSongStyle } from "@/utils/songs";
import { Maybe } from "@/utils/types";

export function extractArtists(artists: MusicKit.Artists[] | Maybe<string>): Artist[] {
	if (!Array.isArray(artists)) {
		return typeof artists === "string" ? [{ name: artists }] : [];
	}

	return artists
		.map((artists) => ({
			id: artists.id,
			name: artists.attributes?.name,
		}))
		.filter((artist) => typeof artist.name === "string") as Artist[];
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

export function musicKitSearchResult(
	song: MusicKit.Songs | MusicKit.LibrarySongs,
): SongPreview<MusicKitSong> {
	const { id, attributes, relationships } = song;

	let artwork: Maybe<LocalImage>;
	if (attributes?.artwork) {
		const artworkUrl = MusicKit.formatArtworkURL(attributes.artwork, 256, 256);
		artwork = { url: artworkUrl };
	}

	const artists = extractArtistNames(relationships?.artists?.data ?? attributes?.artistName);
	const genres = extractGenres(relationships?.genres?.data ?? attributes?.genreNames);
	const explicit = song.attributes?.contentRating === "explicit";
	const available = typeof song.attributes?.playParams === "object";

	return {
		type: "musickit",

		id,
		artists,
		title: attributes?.name,
		album: attributes?.albumName,
		duration: attributes?.durationInMillis && attributes?.durationInMillis / 1000,
		genres,

		explicit,
		available,

		artwork,
	};
}

export async function musicKitPreviewToSong(
	searchResult: SongPreview<MusicKitSong>,
): Promise<MusicKitSong> {
	const { id, artists, title, album, duration, available = false, explicit = false } = searchResult;

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

	return {
		type: "musickit",

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

		data: { catalogId: id },
	};
}

export async function musicKitSong(
	song: MusicKit.Songs | MusicKit.LibrarySongs,
): Promise<MusicKitSong> {
	const { id, attributes, relationships } = song;

	const artwork = await extractArtwork(id, attributes?.artwork);
	const artists = extractArtistNames(relationships?.artists?.data ?? attributes?.artistName);
	const genres = extractGenres(relationships?.genres?.data ?? attributes?.genreNames);
	const explicit = song.attributes?.contentRating === "explicit";
	const available = typeof song.attributes?.playParams === "object";

	let catalogId = id;
	if (relationships && "catalog" in relationships) {
		const song = relationships.catalog?.data?.[0];
		catalogId = song?.id ?? id;
	}

	return {
		type: "musickit",

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
	};
}

export async function musicKitAlbum(album: MusicKit.Albums): Promise<Album> {
	const { id, attributes, relationships } = album;

	const title = attributes?.name ?? "Unknown title";
	const artwork = await extractArtwork(id, attributes?.artwork);
	const artists = extractArtists(relationships?.artists?.data ?? attributes?.artistName);

	const songs: Album["songs"] = [];
	const tracks = relationships?.tracks?.data;
	if (tracks) {
		for (const track of tracks) {
			songs.push({
				discNumber: track.attributes?.discNumber,
				trackNumber: track.attributes?.trackNumber,
				song: musicKitSearchResult(track),
			});
		}
	}

	return {
		id: album.id,
		title,
		artists,
		artwork,
		songs,
	};
}

export function musicKitIdType(id: string): "library" | "catalog" {
	if (!isNaN(Number(id))) {
		return "catalog";
	}
	return "library";
}

export class MusicKitMusicService extends MusicService<MusicKitSong> {
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

	async handleGetSongsAlbum(song: MusicKitSong, cache = true): Promise<Maybe<Album>> {
		// We want to retrieve catalog album
		const { catalogId } = song.data;

		const response = await this.music!.api.music<MusicKit.AlbumsResponse, MusicKit.AlbumsQuery>(
			`/v1/catalog/{{storefrontId}}/songs/${catalogId}/albums`,
			{ include: ["artists", "tracks"] },
		);

		const album = response.data?.data?.[0];
		if (!album) return;

		if (cache) {
			const cachedAlbum = this.getCached<Album>(album.id);
			if (cachedAlbum) return cachedAlbum;
		}

		return this.cache(await musicKitAlbum(album));
	}

	async handleGetAlbum(id: string, cache = true): Promise<Maybe<Album>> {
		if (cache) {
			const cachedAlbum = this.getCached<Album>(id);
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

		return this.cache(await musicKitAlbum(album));
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
		const songs = await Promise.all(tracks.map(musicKitSong));

		return {
			id,
			importInfo: {
				id: musicKitId,
				type: "musickit",
				info: url.toString(),
			},
			title,
			artwork,
			songs,
		};
	}

	async *handleSearchSongs(
		term: string,
		offset: number,
		options?: { signal: AbortSignal },
	): AsyncGenerator<SongPreview<MusicKitSong>> {
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
			yield musicKitSearchResult(song);
		}
	}

	async handleGetSongFromPreview(searchResult: SongPreview<MusicKitSong>): Promise<MusicKitSong> {
		return await musicKitPreviewToSong(searchResult);
	}

	async handleRefreshLibrarySongs(): Promise<void> {
		// TODO: Unimplemented
	}

	async handleGetSong(songId: string, cache = true): Promise<MusicKitSong> {
		if (cache) {
			const cachedSong = this.getCached<MusicKitSong>(songId);
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

		return this.cache(await musicKitSong(responseSong));
	}

	async handleRefreshSong(song: MusicKitSong): Promise<MusicKitSong> {
		return await this.handleGetSong(song.id, false);
	}

	async handleLibrarySongs(offset: number): Promise<MusicKitSong[]> {
		const response = await this.music!.api.music<
			MusicKit.LibrarySongsResponse,
			MusicKit.LibrarySongsQuery
		>("/v1/me/library/songs", { limit: 25, offset, include: ["catalog"] });

		const songs = response.data.data
			.filter((song) => {
				// Filter out songs that cannot be played
				return !!song.attributes?.playParams;
			})
			.map((song) => this.getCached<MusicKitSong>(song.id) ?? this.cachePromise(musicKitSong(song)));

		return await Promise.all(songs);
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
