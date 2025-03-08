<template>
	<ion-content :scroll-y="false" v-on-click-outside="dismiss">
		<div class="preview">
			<SongImg
				v-if="song.artwork"
				class="artwork"
				:alt="`Artwork for ${song.title}`"
				:src="song.artwork"
			/>

			<div class="details">
				<h1 class="title ion-text-nowrap">{{ song.title }}</h1>
				<h2 class="artist ion-text-nowrap">{{ formatArtists(song.artists) }}</h2>
			</div>
		</div>

		<ion-list :inset="true" class="actions" @click="dismiss">
			<slot />
		</ion-list>
	</ion-content>
</template>

<script lang="ts">
type Component = PopoverOptions["component"];
type ComponentProps = PopoverOptions["componentProps"];
export async function handleHoldSongMenuPopover(
	event: Event,
	callback: () => void | Promise<void>,
): Promise<void> {
	// Disable on non-touch devices
	if (!isMobilePlatform()) return;
	event.preventDefault();

	await Haptics.impact({ style: ImpactStyle.Heavy });
	await callback();
}

export async function createSongMenuPopover(
	event: Event,
	component: Component,
	componentProps: ComponentProps,
): Promise<HTMLIonPopoverElement> {
	const popover = await popoverController.create({
		component,
		event,
		componentProps,

		arrow: false,
		reference: "event",
		alignment: "start",
		side: "right",

		// Built-in popover animations feel weird, so we have our own
		cssClass: "song-item-popover",
		backdropDismiss: false,
		dismissOnSelect: false,
		animated: false,
		mode: "ios",
	});
	popover.componentProps!.popover = popover;
	return popover;
}
</script>

<script setup lang="ts">
import SongImg from "@/components/SongImg.vue";
import { AnySong } from "@/stores/music-player";
import { isMobilePlatform } from "@/utils/os";
import { formatArtists } from "@/utils/songs";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { IonContent, IonList, popoverController, PopoverOptions } from "@ionic/vue";
import { vOnClickOutside } from "@vueuse/components";
import { onMounted } from "vue";

const { song, popover } = defineProps<{ song: Partial<AnySong>; popover: HTMLIonPopoverElement }>();

// Clamp popover position to the boundaries of the screen
onMounted(async () => {
	const content = popover.shadowRoot!.querySelector("[part=content]") as HTMLDivElement;

	// Wait for the animations to finish to get final sizes and positions
	await new Promise((r) => (content.onanimationend = r));

	const { top, left, width, height } = content.getBoundingClientRect();
	const { clientWidth, clientHeight } = document.body;

	if (top < 0) {
		content.style.top = "0px";
	} else if (top + height > clientHeight) {
		content.style.top = `${clientHeight - height}px`;
	}

	if (left < 0) {
		content.style.left = "0px";
	} else if (left + width > clientWidth) {
		content.style.left = `${clientWidth - width}px`;
	}
});

function dismiss(): void {
	popover.classList.add("dismissed");
	setTimeout(async () => {
		await popover.dismiss();
	}, 350);
}
</script>

<style global>
@keyframes song-menu-blur-in {
	from {
		backdrop-filter: blur(0px);
	}

	to {
		backdrop-filter: blur(24px);
	}
}

@keyframes song-menu-fly-in {
	from {
		transform: scale(0%);
	}

	to {
		transform: scale(100%);
	}
}

.song-item-popover {
	--background: transparent;
	--box-shadow: none;

	/** On mobile devices offset it, so that finger sits closer to the buttons */
	--width: min(270px, 65vw);
	--offset-x: -75px;
	--offset-y: -50px;
	--transform-origin: top center;
	animation: song-menu-blur-in 350ms cubic-bezier(0.23, 1, 0.32, 1) forwards;

	/** On computers people expect context menus to open on the corner, and still see content behind it */
	@media (pointer: fine) {
		--width: max-content;
		--offset-x: 0px;
		--offset-y: 0px;
		--transform-origin: top left;
		animation: none;
	}

	&::part(content) {
		transition: all 250ms;
		border: none;
		transform-origin: var(--transform-origin);
		animation: song-menu-fly-in 250ms ease-out;
	}
	&::part(backdrop) {
		transition: opacity 300ms ease-out;
		opacity: 30% !important;
	}

	&.dismissed {
		animation-direction: reverse;

		&::part(content) {
			opacity: 0;
			transform: scale(0);
		}

		&::part(backdrop) {
			opacity: 0 !important;
		}
	}
}
</style>

<style scoped>
ion-content {
	--background: transparent;
	--item-color: color-mix(in srgb, var(--ion-item-background, #fff) 50%, transparent);

	& > .preview {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-radius: 12px;
		padding: 12px;
		margin-bottom: 12px;
		user-select: none;
		background-color: var(--item-color);

		/** We don't show preview on desktops */
		@media (pointer: fine) {
			display: none;
		}

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
		border-radius: 12px;
		background: transparent;
		padding-block: 0;
		margin: 0;

		:global(& > ion-item) {
			--background: var(--item-color);
		}
	}
}
</style>
