import { LocalImageManagementService } from "@/services/LocalImageManagement";
import { SongImage } from "@/stores/music-player";
import { defineStore } from "pinia";

export const useLocalImages = defineStore("LocalImages", () => {
	const localImageManagementService = new LocalImageManagementService();

	async function getSongImageUrl(image?: SongImage): Promise<string | undefined> {
		if (!image) return;
		if ("id" in image) return await localImageManagementService.getBlobUrl(image.id!);
		return image.url;
	}

	return {
		localImageManagementService,
		getSongImageUrl,
	};
});
