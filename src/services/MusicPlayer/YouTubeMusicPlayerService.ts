import BG, { buildURL, WebPoSignalOutput } from "bgutils-js";
import Innertube, { UniversalCache, YTMusic, YTNodes, Types as YTTypes } from "youtubei.js/web";

import { MusicPlayerService, SongSearchResult } from "@/services/MusicPlayer/MusicPlayerService";
import type { YouTubeSong } from "@/stores/music-player";

import { getPlatform, isElectron } from "@/utils/os";
import { generateSongStyle } from "@/utils/songs";

export function youtubeSongSearchResult(
	node: YTNodes.MusicResponsiveListItem,
): SongSearchResult<YouTubeSong> {
	const artwork = node.thumbnails?.[0] && { url: createCapacitorProxyUrl(node.thumbnails[0].url) };

	return {
		type: "youtube",
		id: node.id!,
		title: node.title,
		album: node.album?.name,
		artist: node.artists?.[0]?.name,
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

	return {
		type: "youtube",

		id,
		title,
		artist: author,
		duration,
		album,
		// TODO: genre

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

	innertube?: Innertube;
	audio!: HTMLAudioElement;

	#initialized = false;
	async handleInitialization(): Promise<void> {
		if (this.#initialized) return;
		this.#initialized = true;

		// youtube.js seems to be destructurizing fetch somewhere, which causes
		// "Illegal Invocation error", so we just provide our own
		// TODO: Proxy for web support
		const fetch = isElectron() ? ElectronMusicPlayer!.fetchShim : window.fetch.bind(window);

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
			generate_session_locally: true,
			cache: new UniversalCache(true),
			user_agent: USER_AGENT,
			fetch,
		});

		this.innertube = innertube;

		const audio = new Audio();
		audio.addEventListener("timeupdate", () => {
			this.store.time = audio.currentTime;
		});
		audio.addEventListener("playing", () => {
			this.store.addMusicSessionActionHandlers();
		});
		this.audio = audio;
	}

	handleDeinitialization(): void {
		this.audio.remove();
		this.audio = undefined!;
		this.audio = new Audio();
	}

	async handleSearchSongs(term: string, _offset: number): Promise<SongSearchResult<YouTubeSong>[]> {
		// TODO: Handle continuation
		const innertube = this.innertube!;

		const results = await innertube.music.search(term, { type: "song" });
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
				if (suggestion.is(YTNodes.SearchSuggestion)) {
					hints.push(suggestion.suggestion.toString());
				}
			}
		}
		return hints;
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
		const innertube = this.innertube!;
		const song = this.song!;

		const trackInfo = await innertube.getInfo(song.id);
		const audioFormat: YTTypes.FormatOptions = { type: "audio", quality: "best" };

		let format: ReturnType<typeof trackInfo.chooseFormat> | undefined;
		// iOS cannot properly read duration data from adaptive formats (its often 2x the proper value)
		if (getPlatform() === "ios") {
			for (const potentialFormat of trackInfo.streaming_data!.formats) {
				if (!potentialFormat.has_audio) continue;

				if (!format) {
					format = potentialFormat;
					continue;
				}

				if (format.bitrate < potentialFormat.bitrate) {
					format = format;
				}
			}
		}
		format ??= trackInfo.chooseFormat(audioFormat);

		const url = format.decipher(innertube.session.player);

		const { audio } = this;
		audio.src = url;
		await audio.play();
	}

	async handleResume(): Promise<void> {
		await this.audio.play();
	}

	handlePause(): void {
		this.audio.pause();
	}

	handleStop(): void {
		this.audio.pause();
	}

	handleSeekToTime(timeInSeconds: number): void {
		this.audio.currentTime = timeInSeconds;
	}

	handleSetVolume(volume: number): void {
		this.audio.volume = volume;
	}
}
