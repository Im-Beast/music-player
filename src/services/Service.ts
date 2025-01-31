export class Service extends EventTarget {
	logName = "Service";
	logColor = "rebeccapurple";

	log(...args: unknown[]): void {
		console.log(`%c${this.logName}:`, `color: ${this.logColor}; font-weight: bold;`, ...args);
	}
}
