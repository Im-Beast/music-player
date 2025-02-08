import { app, components, BrowserWindow, ipcMain } from "electron";
import electronServe from "electron-serve";

import { fileURLToPath } from "node:url";
import { join } from "node:path";
import fs from "node:fs/promises";

import { authorizeMusicKit } from "./musickit/auth";

const urlScheme = "music-player";
const loadUrl = electronServe({
	directory: fileURLToPath(new URL("../renderer/", import.meta.url)),
	scheme: urlScheme,
});

let mainWindow;
async function createWindow() {
	mainWindow = new BrowserWindow({
		width: 800,
		height: 650,
		minHeight: 650,
		minWidth: 200,
		webPreferences: {
			preload: fileURLToPath(new URL("../preload/preload.cjs", import.meta.url)),
			nodeIntegration: false,
			contextIsolation: true,
			// Disable CORS
			webSecurity: false,
		},
	});

	const { session } = mainWindow.webContents;

	session.webRequest.onHeadersReceived((details, callback) => {
		const CSP = `
		default-src 'self' blob: data: 'unsafe-inline' 'unsafe-eval' https://*.apple.com https://*.youtube.com https://*.googlevideo.com https://*.googleapis.com;
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

app.whenReady().then(async () => {
	await components.whenReady();
	await createWindow();

	ipcMain.handle("musickit:authorize", () => authorizeMusicKit());

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

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
