import type { ElectronViteConfig } from "electron-vite";
import path from "path";
import vue from "@vitejs/plugin-vue";

export default {
	main: {
		build: {
			emptyOutDir: true,
			outDir: "./dist/electron/main",
			lib: {
				entry: "./electron/main.ts",
			},
		},
	},
	preload: {
		build: {
			emptyOutDir: false,
			outDir: "./dist/electron/preload",
			lib: {
				entry: "./electron/preload.cjs",
			},
			rollupOptions: {
				output: {
					format: "cjs",
				},
			},
		},
	},
	renderer: {
		plugins: [vue()],
		root: ".",
		build: {
			emptyOutDir: false,
			outDir: "./dist/electron/renderer",
			rollupOptions: {
				input: "./index.html",
			},
		},
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "./src"),
			},
		},
	},
} satisfies ElectronViteConfig;
