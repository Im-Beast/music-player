import { app, BrowserWindow, components, ipcMain } from "electron";
import electronServe from "electron-serve";

import { URLPattern } from "urlpattern-polyfill";

import fs from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { authorizeMusicKit } from "./musickit/auth";

const ALLOWED_URLS = [
	"https://*.apple.com",
	"https://youtube.com",
	"https://*.youtube.com",
	"https://*.googlevideo.com",
	"https://*.googleapis.com",
];
const ALLOWED_URL_PATTERNS = ALLOWED_URLS.map((url) => new URLPattern(url));

const urlScheme = "music-player";
const loadUrl = electronServe({
	directory: fileURLToPath(new URL("../renderer/", import.meta.url)),
	scheme: urlScheme,
});

let mainWindow;
async function createWindow(): Promise<void> {
	mainWindow = new BrowserWindow({
		width: 800,
		height: 650,
		minHeight: 650,
		minWidth: 200,
		webPreferences: {
			preload: fileURLToPath(new URL("../preload/preload.cjs", import.meta.url)),
			nodeIntegration: false,
			contextIsolation: true,
		},
	});

	const { session } = mainWindow.webContents;

	session.webRequest.onHeadersReceived((details, callback) => {
		const CSP = `
		default-src 'self' blob: data: 'unsafe-inline' 'unsafe-eval' ${ALLOWED_URLS.join(" ")};
		img-src 'self' blob: data: *;
		`;

		callback({
			responseHeaders: {
				...details.responseHeaders,
				"Content-Security-Policy": [CSP],
			},
		});
	});

	await loadUrl(mainWindow);
}

app.on("activate", async () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		await createWindow();
	}
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});

void app.whenReady().then(async () => {
	await components.whenReady();
	await createWindow();

	ipcMain.handle("musickit:authorize", () => authorizeMusicKit());

	ipcMain.handle("musicplayer:fetch", async (_, input, init) => {
		if (typeof input !== "string" || ALLOWED_URL_PATTERNS.every((pattern) => !pattern.test(input))) {
			return Promise.reject(`URL not allowed: ${input}`);
		}

		try {
			const response = await fetch(input, init);
			return {
				url: response.url,
				status: response.status,
				statusText: response.statusText,
				body: await response.bytes(),
				headers: Object.fromEntries(response.headers.entries()),
			};
		} catch (error) {
			return Promise.reject(error);
		}
	});
	ipcMain.handle("musicplayer:path", () => app.getPath("music"));
	ipcMain.handle("musicplayer:read_file", async (_, path: string): Promise<Uint8Array> => {
		return await fs.readFile(path);
	});
	ipcMain.handle("musicplayer:traverse_dir", async (_, path: string): Promise<string[]> => {
		const paths = [];
		for (const relativePath of await fs.readdir(path, { recursive: true })) {
			paths.push(join(path, relativePath));
		}
		return paths;
	});
});
