<script lang="ts" setup>
import {
	IonCard,
	IonCardHeader,
	IonCardSubtitle,
	IonCardTitle,
	IonSkeletonText,
	IonThumbnail,
} from "@ionic/vue";

function randomIntBetween(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min) + min);
}
</script>

<template>
	<ion-card class="skeleton-card">
		<ion-thumbnail>
			<ion-skeleton-text :animated="true" />
		</ion-thumbnail>

		<ion-card-header>
			<ion-card-title>
				<ion-skeleton-text :animated="true" :style="`width: ${randomIntBetween(40, 70)}%`" />
			</ion-card-title>
			<ion-card-subtitle>
				<ion-skeleton-text :animated="true" :style="`width: ${randomIntBetween(20, 30)}%`" />
			</ion-card-subtitle>
		</ion-card-header>
	</ion-card>
</template>

<style>
@keyframes show-up {
	from {
		opacity: 0%;
	}

	to {
		opacity: 100%;
	}
}

.skeleton-card {
	animation: show-up 250ms ease-in;

	& > ion-thumbnail {
		--border-radius: 12px;
		width: 100%;
		height: auto;
		aspect-ratio: 1 / 1;
	}
}
</style>
