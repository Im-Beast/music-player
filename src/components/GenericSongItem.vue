<script lang="ts" setup>
import { computed, ref } from "vue";

import ContextMenu from "@/components/ContextMenu.vue";
import LocalImg from "@/components/LocalImg.vue";
import { IonIcon, IonItem, IonLabel, IonNote, IonReorder } from "@ionic/vue";
import { compass as compassIcon, musicalNote as musicalNoteIcon } from "ionicons/icons";

import { filledDisplayableArtist, Song } from "@/services/Music/objects";
import { formatArtists, songTypeToDisplayName } from "@/utils/songs";
import { secondsToMMSS } from "@/utils/time";

const {
	button = true,
	title,
	type,
	artists,
	album,
	artwork,
	duration,
	reorder,
	disabled,
	routerLink,
} = defineProps<
	Pick<Partial<Song>, "type" | "duration" | "album" | "artists" | "artwork" | "title"> & {
		reorder?: boolean;
		button?: boolean;
		disabled?: boolean;
		routerLink?: string;
	}
>();

const formattedArtists = computed(
	() => artists && formatArtists(artists?.map(filledDisplayableArtist)),
);
const displayName = computed(() => type && songTypeToDisplayName(type));
const formattedDuration = computed(() => duration && secondsToMMSS(duration));

const emit = defineEmits<{
	itemClick: [PointerEvent];
	contextMenuClick: [PointerEvent];
	visibilitychange: [value: boolean];
}>();

const contextMenuOpen = ref(false);

function emitClick(event: PointerEvent): void {
	if (contextMenuOpen.value) {
		emit("contextMenuClick", event);
	} else {
		emit("itemClick", event);
	}
}
</script>

<template>
	<ContextMenu :class="$props.class" ref="contextMenu" @visibilitychange="contextMenuOpen = $event">
		<ion-item
			:router-link
			:button
			:disabled
			:detail="contextMenuOpen"
			@click="emitClick"
			:class="$attrs.class"
		>
			<LocalImg
				v-if="artwork"
				slot="start"
				:src="artwork"
				:alt="`Artwork for song '${title}' by ${formattedArtists}`"
			/>

			<ion-label>
				<h1>{{ title ?? "Unknown title" }}</h1>
				<ion-note>
					<template v-if="artists && type">
						<p>
							<ion-icon :icon="compassIcon" />
							{{ displayName }}
						</p>
						<p>
							<ion-icon :icon="musicalNoteIcon" />
							{{ formattedArtists }}
						</p>
					</template>
					<template v-else-if="album">
						{{ album }}
					</template>
					<template v-else-if="duration">
						{{ formattedDuration }}
					</template>
				</ion-note>
			</ion-label>

			<ion-reorder data-context-menu-ignore v-if="reorder" slot="end" />
		</ion-item>

		<template #options>
			<slot name="options" />
		</template>
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

	& > ion-reorder {
		display: none;
	}
}

ion-item {
	& > .local-img {
		pointer-events: none;

		--img-border-radius: 8px;
		--img-width: auto;
		--img-height: 56px;

		border: 0.55px solid #0002;
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

	& > ion-reorder {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
	}
}
</style>
