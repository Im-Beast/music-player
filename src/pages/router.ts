import { createRouter, createWebHistory } from "@ionic/vue-router";
import { RouteRecordRaw } from "vue-router";

import HomePage from "@/pages/Home/HomePage.vue";
import SearchPage from "@/pages/Search/SearchPage.vue";

import AlbumsPage from "@/pages/Library/Albums/AlbumsPage.vue";
import LibraryPage from "@/pages/Library/LibraryPage.vue";
import PlaylistsPage from "@/pages/Library/Playlists/PlaylistsPage.vue";
import SongsPage from "@/pages/Library/Songs/SongsPage.vue";
import PlaylistPage from "./Library/Playlists/Playlist/PlaylistPage.vue";

const routes: RouteRecordRaw[] = [
	{ path: "/", redirect: "/home" },
	{ path: "/home", name: "Home", component: HomePage },
	{ path: "/search", name: "Search", component: SearchPage },

	{ path: "/library", name: "Library", component: LibraryPage },
	{ path: "/library/songs", name: "Songs", component: SongsPage },
	{ path: "/library/albums", name: "Albums", component: AlbumsPage },
	{ path: "/library/playlists", name: "Playlists", component: PlaylistsPage },
	{ path: "/library/playlists/:id", name: "Playlist", component: PlaylistPage },
];

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes,
});

export default router;
