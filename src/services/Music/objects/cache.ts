import { useIDBKeyval } from "@vueuse/integrations/useIDBKeyval.mjs";

import { createKey, getKey, Identifiable, ItemKey, unpackKey } from "./shared";

import { Maybe } from "@/utils/types";
import { markRaw, toRaw } from "vue";
import { Album } from "./album";
import { Artist } from "./artist";
import { Song, SongPreview, SongType } from "./song";

// TODO: In the future it would be a good idea to use more organised cache storage
// 		 Since it is possible to categorise items by their id, type and kind
//       Which would make querying the data much more efficient
export const itemCache = useIDBKeyval<Record<ItemKey<any>, Identifiable>>("itemCache", {});

export function generateCacheMethod<const Type extends SongType>(type: Type) {
	interface ItemMap {
		album: Album<Type>;
		artist: Artist<Type>;
		song: Song<Type>;
		songPreview: SongPreview<Type, true>;
	}

	type ItemMapKey = keyof ItemMap;

	return <const Kind extends ItemMapKey>(
		kind: Kind & ItemMap[Kind]["kind"],
		id: ItemMap[Kind]["id"],
	): Maybe<ItemMap[Kind]> => getCached(type as ItemMap[Kind]["type"], id, kind);
}

export function cache<Item extends Identifiable>(item: Promise<Item>): Promise<Item>;
export function cache<Item extends Identifiable>(item: Item): Item;
export function cache<Item extends Identifiable>(item: Item | Promise<Item>): Item | Promise<Item> {
	if (item instanceof Promise) {
		return item.then((item) => {
			itemCache.data.value[getKey(item)] = item;
			return item;
		});
	}

	itemCache.data.value[getKey(item)] = item;
	return markRaw(item);
}

export function removeFromCache(item: Identifiable): boolean {
	return delete itemCache.data.value[getKey(item)];
}

export function* getAllCached<Item extends Identifiable>(
	type: Item["type"],
	kind: Item["kind"],
): Generator<Item> {
	for (const item of Object.values(itemCache.data.value)) {
		if (item.type === type && item.kind === kind) {
			yield item as Item;
		}
	}
}

export function getCached<Item extends Identifiable>(
	type: Item["type"],
	id: Item["id"],
	kind: Item["kind"],
): Maybe<Item> {
	const item = itemCache.data.value[createKey(type, id, kind)];
	return toRaw(item) as Maybe<Item>;
}

export function getCachedFromKey<Item extends Identifiable>(key: ItemKey<Item>): Maybe<Item> {
	return getCached(...unpackKey(key));
}
