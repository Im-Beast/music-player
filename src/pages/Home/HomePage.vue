<template>
	<ion-page>
		<AppHeader>
			<template #toolbar>
				<ion-title>Home</ion-title>
			</template>
		</AppHeader>

		<ion-content :fullscreen="true" class="ion-padding">HOME 2</ion-content>

		<AppFooter />
	</ion-page>
</template>

<script setup lang="ts">
import AppFooter from "@/components/AppFooter.vue";
import AppHeader from "@/components/AppHeader.vue";
import { IonContent, IonPage, IonTitle } from "@ionic/vue";
</script>
