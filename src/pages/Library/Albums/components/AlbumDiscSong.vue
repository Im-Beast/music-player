<script lang="ts" setup>
import { ref } from "vue";

import { useMusicPlayer } from "@/stores/music-player";

import { IonBadge, IonItem, IonLabel, useIonRouter } from "@ionic/vue";

import ContextMenu from "@/components/ContextMenu.vue";
import LocalImg from "@/components/LocalImg.vue";
import { Album, AlbumSong, Filled } from "@/services/Music/objects";

const { albumSong, album } = defineProps<{
	albumSong: Filled<AlbumSong>;
	album: Filled<Album>;
}>();

const musicPlayer = useMusicPlayer();
const router = useIonRouter();

const contextMenuOpen = ref(false);

async function click(): Promise<void> {
	if (contextMenuOpen.value) {
		router.push(`/library/songs/${albumSong.song.type}/${albumSong.song.id}`);
	} else {
		await playAlbumSong();
	}
}

async function playAlbumSong(): Promise<void> {
	const song = await musicPlayer.services.retrieveSong(albumSong.song);
	await musicPlayer.state.addToQueue(song, musicPlayer.state.queueIndex + 1);
	musicPlayer.state.queueIndex = musicPlayer.state.queueIndex + 1;
}
</script>

<template>
	<ContextMenu
		:disabled="!albumSong.song.available"
		ref="contextMenu"
		@visibilitychange="contextMenuOpen = $event"
	>
		<ion-item :disabled="!albumSong.song.available" button lines="full" @click="click">
			<ion-badge color="light" slot="start">
				{{ albumSong.trackNumber ?? "!" }}
			</ion-badge>

			<LocalImg
				v-if="album.artwork"
				slot="start"
				:src="album.artwork"
				:alt="`Artwork for song '${albumSong.song.title}' from album '${album.title}'`"
			/>

			<ion-label>{{ albumSong.song.title ?? "Unknown title" }}</ion-label>
		</ion-item>

		<template #options>
			<slot name="options" />
		</template>
	</ContextMenu>
</template>

<style scoped>
& .context-menu:not(.closed) > .context-menu-item > ion-item {
	transition: var(--context-menu-transition);

	--background: var(--context-menu-item-background);

	border-radius: 24px;
	--border-color: transparent;

	--padding-top: 12px;
	--padding-bottom: 12px;
	--padding-start: 12px;
	--padding-end: 12px;

	& > ion-badge {
		display: none;
	}

	& > .local-img {
		display: block;
	}

	& > ion-label {
		white-space: normal;
		font-weight: 550;
		font-size: 1.2rem;
	}
}

& ion-item {
	&.disc-header {
		font-size: 1.25rem;
		font-weight: 550;
	}

	& > .local-img {
		display: none;
		transition: var(--context-menu-transition);

		--img-border-radius: 12px;
		--img-width: 96px;
		--img-height: auto;
	}
}
</style>
