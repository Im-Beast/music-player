<template>
	<ion-content :scroll-y="false" class="ion-padding">
		<div class="preview">
			<song-img
				v-if="song.artwork"
				class="artwork"
				:alt="`Artwork for ${song.title}`"
				:src="song.artwork"
			/>

			<div class="details">
				<h1 class="title ion-text-nowrap">{{ song.title }}</h1>
				<h2 class="artist ion-text-nowrap">{{ song.artist }}</h2>
			</div>
		</div>

		<ion-list :inset="true" class="actions">
			<slot />
		</ion-list>
	</ion-content>
</template>

<script setup lang="ts">
import { IonContent, IonList } from "@ionic/vue";
import { AnySong } from "@/stores/music-player";
import SongImg from "@/components/SongImg.vue";

const { song } = defineProps<{ song: AnySong }>();
</script>

<style global>
.song-item-popover {
	--width: min(270px, 65vw);
	--background: transparent;
	--backdrop-opacity: 0.4;
	/** TODO: clamp popover to the boundaries of the screen in case it gets offset too much */
	--offset-x: -75px;
	--offset-y: -25px;
	--box-shadow: none;

	&::part(content) {
		border: none;
	}

	&::part(backdrop) {
		backdrop-filter: blur(12px) !important;
	}
}
</style>

<style scoped>
ion-content {
	--background: transparent;

	& > .preview {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-radius: 12px;
		padding: 12px;
		background-color: var(--ion-item-background, #fff);
		box-shadow: 0 0 3px var(--ion-color-dark, #fff);
		margin-bottom: 12px;

		& > .artwork {
			width: 35%;
			margin-right: auto;
			border-radius: 8px;
		}

		& > .details {
			width: 65%;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;

			& > .title,
			& > .artist {
				margin: 0;
				max-width: 90%;
				overflow: hidden;
				text-overflow: ellipsis;
			}

			& > .title {
				font-size: 1rem;
				font-weight: 800;
			}

			& > .artist {
				font-size: 0.75rem;
			}
		}
	}

	& > .actions {
		box-shadow: 0 0 3px var(--ion-color-dark, #fff);
		border-radius: 12px;
		background: transparent;
		padding-block: 0;
		margin: 0;
	}
}
</style>
