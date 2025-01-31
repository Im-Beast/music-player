<template>
	<ion-page>
		<app-header>
			<template #toolbar>
				<ion-title>Home</ion-title>
			</template>
		</app-header>

		<ion-content :fullscreen="true" class="ion-padding">HOME 2</ion-content>

		<app-footer />
	</ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonTitle, IonContent } from "@ionic/vue";
import AppHeader from "@/components/AppHeader.vue";
import AppFooter from "@/components/AppFooter.vue";
</script>
