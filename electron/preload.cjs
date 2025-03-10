import { contextBridge, ipcRenderer } from "electron/renderer";

contextBridge.exposeInMainWorld("$ElectronMusicPlayer", {
	authorizeMusicKit: () => ipcRenderer.invoke("musickit:authorize"),

	fetch: (input, init) => ipcRenderer.invoke("musicplayer:fetch", input, init),
	getMusicPath: () => ipcRenderer.invoke("musicplayer:path"),
	readFile: (path) => ipcRenderer.invoke("musicplayer:read_file", path),
	traverseDirectory: (path) => ipcRenderer.invoke("musicplayer:traverse_dir", path),
});
