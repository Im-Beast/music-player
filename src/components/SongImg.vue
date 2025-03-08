<template>
	<div class="song-img">
		<div class="fallback">
			<ion-icon :icon="imageIcon" />
		</div>

		<ion-img v-if="lazy" :src="url ?? EMPTY_IMAGE" :alt :class="$props.class" />
		<img v-else :src="url ?? EMPTY_IMAGE" :alt :class="$props.class" />
	</div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from "vue";

import { IonIcon, IonImg } from "@ionic/vue";
import { image as imageIcon } from "ionicons/icons";

import { useLocalImages } from "@/stores/local-images";
import { SongImage } from "@/stores/music-player";

const EMPTY_IMAGE =
	"data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const localImages = useLocalImages();
interface Props {
	lazy?: boolean;
	size?: "small" | "medium" | "large";
	src: SongImage | undefined;
	alt?: string;
}
const { lazy = false, src, alt } = defineProps<Props>();

const url = ref<string>();
watchEffect(async () => {
	url.value = await localImages.getSongImageUrl(src);
});
</script>

<style>
.song-img {
	position: relative;

	display: inline-block;
	width: var(--img-width, auto);
	height: var(--img-height, auto);

	& > .fallback {
		--size: 16px;

		position: absolute;

		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);

		& > ion-icon {
			background-color: var(--ion-color-primary);
			color: var(--ion-color-primary-contrast);
			padding: calc(var(--size) / 2);
			font-size: var(--size);
			border-radius: 9999px;
		}
	}

	& > img,
	& > ion-img {
		border-radius: inherit;
		position: relative;
		width: var(--img-width, auto);
		height: var(--img-height, auto);
	}
}
</style>
