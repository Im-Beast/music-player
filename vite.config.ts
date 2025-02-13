import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

import path from "path";
import capacitorConfig from "./capacitor.config";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [vue()],
	build: { outDir: capacitorConfig.webDir },
	define: {
		__IS_ELECTRON__: "false",
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
