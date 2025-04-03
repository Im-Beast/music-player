import { useIDBKeyval } from "@vueuse/integrations/useIDBKeyval.mjs";
import { defineStore } from "pinia";

import { EitherType, Maybe } from "@/utils/types";

// NOTE: We don't store Blob in IndexedDB because of Safari's shenanigans: https://stackoverflow.com/a/70253220/14053734
interface ImageData {
	buffer: ArrayBuffer;
	type: string;
}

type LocalImageInfo = { [id in string]?: ImageData };

export type LocalImage = EitherType<[{ id: string }, { url: string }]>;

export const useLocalImages = defineStore("LocalImages", () => {
	const localImageInfo = useIDBKeyval<LocalImageInfo>("localImageInfo", {});
	const blobUrls = new Map<string, [url: string, unregisterToken: WeakRef<Blob>]>();

	function log(...args: unknown[]): void {
		console.log("%cLocalImageStore:", "color: #40080; font-weight: bold;", ...args);
	}

	const registry = new FinalizationRegistry((id: string) => {
		log(`Cleaned up ${id}`);
		blobUrls.delete(id);
	});

	function registerImage(id: string, imageData: ImageData, unregister = true): string {
		log(`Register ${id}`);

		if (unregister) {
			// If image is already registered, we unregister it
			// To prevent removing cache entry after the previous Blob got freed
			unregisterImage(id);
		}

		const blob = new Blob([imageData.buffer], { type: imageData.type });
		const blobUrl = URL.createObjectURL(blob);
		const blobRef = new WeakRef(blob);
		blobUrls.set(id, [blobUrl, blobRef]);
		registry.register(blob, id, blobRef);
		return blobUrl;
	}

	function unregisterImage(id: string): boolean {
		const cached = blobUrls.get(id);
		if (!cached) return false;

		log(`Unregister ${id}`);
		return registry.unregister(cached[1]);
	}

	async function associateImage(
		id: string,
		image: Blob,
		resize?: { maxWidth: number; maxHeight: number },
	): Promise<void> {
		resize: if (resize) {
			log(`Resizing ${id} to ${resize.maxWidth}x${resize.maxHeight}`);

			const img = new Image();
			const tempBlobUrl = URL.createObjectURL(image);
			img.src = tempBlobUrl;
			try {
				await new Promise((resolve, reject) => {
					img.onload = resolve;
					img.onerror = reject;
				});
			} catch (error) {
				log("Failed resizing image", error);
				break resize;
			}

			const scale = Math.min(resize.maxWidth / img.width, resize.maxHeight / img.height);

			if (scale >= 1) {
				log("Aborting resizing, image is already smaller than max{Width,Height}");
				break resize;
			}

			const scaledWidth = img.width * scale;
			const scaledHeight = img.height * scale;

			const canvas = document.createElement("canvas");
			canvas.width = scaledWidth;
			canvas.height = scaledHeight;

			const context = canvas.getContext("2d");
			if (!context) {
				log("Aborting resizing, failed to create canvas context");
				break resize;
			}

			context.drawImage(img, 0, 0, scaledWidth, scaledHeight);

			const resizedImage = await new Promise<Blob | null>((resolve) => {
				canvas.toBlob(resolve, image.type);
			});

			if (resizedImage) {
				log("Resized image");
				image = resizedImage;
			} else {
				log("Failed to retrieve resized image");
			}

			URL.revokeObjectURL(tempBlobUrl);
		}

		const imageData: ImageData = {
			buffer: await image.arrayBuffer(),
			type: image.type,
		};

		localImageInfo.data.value[id] = imageData;

		// If image was already registered, re-register it
		// Otherwise it will be lazily registered when needed
		if (unregisterImage(id)) {
			registerImage(id, imageData, false);
		}
	}

	function getUrl(localImage?: LocalImage): Maybe<string> {
		log("getUrl", localImage?.url ?? localImage?.id);

		if (localImage?.url) {
			return localImage.url;
		} else if (localImage?.id) {
			return getBlobUrl(localImage.id!);
		}
	}

	function getBlobUrl(id: string): Maybe<string> {
		log("getBlobUrl", id);

		const cached = blobUrls.get(id);
		if (cached) return cached[0];

		const imageData = localImageInfo.data.value?.[id];
		if (imageData) {
			return registerImage(id, imageData);
		}

		log("getBlobUrl -> image missing");
	}

	return {
		associateImage,
		getUrl,
		getBlobUrl,
	};
});
