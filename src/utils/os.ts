import { Capacitor } from "@capacitor/core";

export type Platform = "ios" | "android" | "electron" | "web";
export function getPlatform(): Platform {
	switch (Capacitor.getPlatform()) {
		case "ios":
			return "ios";
		case "android":
			return "android";
		case "web":
			if (navigator.userAgent.toLowerCase().includes("electron")) {
				return "electron";
			}
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
