import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

import path from "path";
import capacitorConfig from "./capacitor.config";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [vue()],
	build: { outDir: capacitorConfig.webDir },
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
