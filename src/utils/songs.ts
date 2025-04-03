import { LocalImage, useLocalImages } from "@/stores/local-images";
import { AnySong } from "@/stores/music-player";

export function formatArtists(artists?: string[]): string {
	if (!artists) {
		return "Unknown artist(s)";
	}
	return artists.join(" & ");
}

export function formatGenres(genres?: string[]): string {
	return genres?.join(", ") || "Unknown genre(s)";
}

export function songTypeToDisplayName(type?: AnySong["type"]): string {
	switch (type) {
		case "local":
			return "Local";
		case "musickit":
			return "Apple Music";
		case "youtube":
			return "YouTube";
		default:
			return "Unknown service";
	}
}

const intensity = ([r, g, b]: Uint8ClampedArray): number => {
	return r! * 0.21 + g! * 0.72 + b! * 0.07;
};

/**
 *
 * @param artworkUrl
 * @returns
 */
export async function generateSongStyle(artwork?: LocalImage): Promise<AnySong["style"]> {
	if (!artwork) {
		return {
			fgColor: "#ffffff",
			bgColor: "#000000",
			bgGradient: "#000000",
		};
	}

	const localImages = useLocalImages();

	const RESOLUTION = 256;
	const image = new Image(RESOLUTION, RESOLUTION);
	image.crossOrigin = "anonymous";
	image.src = localImages.getUrl(artwork)!;
	const loadedImage = await new Promise<boolean>((r) => {
		image.onload = (): void => r(true);
		image.onerror = (): void => {
			console.warn("Failed loading artwork:", artwork);
			r(false);
		};
	});

	if (!loadedImage) {
		return {
			fgColor: "#ffffff",
			bgColor: "#000000",
			bgGradient: "#000000",
		};
	}

	const canvas = document.createElement("canvas");
	canvas.width = RESOLUTION;
	canvas.height = RESOLUTION;

	const context = canvas.getContext("2d", {
		willReadFrequently: true,
	});

	if (!context) {
		return {
			fgColor: "#ffffff",
			bgColor: "#000000",
			bgGradient: "#000000",
		};
	}

	context.drawImage(image, 0, 0, RESOLUTION, RESOLUTION);

	// We get multiple samples from the image:
	// - All the corners
	// - 3 samples in the close area to the center of the image (due to it being the most common place to situate interesting things)
	const colors = [
		context.getImageData(0, 0, 1, 1).data,
		context.getImageData(RESOLUTION - 1, 0, 1, 1).data,
		context.getImageData(RESOLUTION * 0.4, RESOLUTION * 0.4, 1, 1).data,
		context.getImageData(RESOLUTION / 2, RESOLUTION / 2, 1, 1).data,
		context.getImageData(RESOLUTION * 0.6, RESOLUTION * 0.6, 1, 1).data,
		context.getImageData(1, RESOLUTION - 1, 1, 1).data,
		context.getImageData(RESOLUTION - 1, RESOLUTION - 1, 1, 1).data,
	]
		// Sort colors by intensity to get a smoother and more pleasing gradient
		.sort((a, b) => intensity(b) - intensity(a));

	const cssColors = colors.map(([r, g, b]) => `rgb(${r}, ${g}, ${b})`);

	const bgGradient = `linear-gradient(65deg, ${cssColors.join(",")})`;

	const bgColor = cssColors[2]!;
	const bgColorIntensity = intensity(colors[2]!);

	// Generate foreground color based on how intense the background is to ensure proper contrast
	let fgColor: string;
	if (bgColorIntensity > 220) {
		fgColor = "#000000";
	} else if (bgColorIntensity > 170) {
		fgColor = "#3a3a3a";
	} else {
		fgColor = "#ffffff";
	}

	canvas.remove();

	return {
		fgColor,
		bgColor,
		bgGradient,
	};
}
