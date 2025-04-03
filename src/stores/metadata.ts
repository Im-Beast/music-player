import { useIDBKeyval } from "@vueuse/integrations/useIDBKeyval.mjs";
import { defineStore } from "pinia";
import { toRaw } from "vue";

import { AnySong, Song } from "@/stores/music-player";

import { Maybe } from "@/utils/types";

type MetadataOverride = {
	[key in Exclude<keyof AnySong, "id" | "type">]?: AnySong[key];
};

export const useSongMetadata = defineStore("SongMetadata", () => {
	const overrides = useIDBKeyval<Record<string, Maybe<MetadataOverride>>>("metadataOverrides", {});

	function getSongMetadata(id: string): Maybe<MetadataOverride> {
		return overrides.data.value[id];
	}

	function setMetadata(id: string, metadata?: MetadataOverride): void {
		overrides.data.value[id] = toRaw(metadata);
	}

	function applyMetadata<T extends Song<string> = AnySong>(
		song: T,
		metadata = getSongMetadata(song.id),
	): T {
		return Object.assign(song, metadata satisfies Maybe<Partial<AnySong>>);
	}

	return {
		getSongMetadata,
		setMetadata,
		applyMetadata,
	};
});
