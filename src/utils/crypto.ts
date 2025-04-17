export function generateUUID(): string {
	// crypto.randomUUID is only available in secure contexts
	if (crypto?.randomUUID) {
		return crypto.randomUUID();
	}

	// https://stackoverflow.com/a/53723395/14053734
	const asHex = (number: number, length: number): string =>
		number.toString(16).padStart(length, "0");
	const data = crypto.getRandomValues(new Uint8Array(16));
	data[6] = (data[6]! & 0xf) | 0x40;
	data[8] = (data[8]! & 0x3f) | 0x80;
	const view = new DataView(data.buffer);
	return `${asHex(view.getUint32(0), 8)}-${asHex(view.getUint16(4), 4)}-${asHex(view.getUint16(6), 4)}-${asHex(view.getUint16(8), 4)}-${asHex(view.getUint32(10), 8)}${asHex(view.getUint16(14), 4)}`;
}

export function generateHash(data: string, seed = 0): number {
	// https://stackoverflow.com/a/52171480/14053734
	let h1 = 0xdeadbeef ^ seed,
		h2 = 0x41c6ce57 ^ seed;
	for (let i = 0, ch; i < data.length; i++) {
		ch = data.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
	h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
	h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

	return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
