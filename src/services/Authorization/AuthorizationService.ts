import { Service } from "@/services/Service";
import { Maybe } from "@/utils/types";
import { Preferences } from "@capacitor/preferences";

export class AuthorizedEvent<Data> extends CustomEvent<Data> {
	constructor(data: Data) {
		super("authorized", { detail: data });
	}
}

export class UnauthorizedEvent extends CustomEvent<never> {
	constructor() {
		super("unauthorized");
	}
}

export abstract class AuthorizationService<const Key extends string, const Data> extends Service {
	logName = "AuthorizationService";
	logColor = "#3040ff";

	abstract key: Key;

	constructor() {
		super();
	}

	addEventListener(
		type: "authorized" | "unauthorized",
		callback: EventListenerOrEventListenerObject | null,
		options?: AddEventListenerOptions | boolean,
	): void {
		super.addEventListener(type, callback, options);
	}

	emitAuthorized(data: Data): boolean {
		return this.dispatchEvent(new AuthorizedEvent(data));
	}
	emitUnauthorized(): boolean {
		return this.dispatchEvent(new UnauthorizedEvent());
	}
	emitAppropriate(data?: Maybe<Data>): boolean {
		if (data) return this.emitAuthorized(data);
		return this.emitUnauthorized();
	}

	abstract handlePassivelyAuthorize(): Promise<Maybe<Data>> | Maybe<Data>;
	async passivelyAuthorize(): Promise<Maybe<Data>> {
		this.log("passivelyAuthorize");
		return await this.handlePassivelyAuthorize();
	}

	abstract handleAuthorize(): Promise<Data> | Data;
	async authorize(): Promise<Data> {
		this.log("authorize");
		const data = await this.handleAuthorize();
		this.emitAuthorized(data);
		return data;
	}

	abstract handleUnauthorize(): Promise<void> | void;
	async unauthorize(): Promise<void> {
		this.log("unauthorize");
		await this.handleUnauthorize();
		await this.forget();
		this.emitUnauthorized();
	}

	async forget(): Promise<void> {
		this.log("forget");
		await Preferences.remove({ key: this.key });
	}

	async remember(data: Data): Promise<void> {
		this.log("remember");
		await Preferences.set({ key: this.key, value: JSON.stringify(data) });
	}

	async getRemembered(): Promise<Maybe<Data>> {
		const { value } = await Preferences.get({ key: this.key });
		return value && JSON.parse(value);
	}
}
