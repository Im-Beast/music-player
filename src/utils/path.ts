export function audioMimeTypeFromPath(path: string): string | undefined {
	const extension = path.slice(path.lastIndexOf(".") + 1);

	switch (extension) {
		case "aac":
			return "audio/aac";
		case "mid":
		case "midi":
			return "audio/midi";
		case "mp3":
			return "audio/mp3";
		case "mpeg":
		case "mpg":
			return "audio/mpeg";
		case "m4a":
			return "audio/m4a";
		case "aiff":
		case "aif":
		case "aifc":
			return "audio/aiff";
		case "oga":
		case "ogg":
		case "opus":
			return "audio/ogg";
		case "wav":
			return "audio/wav";
		case "weba":
		case "webm":
			return "audio/webm";
		case "flac":
			return "audio/flac";
		case "3gp":
			return "audio/3gpp";
		default:
			return;
	}
}
