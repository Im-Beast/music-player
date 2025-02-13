import { EitherType } from "@/utils/types";

declare global {
	namespace MusicKit {
		type MediaItem = Songs;

		/**
		 * The Queue represents an ordered list of MediaItems to play, and a pointer to the currently playing item, when applicable.\
		 * You can access the current queue in MusicKit with the MusicKitInstance.queue property, or as the return value of MusicKitInstance.setQueue().
		 *
		 * @example
		 * ```js
		 * const music = MusicKit.getInstance();
		 * const queue = await music.setQueue({ album: '1025210938' });
		 * console.log(queue.items); // log the MediaItems in the queue
		 * ```
		 */
		interface Queue {
			/**
			 * The item at the queue.position index within the queue.items array.\
			 * This is the nowPlayingItem when the Queue is the current queue for the MusicKit Instance.
			 */
			currentItem?: MediaItem;
			/** If the length of the queue is 0. */
			isEmpty: boolean;
			/** An array of all the MediaItems in the queue. */
			items: MediaItem[];
			/** The number of items in the queue. */
			length: number;
			/**
			 * This is the next item after the currentItem within the queue.\
			 * See also: previousPlayableItem
			 */
			nextPlayableItem?: MediaItem;
			/** The index position of the nowPlayingItem in the Queue.items Array. */
			position: number;
			/** This is the previous item before the currentItem within the queue. */
			previousPlayableItem?: MediaItem;
		}

		enum PlaybackStates {
			"none" = 0,
			"loading" = 1,
			"playing" = 2,
			"paused" = 3,
			"stopped" = 4,
			"ended" = 5,
			"seeking" = 6,
			"waiting" = 8,
			"stalled" = 9,
			"completed" = 10,
		}

		/**
		 * Queue Options are used to instruct MusicKit to generate or amend a queue, for example using the MusicKitInstance.setQueue() method.
		 *
		 * This object serves two main purposes:
		 * - {@linkcode QueueContentOptions ContentOptions}
		 *   - Indicating media to add to the queue or generate a new queue from
		 * - {@linkcode QueuePlaybackOptions PlaybackOptions}
		 *   - Indicating options for how that content is intended to play
		 *
		 * All of these properties exist within the same Object passed as QueueOptions, but are documented separately below for clarity
		 */
		type QueueOptions = QueueContentOptions & QueuePlaybackOptions;

		// prettier-ignore
		type QueueContentOptions = EitherType<[
            { album: string }, { albums: string[]},
            { song: string }, { songs: string[]},
            { musicVideo: string }, { musicVideos: string[]},
            { playlist: string }, { playlists: string[]},
        ]>;

		interface QueuePlaybackOptions {
			/**
			 * Updates the repeatMode on the MusicKit Instance when setting the new queue.\
			 * If not set, repeatMode on the MusicKit Instance will not be changed.
			 *
			 * @default undefined
			 */
			repeatMode?: MusicKit.PlayerRepeatMode;
			/**
			 * Whether or not to also start playback when the queue is updated.\
			 * If not set to true when MusicKitInstance.setQueue() is called, current playback will stop, if applicable.
			 * @default false
			 */
			startPlaying?: boolean;
			/**
			 * The number of seconds to seek to in the current queue item after it is created.
			 * @default 0
			 */
			startTime?: number;
		}

		class MusicKitInstance {
			readonly developerToken: string;
			musicUserToken?: string;
			isAuthorized: boolean;

			readonly nowPlayingItem?: MediaItem;
			/** The volume of audio playback, which is set directly on the HTMLMediaElement as the HTMLMediaElement.volume property. This value ranges between 0, which would be muting the audio, and 1, which would be the loudest possible. */
			volume: number;
			/** The duration of the nowPlayingItem, in seconds. */
			readonly currentPlaybackDuration: number;
			/** Progress percentage between 0 and 1 indicating the current play head position for the nowPlayingItem. Useful for showing a playback progress bar UI, for instance. */
			readonly currentPlaybackProgress: number;
			/** The current position of the play head for the nowPlayingItem, in seconds. */
			readonly currentPlaybackTime: number;
			/** Set this to an Enum value from MusicKit.PlayerRepeatMode to control the repeat behavior during playback. */
			repeatMode: PlayerRepeatMode;
			/** The current playback state of the media player. See the Enum MusicKit.PlaybackStates for more information and the possible values. */
			readonly playbackState: MusicKit.PlaybackStates;

			/**
			 * Sets the play head to a specified time within the nowPlayingItem.
			 */
			seekToTime(timeInS: number): Promise<void>;

			authorize(): Promise<string>;
			unauthorize(): Promise<void>;

			queue: Queue;
			/**
			 * Sets the current playback Queue to an Apple Music catalog resource or list of songs.
			 * @returns Promise that resolves with the updated Queue, or void if playback is not supported.
			 */
			setQueue(options: QueueOptions): Promise<Queue | void>;
			/**
			 * Inserts the MediaItem(s) defined by QueueOptions at the position indicated in the current queue.
			 * @param position - The index position in the queue to insert the new MediaItem(s) at. Position 0 is the first item in the queue.
			 * @returns Promise that resolves with the updated Queue, or void if playback is not supported.
			 */
			playAt(position: number, options: QueueOptions): Promise<Queue | void>;
			/**
			 * Inserts the MediaItem(s) defined by QueueOptions after the last MediaItem in the current queue.
			 * @returns Promise that resolves with the updated Queue, or void if playback is not supported.
			 */
			playLater(options: QueueOptions): Promise<Queue | void>;
			/**
			 * Inserts the MediaItem(s) defined by QueueOptions immediately after the nowPlayingItem in the current queue.
			 * @param [clear=false] - Optionally clear out the remaining queue items.
			 * @returns Promise that resolves with the updated Queue, or void if playback is not supported.
			 */
			playNext(options: QueueOptions, clear?: boolean): Promise<Queue | void>;
			/** Initiates playback of the nowPlayingItem. */
			play(): Promise<void>;
			/** Pauses playback of the nowPlayingItem. */
			pause(): Promise<void>;
			/** Stops the currently playing item. */
			stop(): Promise<void>;

			api: {
				/**
				 * Passthrough API Method
				 * The api.music() method will handle appending the Developer Token (JWT) in the Authorization header, the Music User Token (MUT) for personalized requests, and can help abstract the user’s storefront from the URLs passed in.
				 * @see https://js-cdn.music.apple.com/musickit/v3/docs/index.html?path=/story/reference-javascript-api--page
				 */
				music<Response = unknown, const QueryParameters = Record<string, unknown>>(
					/**
					 * The path to the Apple Music API endpoint, without a hostname, and including a leading slash
					 * @see https://developer.apple.com/documentation/applemusicapi
					 */
					path: string,
					/**
					 * An object with query parameters which will be appended to the request URL\
					 * The supported or expected query parameters will vary depending on the API endpoint you are requesting from.\
					 * See the Apple Music API documentation for reference.
					 *
					 * @see https://developer.apple.com/documentation/applemusicapi
					 */
					queryParameters?: QueryParameters,
					/** An object with additional options to control how requests are made */
					options?: Record<string, unknown>,
					/** An object with additional options to control how requests are made */
					fetchOptions?: Record<string, unknown>,
				): Promise<{ data: Response }>;
			};

			/**
			 * Listen to an Event on the MusicKit Instance.
			 */
			addEventListener(
				name: string,
				callback: (...args: unknown[]) => unknown,
				options?: { once?: boolean },
			): void;

			/**
			 * Remove an event listener previously configured on the MusicKit Instance via addEventListener.
			 */
			removeEventListener(name: string, callback: (...args: unknown[]) => unknown): void;
		}
	}
}

export {};
