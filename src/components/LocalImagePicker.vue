<script lang="ts" setup>
import { computed, ref } from "vue";

import LocalImg from "@/components/LocalImg.vue";

import { LocalImage, useLocalImages } from "@/stores/local-images";

const localImages = useLocalImages();

const props = defineProps<{ id: string; idOut?: string }>();

const id = props.id;
const idOut = computed(() => props.idOut ?? props.id);

const emit = defineEmits<{ input: [{ value: LocalImage }] }>();

const image = ref<LocalImage>({ id });
const imagePicker = ref<HTMLInputElement>();

async function changeArtwork(): Promise<void> {
	const { files } = imagePicker.value!;

	if (!files?.length) {
		return;
	}

	const artwork = files[0]!;
	await localImages.associateImage(idOut.value, artwork, {
		maxWidth: 512,
		maxHeight: 512,
	});

	image.value = { id: idOut.value };
	emit("input", { value: image.value });
}
</script>

<template>
	<div class="local-image-picker">
		<LocalImg :src="image" :alt="`Image picker preview`" @click="imagePicker?.click()" />
		<input ref="imagePicker" type="file" accept="image/*" @change="changeArtwork" />
	</div>
</template>

<style>
.local-image-picker {
	display: flex;
	justify-content: center;

	& > .local-img {
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
