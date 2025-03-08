<template>
	<ion-page>
		<AppHeader>
			<template #toolbar>
				<ion-buttons slot="start">
					<ion-back-button text="Library" />
				</ion-buttons>

				<ion-title>Albums</ion-title>
			</template>
		</AppHeader>

		<ion-content :fullscreen="true">
			<!-- TODO -->
		</ion-content>

		<AppFooter />
	</ion-page>
</template>

<script lang="ts" setup>
import AppFooter from "@/components/AppFooter.vue";
import AppHeader from "@/components/AppHeader.vue";
import { IonBackButton, IonButtons, IonContent, IonPage, IonTitle } from "@ionic/vue";
</script>
