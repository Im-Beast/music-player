import { EitherType } from "../../utils/types";

import "./instance";
import "./objects";
import "./search";

declare global {
	namespace MusicKit {
		/**
		 * A resource—such as an album, song, or playlist.
		 * A Resource object may contain just these identifier members: id, type, href, and meta.
		 * @see https://developer.apple.com/documentation/applemusicapi/resource
		 */
		interface Resource {
			id: string;
			type: string;
			href?: string;
			attributes?: ResourceAttributes;
			relationships?: ResourceRelationships;
			meta?: ResourceMeta;
			views?: ResourceViews;
		}

		type ResourceRelationships = Record<string, ResourceRelationship>;
		/**
		 * A to-one or to-many relationship from one resource object to others.
		 * The rules that apply to the members of this object are:
		 * Must contain one of these members: href, data, or meta.
		 * If a to-many relationship, may contain the next member.
		 * @see https://developer.apple.com/documentation/applemusicapi/relationship
		 */
		type ResourceRelationship<ToMany extends boolean = false> = EitherType<
			[
				{
					/** A URL subpath that fetches the relationship resources as the primary object. This member is only present in responses. */
					href: string;
				},
				{
					/** One or more destination objects */
					data: Resource;
				},
				{
					/** Contextual information about the relationship for the request or response. */
					meta: ResourceMeta;
				},
			]
		> &
			(ToMany extends true
				? {
						/** Link to the next page of resources in the relationship. Contains the offset query parameter that specifies the next page. See Fetch Resources by Page. */
						next: string;
					}
				: { next: never });

		/**
		 * Information about the request or response.
		 * @see https://developer.apple.com/documentation/applemusicapi/relationship/meta
		 */
		type ResourceMeta = Record<string, string>;

		/**
		 * Attributes representing the metadata of the resource.
		 * @see https://developer.apple.com/documentation/applemusicapi/resource/attributes
		 */
		type ResourceAttributes = Record<string, string>;

		/**
		 * Views belonging to the resource.
		 * @see https://developer.apple.com/documentation/applemusicapi/resource/views
		 */
		type ResourceViews = Record<string, ResourceView>;

		/**
		 * A to-one or to-many relationship view from one resource object to others representing interesting associations.
		 * @see https://developer.apple.com/documentation/applemusicapi/view
		 */
		interface ResourceView {
			/** A URL subpath that fetches the view resources and attributes as the primary objects. This member is only present in responses. */
			href?: string;
			/** Link to the next page of resources in the view. Contains the offset query parameter that specifies the next page. See Fetch Resources by Page. */
			next?: string;
			/** Attributes specific to the view. */
			attributes: ViewAttributes;
			/** One or more destination objects. */
			data: Resource[];
			/** Contextual information about the view for the request or response. */
			meta?: ViewMeta;
		}

		/**
		 * Attributes representing the metadata of the view.
		 * @see https://developer.apple.com/documentation/applemusicapi/view/attributes
		 */
		type ViewAttributes = Record<string, string>;

		/**
		 * Information about the request or response.
		 * @see https://developer.apple.com/documentation/applemusicapi/view/meta
		 */
		type ViewMeta = Record<string, string>;

		/**
		 * Information about an error that occurred while processing a request.
		 * @see https://developer.apple.com/documentation/applemusicapi/error
		 */
		interface Error {
			/** The code for this error. For possible values, see HTTP Status Codes. */
			code: string;
			/** A long, possibly localized, description of the problem. */
			detail?: string;
			/** A unique identifier for this occurrence of the error. */
			id: string;
			/** An object containing references to the source of the error. For possible members, see Source object. */
			source: ErrorSource;
			/** The HTTP status code for this problem. */
			status: string;
			/** A short, possibly localized, description of the problem. */
			title: string;
		}

		/**
		 * The Source object represents the source of an error.
		 * @see https://developer.apple.com/documentation/applemusicapi/error/source
		 */
		interface ErrorSource {
			/** The URI query parameter that caused the error. */
			parameter?: string;
			/** A pointer to the associated entry in the request document. */
			pointer?: string;
		}

		function getInstance(): MusicKit.MusicKitInstance | undefined;
		function configure(...args: any): Promise<MusicKit.MusicKitInstance>;

		/**
		 * Takes an artwork object, which is common in Apple Music API Responses.
		 *
		 * @param artwork - see {@linkcode MusicKit.Artwork}
		 * @param width - The desired artwork width*
		 * @param height - The desired artwork height*
		 * @returns - A URL that can be used as the source for an image or picture tag, etc.
		 *
		 * NOTE: *The resulting image dimensions may not match the values provided, as the image rendering service attempts to pick the correct values without distorting the original aspect ratio or content. For best results, match the aspect ratio of the width and height values from the artwork object itself.
		 */
		function formatArtworkURL(artwork: MusicKit.Artwork, width?: number, height?: number): string;

		enum PlayerRepeatMode {
			none = 0,
			one = 1,
			all = 2,
		}
	}
}

export {};
