import { WebPlugin } from "@capacitor/core";
import type { MusicKitAuthorizationPlugin } from "../MusicKitAuthorization";

// Web implementation of WebKitAuthorization
export class MusicKitAuthorization extends WebPlugin implements MusicKitAuthorizationPlugin {
	async authorize(): Promise<{ developerToken: string; musicUserToken: string }> {
		const authorizeMusicKit = async () => {
			const music = await MusicKit.configure({
				developerToken: import.meta.env.VITE_DEVELOPER_TOKEN,
				app: {
					name: import.meta.env.VITE_APP_NAME,
					build: import.meta.env.VITE_APP_VERSION,
				},
			});

			await music.authorize();
			if (!music.isAuthorized) {
				throw new Error("Could not authorize MusicKit");
			}

			return {
				developerToken: music.developerToken,
				musicUserToken: music.musicUserToken!,
			};
		};

		if (globalThis.MusicKit) {
			return await authorizeMusicKit();
		}

		return await new Promise((resolve) => {
			document.addEventListener("musickitloaded", async () => {
				resolve(await authorizeMusicKit());
			});
		});
	}
}
