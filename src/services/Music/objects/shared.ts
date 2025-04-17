const PHANTOM_TYPE_DATA = Symbol("PHANTOM_TYPE_DATA");

type Primitive = string | number | boolean;

export interface Identifiable {
	type: Primitive;
	kind: Primitive;
	id: Primitive;
}

export type ItemKey<T extends Identifiable> = `${T["type"]}/${T["id"]}` & {
	[PHANTOM_TYPE_DATA]?: T;
};

// If Type is an union, it becomes union of two filled parts
export type FilledUnion<Type> = Type extends infer A | infer B
	? Filled<A> | Filled<B>
	: Filled<Type>;

export type Filled<Type> =
	// If Type is an ItemKey, it becomes an item the key poinst to
	Type extends ItemKey<infer Item extends Identifiable>
		? Item
		: { [key in keyof Type]: FilledUnion<Type[key]> };

export function createKey<Item extends Identifiable>(
	type: Item["type"],
	id: Item["id"],
	kind: Item["kind"],
): ItemKey<Item> {
	type = encodeURIComponent(type);
	id = encodeURIComponent(id);
	kind = kind && encodeURIComponent(kind);
	return kind ? (`${type}/${id}/${kind}` as const) : (`${type}/${id}` as const);
}

export function isKey(key: string): key is ItemKey<any> {
	const data = key.split("/");
	if (data.length < 2 || data.length > 3) return false;
	return true;
}

export function unpackKey<Item extends Identifiable>(
	key: ItemKey<Item>,
): [type: Item["type"], id: Item["id"], kind: Item["kind"]] {
	const data = key.split("/");
	if (data.length !== 3) {
		throw new Error(`Tried unpacking invalid key: ${key}`);
	}

	const type = decodeURIComponent(data[0]!);
	const id = decodeURIComponent(data[1]!);
	const kind = decodeURIComponent(data[2]!);
	return [type, id, kind];
}

export function getKey<Item extends Identifiable>(item: Item): ItemKey<Item> {
	return createKey(item.type, item.id, item.kind);
}
