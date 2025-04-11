import { useIDBKeyval } from "@vueuse/integrations/useIDBKeyval.mjs";
import { defineStore } from "pinia";
import { toRaw } from "vue";

import { Song, SongType } from "@/services/Music/objects";
import { Maybe } from "@/utils/types";

export type MetadataOverride = Omit<Song, "id" | "type" | "kind" | "data" | "available">;

export const useSongMetadata = defineStore("SongMetadata", () => {
	const overrides = useIDBKeyval<Record<string, Maybe<MetadataOverride>>>("metadataOverrides", {});

	function getSongMetadata(id: string): Maybe<MetadataOverride> {
		return overrides.data.value[id];
	}

	function setMetadata(id: string, metadata?: MetadataOverride): void {
		overrides.data.value[id] = toRaw(metadata);
	}

	function applyMetadata<Type extends SongType>(
		song: Song<Type>,
		metadata = getSongMetadata(song.id),
	): Song<Type> {
		return Object.assign(song, metadata satisfies Maybe<Partial<Song>>);
	}

	return {
		getSongMetadata,
		setMetadata,
		applyMetadata,
	};
});
