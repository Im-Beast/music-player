export function intensity([r, g, b]: Uint8ClampedArray): number {
	return r * 0.21 + g * 0.72 + b * 0.07;
}
