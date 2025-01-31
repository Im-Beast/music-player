# Music player (name is wip)

Unified cross-platform music player.

## Demo showcase

https://github.com/user-attachments/assets/ef20a3ac-5b66-4002-a10e-615af8d44119

## Roadmap

Development is currently prioritized for iOS and macOS, however first stable release should also work on Android, Linux and Windows.

<table>
	<tr>
		<th colspan="2">Feature</th>
		<th>Estimated timeline</th>
	</tr>
	<tr>
		<td>MusicKit</td>
		<td>
			Support Apple Music via MusicKit to allow legal streaming of music on
			every platform.
		</td>
		<td>14th January 2025</td>
	</tr>
	<tr>
		<td>Deezer</td>
		<td>Alike MusicKit</td>
		<td>indeterminate*</td>
	</tr>
	<tr>
		<td rowspan="2">Local media</td>
		<td>Playing local audio tracks</td>
    <td>31st January 2025</td>
	</tr>
  <tr>
	  <td>Local device discovery with syncing media between devices</td>
    <td>May 2025</td>
  </tr>
	<tr>
		<td>YouTube</td>
		<td>Playing YouTube media</td>
		<td>14th February 2025</td>
	</tr>
	<tr>
		<td rowspan="2">Unified search and playlists</td>
		<td>Storing songs from multiple platforms in singular playlists</td>
		<td rowspan="2">February-March 2025</td>
	</tr>
	<tr>
		<td>Search for a song/album across platforms</td>
	</tr>
  <tr>
    <td>Metadata tagging</td>
    <td>
      Simple hosting service storing
      <ul>
        <li>Lyrics</li>
        <li>Cover albums</li>
        <li>Albums</li>
        <li>Track details (Artist, Year, etc.)</li>
      </ul>
      Such hosting will cache the metadata obtained either from MusicKit or
      Last.fm and forward it to the user
    </td>
    <td>April 2025</td>
  </tr>
  <tr>
    <td>Playlist synchronization</td>
    <td>
      Simple service to which user can log in that stores all the playlist data
      and syncs them between devices
    </td>
    <td>indeterminate*</td>
  </tr>
  <tr>
    <td>Decentralized media</td>
    <td>Seeding, leeching and streaming torrents</td>
    <td>indeterminate*</td>
  </tr>
</table>

Dates attributed to each features are a subject to change as they are a very rough estimates at a very early point in development.
Debugging, life-related things, app design and such might affect them.
I will try to update the roadmap as the development progresses.

\* – Features considered "optional", unclear whether they will materialize

## Development

### Shared

These steps are needed for every platform to work properly

1. Make sure you have all dependencies required to build the app:
   - Package manager: [pnpm](https://pnpm.io).
   - Make sure you have downloaded all prerequisites for:
     - [Capacitor](https://capacitorjs.com/docs/getting-started/environment-setup)
     - [Ionic](https://ionicframework.com/docs/intro/environment)
2. Place your [MusicKit Developer Token](https://developer.apple.com/documentation/applemusicapi/generating_developer_tokens) in corresponding files:
   - /.example.env ⇢ /.env
3. Setup ionic and install dependencies

```sh
pnpm install -g @ionic/cli # Install ionic cli globally
ionic config set -g npmClient pnpm # Make ionic use pnpm
pnpm install # Install all project dependencies
```

### Web

```sh
ionic serve			   # Run the development server
ionic serve --external # add --external if you want to host it to other devices on your network
ionic build			   # Build the web app into dist/web
```

### Electron

1. If you intend to use DRM content via MusicKit in Electron you need to sign the electron application with VMP certificate, read more:
   - [Electron for Content Security VMP signing](https://github.com/castlabs/electron-releases/wiki/EVS)
   - [Signing VMP certificate during development](https://github.com/castlabs/electron-releases/wiki/FAQ#how-can-i-vmp-sign-my-application-during-development)
   - [My commit message explaining it a bit](https://github.com/Im-Beast/music-player/commit/cb5ba29462bd881608e62efef0417530b1cb6c8b)

```sh
pnpm electron-dev			   # Run the app with development server
pnpm electron-build			   # Build the electron app into dist/electron
pnpm electron-preview		   # Preview how the app will look like in production mode
```

### Mobile

> [!NOTE]
> MusicKit authorization on mobile requires you to already have Apple Music app installed.

#### iOS

> [!IMPORTANT]
> To run iOS app you will have to use physical device, as MusicKit is not supported in Simulator.

1. Build and open in Xcode

```sh
ionic capacitor build ios
```

2. Run on physical device

### Android

> [!NOTE]
> Unlike iOS you can use Android Virtual Devices (AVD) found in Android Studio or any other Emulator for that matter.

1. Place your [MusicKit Developer Token](https://developer.apple.com/documentation/applemusicapi/generating_developer_tokens) in:
   - /android/app/src/main/res/values/tokens.example.xml ⇢ /android/app/src/main/res/values/tokens.xml
2. Build or open the app

```sh
ionic capacitor open android # Build android and open Android Studio
ionic capacitor run android  # Or run android app directly in emulator
```

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue](https://marketplace.visualstudio.com/items?itemName=Vue.volar) + [Ionic](https://marketplace.visualstudio.com/items?itemName=ionic.ionic).
