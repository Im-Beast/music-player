import { createRouter, createWebHistory } from "@ionic/vue-router";
import { RouteRecordRaw } from "vue-router";

import HomePage from "@/pages/Home/HomePage.vue";
import SearchPage from "@/pages/Search/SearchPage.vue";
import LibraryPage from "@/pages/Library/LibraryPage.vue";

const routes: RouteRecordRaw[] = [
	{ path: "/", redirect: "/home" },
	{ path: "/home", name: "Home", component: HomePage },
	{ path: "/search", name: "Search", component: SearchPage },
	{ path: "/library", name: "Library", component: LibraryPage },
];

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes,
});

export default router;
