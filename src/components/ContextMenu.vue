<script lang="ts" setup>
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { IonList, onIonViewWillLeave } from "@ionic/vue";
import { onLongPress } from "@vueuse/core";
import { nextTick, ref, useTemplateRef } from "vue";

const _slots = defineSlots<{
	default(): any;
	options(): any;
}>();

const emit = defineEmits<{
	visibilitychange: [value: boolean];
}>();

const {
	event = "contextmenu",
	move = true,
	backdrop = true,
	haptics = true,
	disabled = false,
	x = "left",
	y = "top",
} = defineProps<{
	event?: "click" | "contextmenu";
	move?: boolean;
	disabled?: boolean;
	backdrop?: boolean;
	haptics?: boolean;
	x?: "left" | "center" | "right" | (string & {});
	y?: "top" | "center" | "bottom" | (string & {});
}>();

const opened = ref(false);

const unpopoverElement = useTemplateRef("unpopoverElement");
if (event === "contextmenu") {
	onLongPress(
		unpopoverElement,
		async (event) => {
			if (event.target instanceof HTMLElement) {
				if ("contextMenuIgnore" in event.target.dataset) return;
			}
			await open();
		},
		{ delay: 200, modifiers: { prevent: true } },
	);
}

const popoverElement = useTemplateRef("popoverElement");
const options = useTemplateRef("contextMenuOptions");

const style = ref<Record<string, string>>({});

async function open(): Promise<void> {
	if (disabled || opened.value) return;

	if (haptics) {
		await Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
	}

	opened.value = true;

	const { top, left, width, height } = unpopoverElement.value!.getBoundingClientRect();

	await nextTick();

	const optionsChildren = options.value?.$el?.children?.length ?? 0;

	style.value = {
		"--context-menu-direction-x": x,
		"--context-menu-direction-y": y,
		"--context-menu-item-top": `${top}px`,
		"--context-menu-item-left": `${left}px`,
		"--context-menu-item-width": `${width}px`,
		"--context-menu-item-height": `${height}px`,
		"--context-menu-options-height": `${48 * optionsChildren}px`,
	};

	popoverElement.value?.showPopover();
	emit("visibilitychange", true);
}

function close(): void {
	const element = popoverElement.value;
	if (!opened.value || !element || element.classList.contains("closed")) {
		return;
	}

	element.classList.add("closed");
	element.addEventListener("animationend", () => {
		opened.value = false;
	});

	emit("visibilitychange", false);
}

onIonViewWillLeave(() => {
	if (!opened.value) return;
	opened.value = false;
	emit("visibilitychange", false);
});
</script>

<template>
	<template v-if="opened">
		<div class="context-menu-dummy" :style />
		<div
			class="context-menu"
			ref="popoverElement"
			popover="manual"
			:style
			:class="{ move, backdrop }"
			open
		>
			<div class="backdrop" @click.self="close" />
			<div class="context-menu-item" @click="close">
				<slot />
			</div>
			<ion-list ref="contextMenuOptions" inset class="context-menu-list" @click="close">
				<slot name="options" />
			</ion-list>
		</div>
	</template>
	<div class="context-item-container" v-else ref="unpopoverElement" @[event].prevent="open">
		<slot />
	</div>
</template>

<style>
@keyframes move-in {
	from {
		top: var(--context-menu-item-top);
		left: var(--context-menu-item-left);
		width: var(--context-menu-item-width);
		height: var(--context-menu-item-height);
	}

	to {
		top: var(--context-menu-top);
		left: var(--context-menu-left);
		width: var(--context-menu-width);
		height: var(--context-menu-height);
	}
}

@keyframes move-out {
	from {
		top: var(--context-menu-top);
		left: var(--context-menu-left);
		width: var(--context-menu-width);
	}

	to {
		top: var(--context-menu-item-top);
		left: var(--context-menu-item-left);
		width: var(--context-menu-item-width);

		&:not(.move) {
			top: var(--context-menu-top);
			left: var(--context-menu-left);
		}
	}
}

@keyframes backdrop-in {
	from {
		opacity: 0%;
		backdrop-filter: blur(0);
	}

	to {
		opacity: 100%;
		backdrop-filter: blur(12px);
	}
}

@keyframes backdrop-out {
	from {
		opacity: 100%;
		backdrop-filter: blur(12px);
	}

	to {
		opacity: 0%;
		backdrop-filter: blur(0);
	}
}

@keyframes list-in {
	from {
		transform: scale(0%);
	}

	to {
		transform: scale(100%);
	}
}

@keyframes list-out {
	from {
		transform: scale(100%);
		opacity: 100%;
	}

	to {
		transform: scale(0%);
		opacity: 0%;
	}
}

.context-menu-dummy {
	width: var(--context-menu-item-width);
	height: var(--context-menu-item-height);
}

.context-menu {
	--context-menu-transition-duration: 450ms;
	--context-menu-transition-easing: cubic-bezier(0.175, 0.885, 0.32, 1.075);
	--context-menu-transition-easing-out: cubic-bezier(0.32, 0.885, 0.55, 1.175);
	--context-menu-transition: all var(--context-menu-transition-duration)
		var(--context-menu-transition-easing);

	position: fixed;

	border: none;
	padding: 0;
	margin: 0;
	overflow: hidden;

	background-color: transparent;

	transition: var(--context-menu-transition);

	--context-menu-top: clamp(
		calc(var(--ion-safe-area-top) + 32px),
		calc(var(--context-menu-item-top) - 64px),
		calc(90vh - 64px - var(--context-menu-item-height) - var(--context-menu-options-height))
	);
	--context-menu-width: min(400px, 70%);
	--context-menu-left: calc(
		var(--context-menu-item-left) - var(--context-menu-width) * 0.9 + var(--context-menu-item-width)
	);
	--context-menu-height: 100%;

	&.move {
		--context-menu-width: min(500px, 90%);
		--context-menu-height: 100%;
		--context-menu-top: clamp(
			calc(var(--ion-safe-area-top) + 64px),
			calc(var(--context-menu-item-top) - 64px),
			calc(90vh - 64px - var(--context-menu-item-height) - var(--context-menu-options-height))
		);
		--context-menu-left: calc((100% - var(--context-menu-width)) / 2);
	}

	animation: move-in var(--context-menu-transition-duration) var(--context-menu-transition-easing)
		forwards;

	&.closed {
		animation: move-out var(--context-menu-transition-duration) var(--context-menu-transition-easing)
			forwards;
	}

	/**
	 * Popovers backdrop is a pain in the ass:
	 * - animations dont work on some browsers
	 * - its click through, even when pointer-events: full is set
	 */
	&::backdrop {
		display: none;
	}

	& > .backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		content: "";
	}

	&.backdrop > .backdrop {
		background-color: rgba(0, 0, 0, 0.2);
		animation: backdrop-in var(--context-menu-transition-duration)
			var(--context-menu-transition-easing) forwards;
	}

	&.backdrop.closed > .backdrop {
		animation: backdrop-out var(--context-menu-transition-duration)
			var(--context-menu-transition-easing-out) forwards;
	}

	& > .context-menu-item {
		--context-menu-item-background: var(--ion-background-color-step-100, #fff);
	}

	&:not(.move) > .context-menu-item {
		position: fixed;
		top: var(--context-menu-item-top);
		left: var(--context-menu-item-left);
	}

	& > .context-menu-list {
		margin: 0;
		margin-top: 0.75rem;
		text-align: left;

		min-width: max-content;
		width: 90%;

		transform-origin: var(--context-menu-direction-y) var(--context-menu-direction-x);
		animation: list-in var(--context-menu-transition-duration) var(--context-menu-transition-easing);

		background-color: transparent;
		backdrop-filter: blur(6px) saturate(200%);

		& > ion-item {
			opacity: 90%;

			--background: var(--ion-background-color-step-150, #eee);
			&:hover,
			&:focus {
				--background: var(--ion-background-color-step-250, #ddd);
			}

			ion-icon[slot="end"] {
				margin-left: 1rem;
			}
		}

		& > ion-item-divider {
			opacity: 90%;
			min-height: 6px;
			--background: var(--ion-background-color-step-200, #ccc);
			outline: 0.02px solid var(--ion-background-color-step-200);
		}
	}

	&.closed > .context-menu-list {
		animation: list-out var(--context-menu-transition-duration)
			var(--context-menu-transition-easing-out);
	}
}
</style>
