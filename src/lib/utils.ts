import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// Extracts filename from Content-Disposition header (borrowed this...)
export function getContentDispositionFilename(disposition: string | null) {
	if (!disposition) {
		return null;
	}

	// Regex for 'filename*' (UTF-8) as per RFC 6266
	const utf8FilenameRegex = /filename\*=UTF-8''([^;]+)/i;
	// Regex for standard 'filename' (ASCII)
	const asciiFilenameRegex = /filename="?([^"]+)"?(;|$)/i;

	let fileName: string | null = null;

	// Prefer 'filename*' if present
	if (utf8FilenameRegex.test(disposition)) {
		const matches = utf8FilenameRegex.exec(disposition);
		if (!matches) {
			return null;
		}

		// Decode the percent-encoded UTF-8 string
		fileName = decodeURIComponent(matches[1]);
	} else if (asciiFilenameRegex.test(disposition)) {
		const matches = asciiFilenameRegex.exec(disposition);
		if (!matches) {
			return null;
		}

		fileName = matches[1].replace(/\\"/g, '"'); // Handle escaped quotes
	}

	// Optional: strip any path information (e.g., from "C:\path\to\file.txt" to "file.txt")
	// This is generally not needed as servers should only provide the basename.
	if (fileName && (fileName.includes('/') || fileName.includes('\\'))) {
		fileName = fileName.substring(fileName.lastIndexOf('/') + 1);
		fileName = fileName.substring(fileName.lastIndexOf('\\') + 1);
	}

	return fileName;
}
