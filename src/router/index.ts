import { createRouter, createWebHistory } from "@ionic/vue-router";
import { RouteRecordRaw } from "vue-router";
import HomePage from "../views/HomePage.vue";
import SearchPage from "@/views/SearchPage.vue";
import LibraryPage from "@/views/LibraryPage.vue";

const routes: Array<RouteRecordRaw> = [
	{
		path: "/",
		redirect: "/home",
	},
	{
		path: "/home",
		name: "Home",
		component: HomePage,
	},
	{
		path: "/search",
		name: "Search",
		component: SearchPage,
	},
	{
		path: "/library",
		name: "Library",
		component: LibraryPage,
	},
];

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes,
});

export default router;
