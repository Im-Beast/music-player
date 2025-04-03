import BG, { buildURL, WebPoSignalOutput } from "bgutils-js";
import Innertube, { YTMusic, YTNodes } from "youtubei.js/web";

import { MusicService, MusicServiceEvent } from "@/services/Music/MusicService";
import type { Album, Artist, Playlist, SongPreview, YouTubeSong } from "@/stores/music-player";

import { LocalImage, useLocalImages } from "@/stores/local-images";
import { generateUUID } from "@/utils/crypto";
import { getPlatform, isElectron } from "@/utils/os";
import { generateSongStyle } from "@/utils/songs";
import { Maybe } from "@/utils/types";

export function youtubeSongSearchResult(
	node: YTNodes.MusicResponsiveListItem,
	albumId?: string,
): SongPreview<YouTubeSong> {
	const { id, title, album } = node;

	const artwork = node.thumbnails?.[0] && { url: node.thumbnails[0].url };
	const artists = (node.artists ?? node.authors)?.map(({ name }) => name) ?? [];
	const available = node.item_type !== "unknown";
	const explicit =
		node.badges?.some(
			(badge) => badge.is(YTNodes.MusicInlineBadge) && badge.icon_type === "MUSIC_EXPLICIT_BADGE",
		) ?? false;

	return {
		type: "youtube",
		// Song might not have a visible ID if its not available
		id: id ?? generateUUID(),
		title,
		artists,
		artwork,

		available,
		explicit,

		album: album?.name,

		genres: [],
		data: { albumId },
	};
}

export async function youtubeSong(
	trackInfo: YTMusic.TrackInfo,
	searchResult?: SongPreview<YouTubeSong>,
): Promise<YouTubeSong> {
	const { id, title, author, duration, thumbnail } = trackInfo.basic_info;
	if (!id) {
		throw new Error("Cannot generate YouTubeSong from trackInfo that doesn't have id");
	}

	const thumbnailUrl = thumbnail?.[0]?.url;
	let artwork: Maybe<LocalImage>;
	if (thumbnailUrl) {
		const localImages = useLocalImages();
		const artworkBlob = await (await fetch(thumbnailUrl)).blob();
		await localImages.associateImage(id, artworkBlob, {
			maxWidth: 512,
			maxHeight: 512,
		});
		artwork = { id };
	}

	const available = searchResult?.available ?? trackInfo?.playability_status?.status === "OK";

	let album: Maybe<string>;
	let albumId = searchResult?.data?.albumId;
	let explicit = searchResult?.explicit ?? false;
	if (trackInfo.tabs) {
		outer: for (const tab of trackInfo.tabs) {
			if (!tab.content?.is(YTNodes.MusicQueue)) continue;
			if (!tab.content?.content?.is(YTNodes.PlaylistPanel)) continue;

			for (const node of tab.content.content.contents) {
				if (!node.is(YTNodes.PlaylistPanelVideo) || !node.album?.id) continue;
				explicit ||= node.badges?.some(
					(badge) => badge.is(YTNodes.MusicInlineBadge) && badge.icon_type === "MUSIC_EXPLICIT_BADGE",
				);
				albumId = node.album.id;
				album = node.album.name;
				break outer;
			}
		}
	} else {
		album = searchResult?.album;
		const browserMediaSession = trackInfo.player_overlays?.browser_media_session?.as(
			YTNodes.BrowserMediaSession,
		);
		if (browserMediaSession) {
			album = browserMediaSession.album.text;
		}
	}

	const artists = searchResult?.artists ?? (author ? [author] : []);
	// TODO: Genres
	const genres = searchResult?.genres ?? [];

	return {
		type: "youtube",

		id,
		artists,
		genres,

		title,
		album,
		duration,

		available,
		explicit,

		artwork,
		style: await generateSongStyle(artwork),

		data: { albumId },
	};
}

export async function youtubeAlbum(id: string, album: YTMusic.Album): Promise<Album> {
	const title = album.header?.title.toString() ?? "Unknown title";

	const thumbnail = album.background?.as(YTNodes.MusicThumbnail);
	const thumbnailUrl = thumbnail?.contents?.[0]?.url;

	let artwork: Maybe<LocalImage>;
	if (thumbnailUrl) {
		const localImages = useLocalImages();
		const artworkBlob = await (await fetch(thumbnailUrl)).blob();
		await localImages.associateImage(id, artworkBlob, {
			maxWidth: 512,
			maxHeight: 512,
		});
		artwork = { id };
	}

	const artists: Artist[] = [];
	const artistText = album.header?.as(YTNodes.MusicResponsiveHeader)?.strapline_text_one?.runs;
	if (artistText) {
		for (const run of artistText) {
			if (!("endpoint" in run)) continue;
			artists.push({
				id: run.endpoint?.payload?.browseId,
				name: run.text,
			});
		}
	}

	const songs: Album["songs"] = [];
	for (const node of album.contents) {
		const trackNumber = node.index !== undefined ? parseInt(node.index.toString()) : undefined;
		songs.push({
			trackNumber: isNaN(trackNumber!) ? undefined : trackNumber,
			song: youtubeSongSearchResult(node, id),
		});
	}

	return {
		id,
		title,
		artists,
		artwork,
		songs,
	};
}

const USER_AGENT =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.1";
const GOOG_API_KEY = "AIzaSyDyT5W0Jh49F30Pqqtyfdf7pDLFKLJoAnw";
const REQUEST_KEY = "O43z0dpjhgX20SCx4KAo";

async function createWebPoMinter(): Promise<BG.WebPoMinter> {
	const fetch = isElectron() ? window.fetch : window.capacitorFetch;

	const headers = {
		"content-type": "application/json+protobuf",
		"user-agent": USER_AGENT,
		"x-goog-api-key": GOOG_API_KEY,
		"x-user-agent": "grpc-web-javascript/0.1",
	};

	const challengeResponse = await fetch(buildURL("Create", true), {
		method: "POST",
		headers,
		body: JSON.stringify([REQUEST_KEY]),
	});

	const challengeResponseData = await challengeResponse.json();

	const bgChallenge = BG.Challenge.parseChallengeData(challengeResponseData);

	if (!bgChallenge) {
		throw new Error("Could not get challenge");
	}

	const interpreterJavascript =
		bgChallenge.interpreterJavascript.privateDoNotAccessOrElseSafeScriptWrappedValue;

	// TODO: It would be a good idea to sandbox this, however I am unsure if that is possible
	// eslint-disable-next-line @typescript-eslint/no-implied-eval
	new Function(interpreterJavascript!)();

	const botguardClient = await BG.BotGuardClient.create({
		globalObj: globalThis,
		globalName: bgChallenge.globalName,
		program: bgChallenge.program,
	});

	const webPoSignalOutput: WebPoSignalOutput = [];
	const botguardResponse = await botguardClient.snapshot({ webPoSignalOutput });

	const integrityTokenResponse = await fetch(buildURL("GenerateIT", true), {
		method: "POST",
		headers,
		body: JSON.stringify([REQUEST_KEY, botguardResponse]),
	});

	const [integrityToken]: [string?] = await integrityTokenResponse.json();
	if (!integrityToken) {
		throw new Error(
			`Could not get integrity token. Interpreter Hash: ${bgChallenge.interpreterHash}`,
		);
	}

	const integrityTokenBasedMinter = await BG.WebPoMinter.create(
		{ integrityToken },
		webPoSignalOutput,
	);

	return integrityTokenBasedMinter;
}

export class YouTubeMusicService extends MusicService<YouTubeSong> {
	logName = "YouTubeMusicService";
	logColor = "#ff0000";
	type = "youtube" as const;
	available = getPlatform() !== "web";

	innertube?: Innertube;
	audio?: HTMLAudioElement;

	async handleInitialization(): Promise<void> {
		const audio = new Audio();
		document.body.appendChild(audio);
		audio.addEventListener("timeupdate", () => {
			this.dispatchEvent(new MusicServiceEvent("timeupdate", audio.currentTime));
		});
		audio.addEventListener("playing", () => {
			this.dispatchEvent(new MusicServiceEvent("playing"));
		});
		audio.addEventListener("ended", () => {
			this.dispatchEvent(new MusicServiceEvent("ended"));
		});
		this.audio = audio;

		// TODO: Proxy for web support
		const fetch = isElectron() ? ElectronMusicPlayer!.fetchShim : window.capacitorFetch;

		const tmp = await Innertube.create({
			generate_session_locally: false,
			retrieve_player: false,
			user_agent: USER_AGENT,
			fetch,
		});
		const { visitorData } = tmp.session.context.client;
		if (!visitorData) {
			throw new Error("Could not get visitor data");
		}

		const minter = await createWebPoMinter();
		const poToken = await minter.mintAsWebsafeString(visitorData);

		console.log("pot:", poToken);
		const innertube = await Innertube.create({
			po_token: poToken,
			visitor_data: visitorData,
			generate_session_locally: false,
			user_agent: USER_AGENT,
			fetch,
		});

		this.innertube = innertube;
	}

	handleDeinitialization(): void {}

	#search = {
		term: "",
		pages: [] as (YTMusic.Search | Awaited<ReturnType<YTMusic.Search["getContinuation"]>>)[],
	};
	async *handleSearchSongs(
		term: string,
		offset: number,
		options?: { signal: AbortSignal },
	): AsyncGenerator<SongPreview<YouTubeSong>> {
		let contents;
		if (this.#search.term === term && offset !== 0) {
			const lastPage = this.#search.pages.at(-1);
			if (lastPage?.has_continuation) {
				const continuation = await lastPage.getContinuation();
				this.#search.pages.push(continuation);
				contents = continuation.contents?.contents?.filter((node) =>
					node.is(YTNodes.MusicResponsiveListItem),
				);
			}
		} else {
			const results = await this.innertube!.music.search(term, { type: "song" });
			this.#search = { term, pages: [results] };
			contents = results.contents
				?.filter((node) => node.is(YTNodes.MusicShelf))
				?.flatMap((shelf) => shelf.contents);
		}

		if (!contents) return;

		for (const result of contents) {
			if (options?.signal?.aborted) {
				return;
			}

			if (!result.id) continue;
			yield youtubeSongSearchResult(result);
		}
	}

	async handleGetSongFromPreview(searchResult: SongPreview<YouTubeSong>): Promise<YouTubeSong> {
		if (!this.innertube) {
			throw new Error(
				"Tried to call handleGetSongFromPreview() while YouTubeMusicService is not initialized",
			);
		}

		const cached = this.getCached<YouTubeSong>(searchResult.id);
		if (cached) return cached;

		const info = await this.innertube.music.getInfo(searchResult.id);
		const song = this.cache(await youtubeSong(info, searchResult));
		return song;
	}

	async handleSearchHints(term: string): Promise<string[]> {
		const sections = await this.innertube!.music.getSearchSuggestions(term);
		const hints: string[] = [];
		for (const section of sections) {
			for (const suggestion of section.contents) {
				if (!suggestion.is(YTNodes.SearchSuggestion)) continue;
				hints.push(suggestion.suggestion.toString());
			}
		}
		return hints;
	}

	async handleGetSongsAlbum(song: YouTubeSong, cache = true): Promise<Maybe<Album>> {
		if (!song.data.albumId) {
			console.warn("Failed to retrieve album, song has no albumId:", song);
			return;
		}
		return await this.handleGetAlbum(song.data.albumId, cache);
	}

	async handleGetAlbum(id: string, cache = true): Promise<Maybe<Album>> {
		if (cache) {
			const cachedAlbum = this.getCached<Album>(id);
			if (cachedAlbum) return cachedAlbum;
		}

		const album = await this.innertube!.music.getAlbum(id);
		return this.cache(await youtubeAlbum(id, album));
	}

	async handleGetPlaylist(idOrUrl: URL): Promise<Maybe<Playlist>> {
		const youtubeId = idOrUrl.searchParams.get("list");
		if (!youtubeId) {
			return;
		}

		let playlist = await this.innertube!.music.getPlaylist(youtubeId);
		if (!playlist.contents) {
			return;
		}

		const id = generateUUID();
		const header = playlist.header?.as(YTNodes.MusicResponsiveHeader);
		const title = header?.title?.toString() ?? "Unknown title";
		const thumbnail = header?.thumbnail?.contents?.[0];

		let artwork: Maybe<LocalImage>;
		if (thumbnail) {
			const localImages = useLocalImages();
			const artworkBlob = await (await fetch(thumbnail.url)).blob();
			await localImages.associateImage(id, artworkBlob, {
				maxWidth: 512,
				maxHeight: 512,
			});
			artwork = { id };
		}

		const songs = [];
		while (playlist?.contents) {
			for (const node of playlist.contents) {
				if (!node.is(YTNodes.MusicResponsiveListItem)) continue;
				const searchResult = youtubeSongSearchResult(node);
				const song = await this.getSongFromPreview(searchResult);
				songs.push(song);
			}

			if (!playlist.has_continuation) break;
			playlist = await playlist.getContinuation();
		}

		return {
			id,
			importInfo: {
				id: youtubeId,
				type: "youtube",
			},
			title,
			artwork,
			songs,
		};
	}

	handleLibrarySongs(_offset: number): YouTubeSong[] {
		// TODO: Implement local version of it
		return [];
	}

	async handleRefreshLibrarySongs(): Promise<void> {
		// TODO: Unimplemented
	}

	async handleGetSong(songId: string, cache = true): Promise<YouTubeSong> {
		if (cache) {
			const cachedSong = this.getCached<YouTubeSong>(songId);
			if (cachedSong) return cachedSong;
		}

		const trackInfo = await this.innertube!.music.getInfo(songId);
		return this.cache(await youtubeSong(trackInfo));
	}

	async handleRefreshSong(song: YouTubeSong): Promise<YouTubeSong> {
		return await this.handleGetSong(song.id, false);
	}

	async handlePlay(): Promise<void> {
		const { innertube, song, audio } = this;

		// NOTE: WEB_EMBEDDED seems to not block audio only files
		const trackInfo = await innertube!.getInfo(song!.id, "WEB_EMBEDDED");

		const addAudioSource = (url: string, mimeType: string): void => {
			const source = document.createElement("source");
			source.src = url;
			source.type = mimeType;
			audio!.appendChild(source);
		};

		const streamingData = trackInfo.streaming_data;
		const formats = [streamingData?.adaptive_formats ?? [], streamingData?.formats ?? []];
		const potentialFormats = [];
		for (const potentialFormat of formats.flat()) {
			if (!potentialFormat.has_audio) continue;
			if (audio!.canPlayType(potentialFormat.mime_type) !== "probably") continue;

			potentialFormats.push(potentialFormat);
		}

		potentialFormats.sort((a, b) => {
			// NOTE: When minimizing the app Android WebView pauses the audio when it contains video!
			//       So we only use it as a fallback in case other formats fail.
			//		 And its also a good idea to just ship audio when possible anyways 🤷‍♂️
			const defaultComparison = Number(a.has_video) - Number(b.has_video) || b.bitrate - a.bitrate;

			// NOTE: iOS cannot properly play and data from adaptive formats.
			//       For now we prefer static formats, even if they also contain video or have worse audio quality
			//       For adaptive formats – we prefer anything thats not opus, as its support on iOS is catastrophic
			// TODO: Check if there is a way to get just audio...
			if (getPlatform() === "ios") {
				const aIsOpus = a.mime_type.includes("opus");
				const bIsOpus = b.mime_type.includes("opus");
				if (aIsOpus && !bIsOpus) {
					return 1;
				} else if (bIsOpus && !aIsOpus) {
					return -1;
				}

				return Number(a.average_bitrate ?? 0) - Number(b.average_bitrate ?? 0) || defaultComparison;
			}

			return defaultComparison;
		});

		console.log(potentialFormats);

		const urlToFormats: Record<string, unknown> = {};
		for (const format of potentialFormats) {
			const url = format.decipher(innertube!.session.player);
			addAudioSource(url, format.mime_type);
			urlToFormats[url] = format;
		}

		try {
			await audio!.play();
		} catch (error) {
			// Someone skipped or stopped the song while it was still trying to play it, let it slide
			if (error instanceof Error && error.name === "AbortError") {
				return;
			}
			throw error;
		}

		this.log("Playing format:", urlToFormats[audio!.currentSrc]);
	}

	async handleResume(): Promise<void> {
		await this.audio?.play();
	}

	handlePause(): void {
		this.audio?.pause();
	}

	handleStop(): void {
		if (this.audio) {
			this.audio.pause();
			this.audio.innerHTML = "";
			this.audio.srcObject = null;
			this.audio.load();
		}
	}

	handleSeekToTime(timeInSeconds: number): void {
		this.audio!.currentTime = timeInSeconds;
	}

	handleSetVolume(volume: number): void {
		this.audio!.volume = volume;
	}
}
