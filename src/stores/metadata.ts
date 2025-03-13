import { defineStore } from "pinia";
import { reactive, Reactive, toRaw } from "vue";

import { AnySong, SongImage } from "@/stores/music-player";

import { useIDBKeyvalAsync } from "@/utils/vue";

export interface MetadataOverride {
	artists?: string[];
	album?: string;
	title?: string;
	duration?: number;
	artwork?: SongImage;
	genres?: string[];
}

interface MetadataOverrides {
	[id: string]: MetadataOverride | undefined;
}

export const useSongMetadata = defineStore("SongMetadata", () => {
	const metadataOverridesPromise = useIDBKeyvalAsync<MetadataOverrides>("metadataOverrides", {});

	function getReactiveMetadata(song: AnySong): Reactive<MetadataOverride> {
		const metadata = reactive<MetadataOverride>({});
		void metadataOverridesPromise.then((metadataOverrides) => {
			Object.assign(metadata, metadataOverrides.value[song.id]);
		});
		return metadata;
	}

	async function getMetadata(song: AnySong): Promise<MetadataOverride> {
		const metadataOverrides = await metadataOverridesPromise;
		const metadata = (metadataOverrides.value[song.id] ??= {});
		return toRaw(metadata);
	}

	async function setMetadata(song: AnySong, metadata: MetadataOverride): Promise<void> {
		const metadataOverrides = await metadataOverridesPromise;
		metadataOverrides.value[song.id] = toRaw(metadata);
	}

	async function assignMetadata(song: AnySong, metadata: MetadataOverride): Promise<void> {
		const metadataOverrides = await metadataOverridesPromise;
		const metadataOverride = (metadataOverrides.value[song.id] ??= {});
		Object.assign(metadataOverride, toRaw(metadata));
	}

	async function resetMetadata(song: AnySong): Promise<void> {
		const metadataOverrides = await metadataOverridesPromise;
		delete metadataOverrides.value[song.id];
	}

	return {
		getReactiveMetadata,
		getMetadata,
		setMetadata,
		assignMetadata,
		resetMetadata,
	};
});
