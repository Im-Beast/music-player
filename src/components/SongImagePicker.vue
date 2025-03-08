<script lang="ts" setup>
import { ref } from "vue";

import SongImg from "@/components/SongImg.vue";

import { useLocalImages } from "@/stores/local-images";
import { SongImage } from "@/stores/music-player";

const localImages = useLocalImages();

const { id } = defineProps<{ id: string }>();
const emit = defineEmits<{ input: [{ value: SongImage }] }>();

const image = ref<SongImage>({ id });
const imagePicker = ref<HTMLInputElement>();

async function changeArtwork(): Promise<void> {
	const { files } = imagePicker.value!;

	if (!files?.length) {
		return;
	}

	const artwork = files[0];
	await localImages.localImageManagementService.associateImage(id, artwork, {
		width: 256,
		height: 256,
	});

	image.value = { id };
	emit("input", { value: image.value });
}
</script>

<template>
	<div class="song-image-picker">
		<SongImg :src="image" :alt="`Image picker preview`" @click="imagePicker?.click()" />
		<input ref="imagePicker" type="file" accept="image/*" @change="changeArtwork" />
	</div>
</template>

<style>
.song-image-picker {
	display: flex;
	justify-content: center;

	& > .song-img {
		--img-height: 192px;
		--img-width: auto;

		--shadow-color: rgba(var(--ion-color-dark-rgb), 0.1);

		border-radius: 12px;
		box-shadow: 0 0 12px var(--shadow-color);
		margin-block: 24px;
		background-color: rgba(var(--ion-color-dark-rgb), 0.08);

		& > .fallback {
			--size: 36px;
			filter: drop-shadow(0 0 12px var(--shadow-color));
		}
	}

	& > input {
		display: none;
	}
}
</style>
