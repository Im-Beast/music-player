export function generateUUID(): string {
	// crypto.randomUUID is only available in secure contexts
	if (crypto?.randomUUID) {
		return crypto.randomUUID();
	}

	// https://stackoverflow.com/a/53723395/14053734
	const asHex = (number: number, length: number): string =>
		number.toString(16).padStart(length, "0");
	const data = crypto.getRandomValues(new Uint8Array(16));
	data[6] = (data[6] & 0xf) | 0x40;
	data[8] = (data[8] & 0x3f) | 0x80;
	const view = new DataView(data.buffer);
	return `${asHex(view.getUint32(0), 8)}-${asHex(view.getUint16(4), 4)}-${asHex(view.getUint16(6), 4)}-${asHex(view.getUint16(8), 4)}-${asHex(view.getUint32(10), 8)}${asHex(view.getUint16(14), 4)}`;
}
