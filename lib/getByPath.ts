/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Get a value from an object using a dot-notation path.
 * Supports bracket notation for array indices: "items[0].name"
 */
export default function getByPath(obj: any, path: string): any {
	if (!obj || !path) return undefined;

	// Convert bracket notation to dot notation: "items[0].name" -> "items.0.name"
	const normalizedPath = path.replace(/\[(\d+)\]/g, ".$1");
	const keys = normalizedPath.split(".");

	let result = obj;
	for (const key of keys) {
		if (result == null) return undefined;
		result = result[key];
	}
	return result;
}
