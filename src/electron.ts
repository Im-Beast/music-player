/**
 * This module gets ran on the initialization on Electron
 * @module
 */
/* eslint-disable no-var */

declare global {
	var __IS_ELECTRON__: boolean;

	interface $ElectronMusicPlayer {
		// musickit:
		authorizeMusicKit: () => Promise<string | undefined>;

		// musicplayer:
		fetch: (
			input: string,
			init: unknown,
		) => Promise<{
			url: string;
			status: number;
			statusText: string;
			body: Uint8Array;
			headers: Record<string, string>;
		}>;
		getMusicPath: () => Promise<string>;
		readFile: (path: string) => Promise<Uint8Array>;
		traverseDirectory: (path: string) => Promise<string[]>;
	}
	var $ElectronMusicPlayer: $ElectronMusicPlayer | undefined;

	interface ElectronMusicPlayer extends $ElectronMusicPlayer {
		fetchShim: typeof globalThis.fetch;
	}
	var ElectronMusicPlayer: ElectronMusicPlayer | undefined;
}

globalThis.ElectronMusicPlayer = {
	...$ElectronMusicPlayer!,
	/**
	 * Fetch with Electron-sided implementation to work-around CORS without disabling Web Security
	 */
	async fetchShim(input, init): Promise<globalThis.Response> {
		let url: string;
		let options: RequestInit | undefined;

		const headers: Record<string, string> = {};
		if (input instanceof Request) {
			Object.assign(headers, Object.fromEntries(input.headers.entries()));
		}
		if (init?.headers instanceof Headers) {
			for (const [key, value] of init.headers.entries()) {
				headers[key] = value;
			}
		}

		if (input instanceof Request) {
			url = input.url;

			options = {
				body: await input.text(),
				cache: input.cache,
				credentials: input.credentials,
				integrity: input.integrity,
				keepalive: input.keepalive,
				method: input.method,
				mode: input.mode,
				redirect: input.redirect,
				referrer: input.referrer,
				referrerPolicy: input.referrerPolicy,
				...init,
				headers,
			};
		} else {
			url = typeof input === "string" ? input : input.toString();
			options = { ...init, headers };
		}

		const nativeResponse = await ElectronMusicPlayer!.fetch(url, options);

		return new Response(nativeResponse.body, {
			status: nativeResponse.status,
			statusText: nativeResponse.statusText,
			headers: nativeResponse.headers,
		});
	},
};

/** Prevent object from being overwritten */
Object.defineProperty(globalThis, "ElectronMusicPlayer", {
	writable: false,
	configurable: false,
	enumerable: false,
	value: Object.freeze(globalThis.ElectronMusicPlayer),
});

export {};
