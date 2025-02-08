import Innertube, { UniversalCache, YT, YTMusic, YTNodes } from "youtubei.js/web";
import BG, { BgConfig, buildURL, WebPoSignalOutput } from "bgutils-js";

import type { SongImage, YouTubeSong } from "@/stores/music-player";
import { generateSongStyle } from "@/utils/songs";
import { MusicPlayerService } from "@/services/MusicPlayer/MusicPlayerService";
import { isMobilePlatform } from "@/utils/os";
import { FormatOptions } from "youtubei.js/dist/src/types";

export async function youtubeSong(item: YTMusic.TrackInfo): Promise<YouTubeSong> {
	const { id, title, author, duration, thumbnail, tags } = item.basic_info;

	if (!id) {
		throw new Error("Cannot generate YouTubeSong from item that doesn't have id");
	}

	const artwork = thumbnail?.[0] && { url: createCapacitorProxyUrl(thumbnail[0].url) };
	// TODO: This is most likely not accurate for all songs
	const album = tags?.at(-2);

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

async function createWebPoMinter() {
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
	audio?: HTMLAudioElement;

	async handleInitialization(): Promise<void> {
		// youtube.js seems to be destructurizing fetch somewhere, which causes
		// "Illegal Invocation error", so we just provide our own
		// TODO: Proxy for web support
		// TODO: Expose a native fetch from electron rather than disable whole webSecurity
		const fetch = window.fetch.bind(window);

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
		const poToken = await minter.mintAsWebsafeString(visitorData!);

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

	async handleDeinitialization(): Promise<void> {
		await this.revokeObjectUrls();
		this.audio!.remove();
		this.audio = undefined;
	}

	async handleSearchSongs(term: string, offset: number): Promise<YouTubeSong[]> {
		// TODO: Handle continuation
		const innertube = this.innertube!;

		const results = await innertube.music.search(term, { type: "song" });
		if (!results.contents) return [];

		const songs: Promise<YouTubeSong>[] = [];
		for (const result of results.contents) {
			if (!result.is(YTNodes.MusicShelf)) continue;

			for (const item of result.contents) {
				if (!item.id) continue;
				// TODO: It would be a good idea for search to return partial information of songs
				//		 instead of parsing them fully here, which makes unnecessary requests
				const song = innertube.music.getInfo(item.id).then(youtubeSong);
				songs.push(song);
			}
		}
		return await Promise.all(songs);
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

	async handleLibrarySongs(offset: number): Promise<YouTubeSong[]> {
		// TODO: Handle continuation
		// TODO: Requires authorization
		const innertube = this.innertube!;

		const library = await innertube.music.getLibrary();
		if (!library.contents) return [];

		const songs: Promise<YouTubeSong>[] = [];
		for (const result of library.contents) {
			if (!result.is(YTNodes.MusicShelf)) continue;

			for (const item of result.contents) {
				if (!item.id) continue;
				const song = innertube.music.getInfo(item.id).then(youtubeSong);
				songs.push(song);
			}
		}
		return await Promise.all(songs);
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

		const trackInfo = await innertube.getInfo(this.song!.id);
		const audioFormat: FormatOptions = { type: "audio", quality: "best" };
		const format = trackInfo.chooseFormat(audioFormat);

		let url = format.decipher(innertube.session.player);
		if (isMobilePlatform()) {
			// TODO: Is there a way to stream not yet fully downloaded file?
			// On mobile download the whole file and then create a blob url
			// Otherwise some weird issues occur such as YouTube ratelimits and/or weird buffering
			const stream = await trackInfo.download(audioFormat);
			const blob = new Blob([await new Response(stream).arrayBuffer()], {
				type: format.mime_type,
			});
			url = URL.createObjectURL(blob);
			this.queueRevokeObjectUrl(url);
		}

		this.audio!.src = url;
		await this.audio!.play();
	}

	#objectUrls: string[] = [];
	queueRevokeObjectUrl(url: string): void {
		this.#objectUrls.push(url);
	}
	revokeObjectUrls(): void {
		let url: string | undefined;
		while ((url = this.#objectUrls.pop())) {
			URL.revokeObjectURL(url);
		}
	}

	async handleResume(): Promise<void> {
		await this.audio!.play();
	}

	async handlePause(): Promise<void> {
		await this.audio!.pause();
	}

	async handleStop(): Promise<void> {
		await this.audio!.pause();
		await this.revokeObjectUrls();
	}

	handleSeekToTime(timeInSeconds: number): void {
		this.audio!.currentTime = timeInSeconds;
	}

	handleSetVolume(volume: number): void {
		this.audio!.volume = volume;
	}
}
