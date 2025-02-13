import { useIDBKeyvalAsync } from "@/utils/vue";
import { Service } from "./Service";

interface LocalImageInfo {
	[imageId: string]: { image?: Blob; url?: string } | undefined;
}

/**
 * Service which manages blob urls
 */
export class LocalImageManagementService extends Service {
	logName = "LocalImageManagementService";
	logColor = "#704080";

	// TODO: These images should probably get cleaned after a while to not use too much space
	#localImageInfo = useIDBKeyvalAsync<LocalImageInfo>("localImageInfo", {});

	constructor() {
		super();
	}

	#revoked = false;
	async initialize(): Promise<void> {
		this.log("initialize");
		if (!this.#revoked) {
			// We have to clear urls that have been set in the previous session
			// since blob: urls get invalidated when the session ends
			await this.revokeAllUrls();
			this.#revoked = true;
		}
	}

	async associateImage(
		id: string,
		image: Blob,
		resize?: { width: number; height: number },
	): Promise<void> {
		await this.initialize();
		this.log("associateImage");

		const localImageInfo = await this.#localImageInfo;

		resize: if (resize) {
			this.log("resize");

			const { width, height } = resize;

			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;

			const context = canvas.getContext("2d");
			if (!context) break resize;

			const blobUrl = URL.createObjectURL(image);

			const img = new Image(width, height);
			img.src = blobUrl;
			await new Promise((resolve, reject) => {
				img.onload = resolve;
				img.onerror = reject;
			});

			context.drawImage(img, 0, 0, width, height);

			const blob = await new Promise<Blob | null>((resolve) => {
				canvas.toBlob(resolve, image.type);
			});

			if (blob) image = blob;
		}

		await this.revokeBlobUrl(id);
		const imageInfo = (localImageInfo.value[id] ??= {});
		imageInfo.image = image;
	}

	async getBlobUrl(id: string): Promise<string | undefined> {
		await this.initialize();
		this.log("getBlobUrl", id);

		const localImageInfo = await this.#localImageInfo;
		const imageInfo = localImageInfo.value[id];
		if (imageInfo?.url) {
			if (!imageInfo.image) {
				this.log("Revoke no longer existing image");
				await this.revokeBlobUrl(id);
				return;
			}

			this.log("Return cached blob url");
			return imageInfo.url;
		}

		if (imageInfo?.image) {
			this.log("createObjectURL");
			imageInfo.url = URL.createObjectURL(imageInfo.image);
			return imageInfo.url;
		}
	}

	async revokeBlobUrl(id: string): Promise<boolean> {
		this.log("revokeBlobUrl", id);

		const localImageInfo = await this.#localImageInfo;
		const imageInfo = localImageInfo.value[id];
		if (imageInfo?.url) {
			URL.revokeObjectURL(imageInfo.url);
			imageInfo.url = undefined;
			return true;
		}

		return false;
	}

	async revokeAllUrls(): Promise<void> {
		this.log("revokeAllUrls");

		const localImageInfo = await this.#localImageInfo;
		for (const key of Object.keys(localImageInfo.value)) {
			await this.revokeBlobUrl(key);
		}
	}
}
