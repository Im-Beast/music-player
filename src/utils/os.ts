import { Capacitor } from "@capacitor/core";

export type Platform = "ios" | "android" | "electron" | "web";
export function getPlatform(): Platform {
	if (__IS_ELECTRON__) {
		return "electron";
	}

	switch (Capacitor.getPlatform()) {
		case "ios":
			return "ios";
		case "android":
			return "android";
		case "web":
			return "web";
		default:
			throw new Error(`Unknown platform: ${Capacitor.getPlatform()}`);
	}
}

export function isMobilePlatform(): boolean {
	switch (getPlatform()) {
		case "android":
		case "ios":
			return true;
		default:
			return false;
	}
}

export function isElectron(): boolean {
	return __IS_ELECTRON__;
}
