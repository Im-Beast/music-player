import BG, { buildURL, WebPoSignalOutput } from "bgutils-js";
import Innertube, { YTMusic, YTNodes } from "youtubei.js/web";

import { MusicPlayerService, SongSearchResult } from "@/services/MusicPlayer/MusicPlayerService";
import type { Playlist, SongImage, YouTubeSong } from "@/stores/music-player";

import { useLocalImages } from "@/stores/local-images";
import { generateUUID } from "@/utils/crypto";
import { getPlatform, isElectron } from "@/utils/os";
import { generateSongStyle } from "@/utils/songs";
import { Maybe } from "@/utils/types";

export function youtubeSongSearchResult(
	node: YTNodes.MusicResponsiveListItem,
): SongSearchResult<YouTubeSong> {
	const artwork = node.thumbnails?.[0] && { url: node.thumbnails[0].url };
	const artists = (node.artists ?? node.authors)?.map(({ name }) => name) ?? [];

	return {
		type: "youtube",
		id: node.id!,
		title: node.title,
		album: node.album?.name,
		artists,
		artwork,
	};
}

export async function youtubeSong(
	item: YTMusic.TrackInfo,
	searchResult?: SongSearchResult<YouTubeSong>,
): Promise<YouTubeSong> {
	const { id, title, author, duration, thumbnail, tags } = item.basic_info;

	if (!id) {
		throw new Error("Cannot generate YouTubeSong from item that doesn't have id");
	}

	const artwork = thumbnail?.[0] && { url: createCapacitorProxyUrl(thumbnail[0].url) };
	const album = searchResult?.album ?? tags?.at(-2);
	const artists = searchResult?.artists ?? (author ? [author] : []);

	return {
		type: "youtube",

		id,
		artists,
		// TODO: genre
		genres: [],

		title,
		album,
		duration,

		artwork,
		style: await generateSongStyle(artwork),

		data: {},
	};
}

const USER_AGENT =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.1";
const GOOG_API_KEY = "AIzaSyDyT5W0Jh49F30Pqqtyfdf7pDLFKLJoAnw";
const REQUEST_KEY = "O43z0dpjhgX20SCx4KAo";

const SERVER_URL = "WEBVIEW_SERVER_URL" in window ? (window.WEBVIEW_SERVER_URL as string) : "";

/**
 * Create a proxied url which uses native layer to bypass CORS
 * @see https://github.com/ionic-team/capacitor/blob/90f95d1a829f3d87cb46af827b5bfaac319a9694/core/native-bridge.ts#L134
 */
function createCapacitorProxyUrl(url: string): string {
	if (!SERVER_URL) return url;
	const bridgeUrl = new URL(SERVER_URL);
	bridgeUrl.pathname = "/_capacitor_http_interceptor_";
	bridgeUrl.searchParams.append("u", url);
	return bridgeUrl.toString();
}

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

export class YouTubeMusicPlayerService extends MusicPlayerService<YouTubeSong> {
	logName = "YouTubeMusicPlayerService";
	logColor = "#ff0000";
	type = "youtube" as const;
	available = getPlatform() !== "web";

	innertube?: Innertube;
	audio?: HTMLAudioElement;

	async handleInitialization(): Promise<void> {
		const audio = new Audio();
		document.body.appendChild(audio);
		audio.addEventListener("timeupdate", () => {
			this.store.time = audio.currentTime;
		});
		audio.addEventListener("playing", () => {
			this.store.addMusicSessionActionHandlers();
		});
		audio.addEventListener("ended", () => {
			this.store.skipNext();
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

	async handleSearchSongs(term: string, _offset: number): Promise<SongSearchResult<YouTubeSong>[]> {
		// TODO: Handle continuation
		const results = await this.innertube!.music.search(term, { type: "song" });
		if (!results.contents) return [];

		const songs: SongSearchResult<YouTubeSong>[] = [];
		for (const result of results.contents) {
			if (!result.is(YTNodes.MusicShelf)) continue;

			for (const item of result.contents) {
				if (!item.id) continue;
				songs.push(youtubeSongSearchResult(item));
			}
		}
		return songs;
	}

	async handleGetSongFromSearchResult(
		searchResult: SongSearchResult<YouTubeSong>,
	): Promise<YouTubeSong> {
		if (!this.innertube) {
			throw new Error(
				"Tried to call handleGetSongFromSearchResult() while YouTubeMusicPlayerService is not initialized",
			);
		}

		const info = await this.innertube.music.getInfo(searchResult.id);
		const song = await youtubeSong(info, searchResult);
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

		let artwork: Maybe<SongImage>;
		if (thumbnail) {
			const localImages = useLocalImages();
			const artworkBlob = await (await fetch(thumbnail.url)).blob();
			await localImages.localImageManagementService.associateImage(id, artworkBlob);
			artwork = { id };
		}

		const songs = [];
		while (playlist?.contents) {
			for (const node of playlist.contents) {
				if (!node.is(YTNodes.MusicResponsiveListItem)) continue;
				const searchResult = youtubeSongSearchResult(node);
				const song = await this.getSongFromSearchResult(searchResult);
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

	async handleRefreshSong(song: YouTubeSong): Promise<YouTubeSong> {
		const trackInfo = await this.innertube!.music.getInfo(song.id);
		return youtubeSong(trackInfo);
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
