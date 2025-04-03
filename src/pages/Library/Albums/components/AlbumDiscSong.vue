<script lang="ts" setup>
import { ref } from "vue";

import { Album, DiscSong, useMusicPlayer } from "@/stores/music-player";

import { IonBadge, IonIcon, IonItem, IonLabel, useIonRouter } from "@ionic/vue";
import { alert as alertIcon } from "ionicons/icons";

import ContextMenu from "@/components/ContextMenu.vue";
import LocalImg from "@/components/LocalImg.vue";

const { discSong, album } = defineProps<{
	discSong: DiscSong;
	album: Album;
}>();

const musicPlayer = useMusicPlayer();
const router = useIonRouter();

const contextMenuOpen = ref(false);

async function click() {
	if (contextMenuOpen.value) {
		router.push(`/library/songs/${discSong.song.type}/${discSong.song.id}`);
	} else {
		await playDiscSong();
	}
}

async function playDiscSong(): Promise<void> {
	const song = await musicPlayer.services.getSongFromPreview(discSong.song);
	await musicPlayer.state.addToQueue(song, musicPlayer.state.queueIndex + 1);
	musicPlayer.state.queueIndex = musicPlayer.state.queueIndex + 1;
}
</script>

<template>
	<ContextMenu
		:disabled="!discSong.song.available"
		ref="contextMenu"
		@visibilitychange="contextMenuOpen = $event"
	>
		<ion-item :disabled="!discSong.song.available" button lines="full" @click="click">
			<ion-badge color="light" slot="start">
				{{ discSong.trackNumber ?? "!" }}
			</ion-badge>

			<LocalImg
				v-if="album.artwork"
				slot="start"
				:src="album.artwork"
				:alt="`Artwork for song '${discSong.song.title}' from album '${album.title}'`"
			/>

			<ion-label>{{ discSong.song.title ?? "Unknown title" }}</ion-label>
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
