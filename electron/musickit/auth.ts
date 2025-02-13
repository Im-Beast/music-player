import http from "node:http";

import { shell } from "electron";
import Handlebars from "handlebars";

import AuthTemplate from "./auth.html?raw";

const authClientTemplate = Handlebars.compile(AuthTemplate);

// Authorize Apple Music:
//  - Host localhost server
//  - Open website that calls MusicKit.Instance.authorize in the web browser
//  - After authorization send the token to the server
export async function authorizeMusicKit(): Promise<string | undefined> {
	const { promise, resolve, reject } = Promise.withResolvers<string | undefined>();

	let serverUrl: string;
	const server = http.createServer((req, res) => {
		res.statusCode = 200;

		if (req.method === "POST") {
			resolve(req.headers.authorization);
			server.close();
			return;
		}

		res.setHeader("Content-Type", "text/html");
		res.end(
			authClientTemplate({
				serverUrl,
				appName: import.meta.env.VITE_APP_NAME,
				appVersion: import.meta.env.VITE_APP_VERSION,
				developerToken: import.meta.env.VITE_DEVELOPER_TOKEN,
			}),
		);
	});

	server.listen(async () => {
		const address = server.address();
		if (!address) {
			reject("Couldn't receive server address");
			server.close();
			return;
		}

		serverUrl = typeof address === "object" ? `http://localhost:${address.port}` : address;
		console.log(`Server running at ${serverUrl}`);
		await shell.openExternal(serverUrl);
	});

	return await promise;
}
