import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
	appId: "com.musicplayer.app",
	appName: "music-player",
	webDir: "dist/web",

	// There is no way to just exclude plugins for some platforms so we have to do this:
	includePlugins: [
		"@capacitor/app",
		"@capacitor/filesystem",
		"@capacitor/haptics",
		"@capacitor/keyboard",
		"@capacitor/preferences",
		"@capacitor/status-bar",
	],
	android: {
		includePlugins: [
			"@capacitor/app",
			"@capacitor/filesystem",
			"@capacitor/haptics",
			"@capacitor/keyboard",
			"@capacitor/preferences",
			"@capacitor/status-bar",
			"capacitor-music-controls-plugin",
		],
	},
};

export default config;
