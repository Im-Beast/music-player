import { registerPlugin } from "@capacitor/core";

export interface MusicKitTokens {
	developerToken: string;
	musicUserToken: string;
}

export interface MusicKitAuthorizationPlugin {
	authorize(): Promise<MusicKitTokens>;
}

const MusicKitAuthorization = registerPlugin<MusicKitAuthorizationPlugin>("MusicKitAuthorization", {
	web: () =>
		import("./MusicKitAuthorization/web").then(
			({ MusicKitAuthorization }) => new MusicKitAuthorization(),
		),
});

export default MusicKitAuthorization;
