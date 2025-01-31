import { registerPlugin } from "@capacitor/core";

export interface LocalSongInfo {
	id: string;
	path: string;
}

export interface LocalMusicPlugin {
	readSong(data: { path: string }): Promise<{ data: string }>;
	getSongs(): Promise<{ songs: LocalSongInfo[] }>;
}

const LocalMusic = registerPlugin<LocalMusicPlugin>("LocalMusic", {});

export default LocalMusic;
