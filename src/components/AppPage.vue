<script lang="ts" setup>
import {
	IonBackButton,
	IonButton,
	IonButtons,
	IonContent,
	IonHeader,
	IonIcon,
	IonPage,
	IonTitle,
	IonToolbar,
} from "@ionic/vue";
import { personCircle as personIcon } from "ionicons/icons";

import { createSettingsModal } from "@/components/AppSettingsModal.vue";
import { useElementBounding } from "@vueuse/core";
import { computed, ref, useTemplateRef, watch } from "vue";

const {
	title,
	backButton,
	showPageHeader = true,
	showContentHeader = true,
} = defineProps<{
	title?: string;
	backButton?: string;
	showPageHeader?: boolean;
	showContentHeader?: boolean;
}>();

const slots = defineSlots<{
	default(): any;

	"toolbar"(): any;
	"toolbar-leading"(): any;
	"toolbar-start"(): any;
	"toolbar-end"(): any;
	"toolbar-trailing"(): any;

	"header-leading"(): any;
	"header-trailing"(): any;
}>();

const inlineView = computed(() => {
	if (document.documentElement.classList.contains("md")) {
		return false;
	}

	return !(slots["toolbar-start"] || backButton !== undefined);
});

async function openSettings(): Promise<void> {
	const modal = await createSettingsModal();
	await modal.present();
	await modal.onDidDismiss();
}

const header = useTemplateRef("header");

const bounding = useElementBounding(header);
const headerHeight = ref(0);
watch(bounding.height, (height) => {
	headerHeight.value = Math.max(headerHeight.value, height);
});
</script>

<template>
	<ion-page id="app-page" :style="{ '--header-height': `${headerHeight}px` }">
		<Transition name="slide">
			<ion-header v-if="showPageHeader" translucent>
				<slot name="header-leading" />

				<slot name="toolbar">
					<ion-toolbar>
						<div slot="start">
							<slot name="toolbar-start">
								<ion-buttons v-if="backButton !== undefined">
									<ion-back-button :text="backButton" />
								</ion-buttons>
							</slot>
						</div>

						<ion-title v-if="title">{{ title }}</ion-title>

						<div v-if="!inlineView" slot="end">
							<slot name="toolbar-end">
								<ion-buttons slot="end">
									<ion-button @click="openSettings">
										<ion-icon size="large" slot="icon-only" :icon="personIcon" />
									</ion-button>
								</ion-buttons>
							</slot>
						</div>
					</ion-toolbar>

					<slot name="header-trailing" />
				</slot>
			</ion-header>
		</Transition>

		<ion-content fullscreen>
			<Transition name="slide">
				<ion-header ref="header" v-if="showContentHeader && title" collapse="condense">
					<slot name="header-leading" />

					<slot name="toolbar">
						<ion-toolbar>
							<slot name="toolbar-leading" />

							<ion-title size="large">{{ title }}</ion-title>

							<div v-if="inlineView" slot="end">
								<slot name="toolbar-end">
									<ion-buttons slot="end">
										<ion-button @click="openSettings">
											<ion-icon size="large" slot="icon-only" :icon="personIcon" />
										</ion-button>
									</ion-buttons>
								</slot>
							</div>

							<slot name="toolbar-trailing" />
						</ion-toolbar>
					</slot>

					<slot name="header-trailing" />
				</ion-header>
			</Transition>

			<slot />
		</ion-content>
	</ion-page>
</template>

<style scoped>
@keyframes show-header {
	from {
		height: 0;
	}

	to {
		height: var(--header-height);
	}
}

.slide-enter-active {
	animation: show-header 150ms cubic-bezier(0.32, 0.885, 0.55, 1.175) forwards;
}

.slide-leave-active {
	animation: show-header 150ms cubic-bezier(0.175, 0.885, 0.32, 1.075) reverse forwards;
}

ion-back-button {
	display: block;
}
</style>
