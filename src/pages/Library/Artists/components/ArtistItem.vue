<script lang="ts" setup>
import LocalImg from "@/components/LocalImg.vue";
import { IonIcon, IonItem, IonLabel, IonNote } from "@ionic/vue";
import { compass as compassIcon } from "ionicons/icons";

import ContextMenu from "@/components/ContextMenu.vue";
import { Artist, ArtistPreview } from "@/services/Music/objects";
import { songTypeToDisplayName } from "@/utils/songs";

const { artist } = defineProps<{ artist: Artist | ArtistPreview }>();
</script>

<template>
	<ContextMenu ref="contextMenu">
		<ion-item :router-link="`/library/artists/${artist.type}/${artist.id}`">
			<LocalImg
				v-if="artist.artwork"
				slot="start"
				:src="artist.artwork"
				:alt="`Artwork for artist '${artist.title}'`"
			/>

			<ion-label>
				<h1>{{ artist.title }}</h1>
				<ion-note>
					<p>
						<ion-icon :icon="compassIcon" />
						{{ songTypeToDisplayName(artist.type) }}
					</p>
				</ion-note>
			</ion-label>
		</ion-item>
	</ContextMenu>
</template>

<style scoped>
.context-menu:not(.closed) > .context-menu-item > ion-item {
	transition: var(--context-menu-transition);

	--background: var(--context-menu-item-background);

	border-radius: 24px;
	--border-color: transparent;

	--padding-top: 12px;
	--padding-bottom: 12px;
	--padding-start: 12px;
	--padding-end: 12px;

	& > .local-img {
		transition: var(--context-menu-transition);

		--img-border-radius: 12px;
		--img-width: 96px;
		--img-height: auto;
	}

	& > ion-label {
		height: max-content;
		white-space: normal;

		& > h1 {
			font-size: 1.2rem;
			line-height: 1;

			@supports (line-clamp: 2) {
				line-clamp: 2;
			}

			@supports not (line-clamp: 2) {
				max-height: 2em;
				overflow: hidden;
				text-overflow: ellipsis;
			}
		}

		& > ion-note {
			margin-top: 1em;
			flex-direction: column;
			align-items: start;

			& > p {
				align-items: start;
				font-size: 1.1em;
			}
		}
	}
}

ion-item {
	& > .local-img {
		pointer-events: none;

		--img-border-radius: 999px;
		--img-width: auto;
		--img-height: 56px;
	}

	& > ion-label {
		pointer-events: none;
		white-space: nowrap;

		& > h1 {
			font-size: 0.9em;
			font-weight: 550;
			display: block;
		}

		& > ion-note {
			display: flex;
			gap: 0.5ch;
			align-items: center;
			font-size: 0.75em;

			& > p {
				display: flex;
				align-items: center;
				gap: 4px;
				font-size: inherit;

				& > ion-icon {
					min-width: 1em;
				}
			}
		}
	}
}
</style>
