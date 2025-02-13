import { defineStore } from "pinia";
import { ref } from "vue";

import { useMusicPlayer } from "@/stores/music-player";

import { MusicKitAuthorizationService } from "@/services/Authorization/MusicKitAuthorizationService";
import { MusicKitMusicPlayerService } from "@/services/MusicPlayer/MusicKitMusicPlayerService";

export const useMusicKit = defineStore("MusicKit", () => {
	const musicPlayer = useMusicPlayer();

	const { promise: musicPromise, resolve: resolveMusicPromise } =
		Promise.withResolvers<MusicKit.MusicKitInstance>();
	const authorized = ref(false);

	const authService = new MusicKitAuthorizationService();
	authService.addEventListener("authorized", () => {
		musicPlayer.addMusicPlayerService("musickit", new MusicKitMusicPlayerService());
		resolveMusicPromise(MusicKit.getInstance()!);
		authorized.value = true;
	});
	authService.addEventListener("unauthorized", () => {
		musicPlayer.removeMusicPlayerService("musickit");
		authorized.value = false;
	});
	void authService.passivelyAuthorize();

	async function withMusic<T>(callback: (music: MusicKit.MusicKitInstance) => T): Promise<T> {
		const music = await musicPromise;
		return callback(music);
	}

	return {
		music: musicPromise,
		withMusic,

		authorized,
		authService,
	};
});
