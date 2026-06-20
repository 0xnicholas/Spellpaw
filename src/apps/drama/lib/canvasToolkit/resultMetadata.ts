/**
 * Extract output spec metadata from a generation resultUrl.
 *
 * Used to populate CanvasNodeData fields (resolution, fileSize, duration)
 * so users can see what they got. The output is best-effort: network failures
 * or non-standard URLs return what we can parse and leave the rest undefined.
 *
 * Per the Buzzy competitive analysis (docs/competitive-analysis-buzzy-now.md
 * section 2.5), the goal is "output spec transparency" — Spellpaw should
 * always tell the user the resolution / duration / fileSize of generated
 * assets, even when the upstream provider doesn't return them.
 */

export interface ResultMetadata extends Record<string, unknown> {
	/** Image dimensions in `WxH` form, e.g. "1920x1080". */
	resolution?: string;
	/** File size in bytes (from Content-Length on a HEAD request). */
	fileSize?: number;
	/** Media duration in seconds (parsed from query string for video URLs). */
	duration?: number;
}

/** Try to parse `?w=1920&h=1080` or `?resolution=1920x1080` style metadata from a URL. */
export function parseResolutionFromUrl(url: string): string | undefined {
	try {
		const u = new URL(url);
		const w = u.searchParams.get("w") ?? u.searchParams.get("width");
		const h = u.searchParams.get("h") ?? u.searchParams.get("height");
		if (w && h) return `${w}x${h}`;
		const resolution = u.searchParams.get("resolution");
		if (resolution) return resolution;
	} catch {
		/* not a parseable URL — fall through */
	}
	return undefined;
}

/** Try to parse `?duration=12` style metadata from a URL. */
export function parseDurationFromUrl(url: string): number | undefined {
	try {
		const u = new URL(url);
		const raw = u.searchParams.get("duration") ?? u.searchParams.get("t");
		if (!raw) return undefined;
		const parsed = Number.parseFloat(raw);
		return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
	} catch {
		return undefined;
	}
}

/** Read PNG width/height from the first 24 bytes (signature + IHDR chunk). */
function readPngDimensions(
	buffer: ArrayBuffer,
): { width: number; height: number } | undefined {
	const view = new DataView(buffer);
	// PNG signature is 8 bytes; IHDR chunk is then: 4 length + 4 type + 4 width + 4 height
	const signature = [137, 80, 78, 71, 13, 10, 26, 10];
	for (let i = 0; i < signature.length; i++) {
		if (view.getUint8(i) !== signature[i]) return undefined;
	}
	const width = view.getUint32(16, false);
	const height = view.getUint32(20, false);
	return { width, height };
}

/** Read JPEG dimensions from SOF0/SOF2 markers (best-effort). */
function readJpegDimensions(
	buffer: ArrayBuffer,
): { width: number; height: number } | undefined {
	const view = new DataView(buffer);
	if (view.byteLength < 4 || view.getUint16(0, false) !== 0xffd8)
		return undefined;
	let offset = 2;
	while (offset < view.byteLength) {
		if (view.getUint8(offset) !== 0xff) return undefined;
		const marker = view.getUint8(offset + 1);
		// SOF0 (0xC0) through SOF15 (0xCF) carry dimensions, excluding DHT(0xC4), DAC(0xCC), DNL(0xCC).
		if (
			marker >= 0xc0 &&
			marker <= 0xcf &&
			marker !== 0xc4 &&
			marker !== 0xc8 &&
			marker !== 0xcc
		) {
			const height = view.getUint16(offset + 5, false);
			const width = view.getUint16(offset + 7, false);
			return { width, height };
		}
		const segLength = view.getUint16(offset + 2, false);
		offset += 2 + segLength;
	}
	return undefined;
}

/** Fetch image dimensions by reading the first 4 KB and parsing PNG/JPEG headers. */
export async function fetchImageDimensions(
	url: string,
): Promise<{ width: number; height: number } | undefined> {
	try {
		const res = await fetch(url, { headers: { Range: "bytes=0-4095" } });
		if (!res.ok && res.status !== 206) return undefined;
		const buffer = await res.arrayBuffer();
		return readPngDimensions(buffer) ?? readJpegDimensions(buffer);
	} catch {
		return undefined;
	}
}

/** Fetch file size via HEAD request. Returns undefined if server doesn't expose Content-Length. */
export async function fetchContentLength(
	url: string,
): Promise<number | undefined> {
	try {
		const res = await fetch(url, { method: "HEAD" });
		if (!res.ok) return undefined;
		const len = res.headers.get("Content-Length");
		if (!len) return undefined;
		const parsed = Number.parseInt(len, 10);
		return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
	} catch {
		return undefined;
	}
}

/** Extract all available metadata from a resultUrl. Never throws. */
export async function extractResultMetadata(
	url: string,
	mediaType: "image" | "video",
): Promise<ResultMetadata> {
	const meta: ResultMetadata = {};

	const urlResolution = parseResolutionFromUrl(url);
	if (urlResolution) {
		meta.resolution = urlResolution;
	} else if (mediaType === "image") {
		const dims = await fetchImageDimensions(url);
		if (dims) meta.resolution = `${dims.width}x${dims.height}`;
	}

	if (mediaType === "video") {
		const dur = parseDurationFromUrl(url);
		if (dur) meta.duration = dur;
	}

	const size = await fetchContentLength(url);
	if (size !== undefined) meta.fileSize = size;

	return meta;
}

/** Format a byte count as a human-readable string. */
export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024)
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
