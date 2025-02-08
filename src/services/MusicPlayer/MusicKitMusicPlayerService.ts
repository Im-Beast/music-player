import { useMusicKit } from "@/stores/musickit";
import { MusicPlayerService } from "@/services/MusicPlayer/MusicPlayerService";
import { MusicKitSong } from "@/stores/music-player";
import { generateSongStyle } from "@/utils/songs";

export async function musicKitSong(
	song: MusicKit.Songs | MusicKit.LibrarySongs,
): Promise<MusicKitSong> {
	const attributes = song.attributes;
	const artworkUrl = attributes?.artwork;
	const artwork = artworkUrl && { url: MusicKit.formatArtworkURL(artworkUrl, 256, 256) };
	return {
		type: "musickit",

		id: song.id,
		title: attributes?.name,
		artist: attributes?.artistName,
		album: attributes?.albumName,
		duration: attributes?.durationInMillis && attributes?.durationInMillis / 1000,
		genre: attributes?.genreNames?.[0],

		artwork,
		style: await generateSongStyle(artwork),

		data: {},
	};
}

export function musicKitSongIdType(song: MusicKitSong): "library" | "catalog" {
	if (!isNaN(Number(song.id))) {
		return "catalog";
	}
	return "library";
}

export class MusicKitMusicPlayerService extends MusicPlayerService<MusicKitSong> {
	logName = "MusicKitMusicPlayerService";
	logColor = "#cc80dd";
	music!: MusicKit.MusicKitInstance;

	constructor() {
		super();
	}

	async handleSearchHints(term: string): Promise<string[]> {
		if (!term) return [];

		const response = await this.music.api.music<{ results: { terms: string[] } }>(
			"/v1/catalog/{{storefrontId}}/search/hints",
			{ term },
		);

		const { terms } = response.data.results;
		return terms;
	}

	async handleSearchSongs(term: string, offset: number): Promise<MusicKitSong[]> {
		const response = await this.music.api.music<MusicKit.SearchResponse, MusicKit.CatalogSearchQuery>(
			"/v1/catalog/{{storefrontId}}/search",
			{
				term,
				types: ["songs"],
				limit: 25,
				offset,
			},
		);

		const songs = response?.data?.results?.songs?.data;
		if (songs) {
			const promises = songs.map((song) => musicKitSong(song));
			return await Promise.all(promises);
		}
		return [];
	}

	async handleRefreshLibrarySongs(): Promise<void> {
		// TODO: Unimplemented
	}

	async handleRefreshSong(song: MusicKitSong): Promise<MusicKitSong> {
		const idType = musicKitSongIdType(song);

		const response = await this.music.api.music<
			MusicKit.SongsResponse | MusicKit.LibrarySongsResponse
		>(
			idType === "catalog"
				? `/v1/catalog/{{storefrontId}}/songs/${song.id}`
				: `/v1/me/library/songs/${song.id}`,
		);

		const [refreshed] = response.data.data;
		if (!refreshed) {
			throw new Error(`Failed to find a song with id: ${song.id}`);
		}

		return musicKitSong(refreshed);
	}

	async handleLibrarySongs(offset: number): Promise<MusicKitSong[]> {
		const response = await this.music.api.music<
			MusicKit.LibrarySongsResponse,
			MusicKit.LibrarySongsQuery
		>("/v1/me/library/songs", { limit: 25, offset });

		const songs = response.data.data.filter((song) => {
			// Filter out songs that cannot be played
			return !!song.attributes?.playParams;
		});
		const promises = songs.map((song) => musicKitSong(song));
		return await Promise.all(promises);
	}

	#timeUpdateCallback = () => {
		this.store.time = this.music!.currentPlaybackTime;
	};

	async handleInitialization(): Promise<void> {
		const music = await useMusicKit().music;

		music.repeatMode = MusicKit.PlayerRepeatMode.none;
		music.addEventListener("playbackTimeDidChange", this.#timeUpdateCallback);
		music.addEventListener("mediaCanPlay", () => this.store.addMusicSessionActionHandlers(), {
			once: true,
		});

		this.music = music;
	}

	async handleDeinitialization(): Promise<void> {
		this.music.removeEventListener("playbackTimeDidChange", this.#timeUpdateCallback);
	}

	async handlePlay(): Promise<void> {
		const { music } = this;

		await music.setQueue({ song: this.song!.id });
		await music.play();
	}

	async handleResume(): Promise<void> {
		await this.music.play();
	}

	async handlePause(): Promise<void> {
		await this.music.pause();
	}

	async handleStop(): Promise<void> {
		await this.music.stop();
	}

	async handleSeekToTime(timeInSeconds: number): Promise<void> {
		await this.music.seekToTime(timeInSeconds);
	}

	handleSetVolume(volume: number): void {
		this.music.volume = volume;
	}
}
