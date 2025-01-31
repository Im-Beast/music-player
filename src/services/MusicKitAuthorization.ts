import { Preferences } from "@capacitor/preferences";

import { Service } from "./Service";
import MusicKitAuthorizationPlugin from "@/plugins/MusicKitAuthorization";

interface MusicKitPreferences {
	developerToken: string;
	musicUserToken?: string;
}

/**
 * Service which streamlines the MusicKit authorization
 */
export class MusicKitAuthorizationService extends Service {
	logName = "MusicKitAuthorizationService";
	logColor = "#ff7080";

	constructor() {
		super();
	}

	addEventListener(
		type: "authorized" | "unauthorized",
		callback: EventListenerOrEventListenerObject | null,
		options?: AddEventListenerOptions | boolean,
	): void {
		super.addEventListener(type, callback, options);
	}

	/** Tries to authorize the user without any user interaction */
	async passivelyAuthorize(): Promise<MusicKit.MusicKitInstance | undefined> {
		this.log("Trying to authorize passively");

		if (!globalThis.MusicKit) {
			document.addEventListener("musickitloaded", () => this.passivelyAuthorize(), { once: true });
			return;
		}

		const music = MusicKit.getInstance();
		if (music?.isAuthorized) {
			this.log("Already authorized");
			this.#dispatchAuthorizationEvent(music);
			return music;
		}

		const remembered = (await Preferences.get({ key: "MusicKit" })).value;
		if (remembered) {
			const { developerToken, musicUserToken } = JSON.parse(remembered);
			this.log("Restoring session");
			const music = await this.#initialize(developerToken, musicUserToken);
			this.#dispatchAuthorizationEvent(music);
			return music;
		}
	}

	/** Authorize the user to MusicKit */
	async authorize(): Promise<MusicKit.MusicKitInstance> {
		this.log("Trying to authorize");

		let music = await this.passivelyAuthorize();
		if (music) return music;

		const { developerToken, musicUserToken } = await MusicKitAuthorizationPlugin.authorize();
		music = await this.#initialize(developerToken, musicUserToken);

		if (music.isAuthorized) {
			this.log("Saving session");
			await this.#remember(music);
		}
		await this.#dispatchAuthorizationEvent(music);

		return music;
	}

	/** Unauthorize MusicKit instance and forget stored tokens */
	async unauthorize(): Promise<void> {
		this.log("Unauthorizing session");

		const music = await MusicKit.getInstance();
		if (music) await music.unauthorize();
		await this.#forget();

		await this.#dispatchAuthorizationEvent(music);
	}

	/** Dispatches "authorized" or "unauthorized" event depending on the music.isAuthorized */
	#dispatchAuthorizationEvent(music?: MusicKit.MusicKitInstance): void {
		this.dispatchEvent(new Event(music?.isAuthorized ? "authorized" : "unauthorized"));
	}

	/** Configure MusicKit given the tokens */
	async #initialize(
		developerToken: string,
		musicUserToken: string,
	): Promise<MusicKit.MusicKitInstance> {
		const music = await MusicKit.configure({
			developerToken: developerToken || import.meta.env.VITE_DEVELOPER_TOKEN,
			app: {
				name: import.meta.env.VITE_APP_NAME,
				build: import.meta.env.VITE_APP_VERSION,
			},
		});
		music.musicUserToken = musicUserToken;
		return music;
	}

	/** Remove saved MusicKit tokens */
	async #forget(): Promise<void> {
		await Preferences.remove({ key: "MusicKit" });
	}

	/** Save MusicKit tokens */
	async #remember({ developerToken, musicUserToken }: MusicKitPreferences): Promise<void> {
		await Preferences.set({
			key: "MusicKit",
			value: JSON.stringify({
				developerToken,
				musicUserToken,
			}),
		});
	}
}
