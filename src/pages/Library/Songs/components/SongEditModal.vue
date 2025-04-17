<script lang="ts">
import { DisplayableArtist, filledDisplayableArtist, Song } from "@/services/Music/objects";
import { MetadataOverride } from "@/stores/metadata";
import { Maybe } from "@/utils/types";
import { computedAsync } from "@vueuse/core";

export type SongEditEvent = Maybe<MetadataOverride>;
</script>

<script lang="ts" setup>
import { computed, ref, toRaw, useTemplateRef } from "vue";

import LocalImagePicker from "@/components/LocalImagePicker.vue";
import MultiValueInput from "@/components/MultiValueInput.vue";
import {
	actionSheetController,
	IonButton,
	IonButtons,
	IonContent,
	IonHeader,
	IonInput,
	IonItem,
	IonList,
	IonModal,
	IonTitle,
	IonToggle,
	IonToolbar,
} from "@ionic/vue";

import { formatGenres, generateSongStyle } from "@/utils/songs";
import { usePresentingElement } from "@/utils/vue";

const { trigger, song } = defineProps<{
	trigger: string;
	song: Song;
}>();

const emit = defineEmits<{
	change: [SongEditEvent];
}>();

const modal = useTemplateRef("modal");
const presentingElement = usePresentingElement();

const title = ref(song.title);
const artists = ref([...song.artists.map(filledDisplayableArtist).map(({ title }) => title)]);
const album = ref(song.album);

const artwork = ref(song.artwork);
const style = computedAsync(
	() => (artwork.value === song.artwork ? song.style : generateSongStyle(artwork.value)),
	song.style,
);

const genres = ref([...song.genres]);
const explicit = ref(song.explicit);

const modified = ref(false);
const canEdit = computed(() => !!title.value && modified.value);

function edit(): void {
	if (!canEdit.value) return;

	const editedArtists: DisplayableArtist[] = artists.value.map((title) => ({
		title,
	}));

	emit("change", {
		title: title.value,
		artists: editedArtists,
		album: album.value,
		genres: toRaw(genres.value),
		explicit: explicit.value,
		artwork: toRaw(artwork.value),
		style: style.value,
	});

	dismiss("editedSong");
}

async function reset(): Promise<void> {
	const actionSheet = await actionSheetController.create({
		header: `Song ${title.value}`,
		subHeader: "Are you sure you want to reset changes made to this song?",
		buttons: [
			{ text: "Keep song changes", role: "cancel", data: { action: "keep" } },
			{ text: "Reset song", role: "destructive", data: { action: "reset" } },
		],
	});

	await actionSheet.present();
	const info = await actionSheet.onWillDismiss();

	switch (info?.data?.action) {
		case "reset":
			emit("change", undefined);
			dismiss("resetSong");
			return;
	}
}

function dismiss(reason?: string): void {
	modal.value?.$el.dismiss(reason);
}

async function canDismiss(reason?: "editedSong" | "resetSong"): Promise<boolean> {
	if (reason === "editedSong" || reason === "resetSong" || !modified.value) return true;

	const actionSheet = await actionSheetController.create({
		header: `Song ${title.value}`,
		subHeader: "Are you sure you want to discard changes made to this song?",
		buttons: [
			{ text: "Discard", role: "destructive", data: { action: "discard" } },
			{ text: "Keep editing", role: "cancel", data: { action: "keep" } },
		],
	});

	await actionSheet.present();
	const info = await actionSheet.onWillDismiss();

	switch (info?.data?.action) {
		case "discard":
			title.value = song.title;
			return true;
		default:
			return false;
	}
}
</script>

<template>
	<ion-modal ref="modal" :trigger :presenting-element="presentingElement" :can-dismiss="canDismiss">
		<ion-header>
			<ion-toolbar>
				<ion-buttons slot="start">
					<ion-button color="danger" @click="dismiss()">Cancel</ion-button>
				</ion-buttons>

				<ion-title>Edit Song</ion-title>

				<ion-buttons slot="end">
					<ion-button color="danger" @click="reset()">Reset</ion-button>
					<ion-button :disabled="!canEdit" strong @click="edit()">Edit</ion-button>
				</ion-buttons>
			</ion-toolbar>
		</ion-header>

		<ion-content id="edit-song-content" :fullscreen="true">
			<LocalImagePicker
				:id="song.id"
				:id-out="`override-${song.id}`"
				@input="((artwork = $event.value), (modified = true))"
			/>

			<ion-list>
				<ion-item>
					<ion-input
						class="title-input"
						aria-label="Song Title"
						placeholder="Song Title"
						v-model="title"
						@ion-change="modified = true"
					/>
				</ion-item>

				<MultiValueInput
					label="Artists"
					:value="artists"
					:formatter="(artists) => artists.join(' & ')"
					@change="((artists = $event), (modified = true))"
				/>

				<ion-item>
					<ion-input label="Album" placeholder="Album" v-model="album" @ion-change="modified = true" />
				</ion-item>

				<MultiValueInput
					label="Genres"
					:value="genres"
					:formatter="formatGenres"
					@change="((genres = $event), (modified = true))"
				/>

				<ion-item>
					<ion-toggle justify="start" v-model="explicit" @ion-change="modified = true">
						Explicit
					</ion-toggle>
				</ion-item>
			</ion-list>
		</ion-content>
	</ion-modal>
</template>

<style>
#edit-song-content {
	& > ion-list {
		width: 100%;
		background: transparent;

		& > ion-item {
			--background: transparent;
		}
	}
}
</style>

<style scoped>
#edit-song-content {
	text-align: center;

	& > h1 {
		font-weight: bold;
		margin-bottom: 0.25rem;
	}

	& > h2 {
		font-size: 1rem;
		margin-top: 0;
	}

	& > ion-button {
		&::part(native) {
			width: 33%;
			margin-inline: auto;
		}

		width: 100%;
		padding-bottom: 1rem;
		border-bottom: 0.55px solid
			var(--ion-color-step-250, var(--ion-background-color-step-250, #c8c7cc));
	}

	& > ion-list {
		& > ion-item {
			& > .title-input {
				font-size: 1.625rem;
				font-weight: bold;
				text-align: center;
			}
		}
	}
}
</style>
