<template>
	<ion-img v-if="lazy" :src="url" :alt :class="$props.class" />
	<img v-else :src="url" :alt :class="$props.class" />
</template>

<script setup lang="ts">
import { useLocalImages } from "@/stores/local-images";
import { SongImage } from "@/stores/music-player";
import { IonImg } from "@ionic/vue";
import { ref, watchEffect } from "vue";

const localImages = useLocalImages();
interface Props {
	lazy?: boolean;
	src: SongImage | undefined;
	alt?: string;
}
const { lazy = false, src, alt } = defineProps<Props>();

const url = ref<string>();
watchEffect(async () => {
	url.value = await localImages.getSongImageUrl(src);
});
</script>
