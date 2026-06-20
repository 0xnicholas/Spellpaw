import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	parseResolutionFromUrl,
	parseDurationFromUrl,
	fetchImageDimensions,
	fetchContentLength,
	extractResultMetadata,
	formatBytes,
} from "./resultMetadata";

describe("parseResolutionFromUrl", () => {
	it("reads w and h query params", () => {
		expect(parseResolutionFromUrl("https://x.com/img?w=1920&h=1080")).toBe(
			"1920x1080",
		);
	});

	it("reads width / height aliases", () => {
		expect(
			parseResolutionFromUrl("https://x.com/img?width=1024&height=768"),
		).toBe("1024x768");
	});

	it("reads resolution query param", () => {
		expect(parseResolutionFromUrl("https://x.com/img?resolution=512x512")).toBe(
			"512x512",
		);
	});

	it("returns undefined when no resolution params", () => {
		expect(parseResolutionFromUrl("https://x.com/img")).toBeUndefined();
	});

	it("returns undefined for malformed URL", () => {
		expect(parseResolutionFromUrl("not a url")).toBeUndefined();
	});
});

describe("parseDurationFromUrl", () => {
	it("reads duration query param", () => {
		expect(parseDurationFromUrl("https://x.com/v.mp4?duration=12")).toBe(12);
	});

	it("reads t alias", () => {
		expect(parseDurationFromUrl("https://x.com/v.mp4?t=5.5")).toBe(5.5);
	});

	it("returns undefined for invalid number", () => {
		expect(
			parseDurationFromUrl("https://x.com/v.mp4?duration=abc"),
		).toBeUndefined();
		expect(
			parseDurationFromUrl("https://x.com/v.mp4?duration=0"),
		).toBeUndefined();
	});
});

function makePng(width: number, height: number): ArrayBuffer {
	const buf = new ArrayBuffer(24);
	const view = new DataView(buf);
	// PNG signature
	const signature = [137, 80, 78, 71, 13, 10, 26, 10];
	for (let i = 0; i < signature.length; i++) view.setUint8(i, signature[i]);
	view.setUint32(16, width, false);
	view.setUint32(20, height, false);
	return buf;
}

describe("fetchImageDimensions", () => {
	beforeEach(() => vi.restoreAllMocks());

	it("parses PNG dimensions from the first 24 bytes", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			arrayBuffer: async () => makePng(1920, 1080),
		} as unknown as Response);
		const dims = await fetchImageDimensions("https://x.com/img.png");
		expect(dims).toEqual({ width: 1920, height: 1080 });
	});

	it("returns undefined for non-image content", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			arrayBuffer: async () => new TextEncoder().encode("hello world").buffer,
		} as unknown as Response);
		const dims = await fetchImageDimensions("https://x.com/img.txt");
		expect(dims).toBeUndefined();
	});

	it("returns undefined when fetch fails", async () => {
		globalThis.fetch = vi.fn().mockRejectedValue(new Error("network"));
		const dims = await fetchImageDimensions("https://x.com/img.png");
		expect(dims).toBeUndefined();
	});
});

describe("fetchContentLength", () => {
	beforeEach(() => vi.restoreAllMocks());

	it("returns Content-Length as a number", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			headers: { get: (k: string) => (k === "Content-Length" ? "4096" : null) },
		} as unknown as Response);
		expect(await fetchContentLength("https://x.com/img.png")).toBe(4096);
	});

	it("returns undefined when header is missing", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			headers: { get: () => null },
		} as unknown as Response);
		expect(await fetchContentLength("https://x.com/img.png")).toBeUndefined();
	});

	it("returns undefined on non-OK status", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 404,
			headers: { get: () => null },
		} as unknown as Response);
		expect(await fetchContentLength("https://x.com/img.png")).toBeUndefined();
	});
});

describe("extractResultMetadata", () => {
	beforeEach(() => vi.restoreAllMocks());

	it("combines url query + network for image", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			headers: { get: (k: string) => (k === "Content-Length" ? "2048" : null) },
		} as unknown as Response);
		const meta = await extractResultMetadata(
			"https://x.com/img?w=512&h=512",
			"image",
		);
		expect(meta.resolution).toBe("512x512");
		expect(meta.fileSize).toBe(2048);
		expect(meta.duration).toBeUndefined();
	});

	it("parses video duration from query and skips image dimension fetch", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			headers: {
				get: (k: string) => (k === "Content-Length" ? "8388608" : null),
			},
		} as unknown as Response);
		const meta = await extractResultMetadata(
			"https://x.com/v.mp4?duration=15",
			"video",
		);
		expect(meta.duration).toBe(15);
		expect(meta.fileSize).toBe(8388608);
		// Only one fetch (HEAD for size); image-dimension fetch is skipped for video
		expect(
			(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
				.length,
		).toBe(1);
	});

	it("returns empty metadata when nothing can be parsed", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
			headers: { get: () => null },
		} as unknown as Response);
		const meta = await extractResultMetadata("https://x.com/img", "image");
		expect(meta).toEqual({});
	});
});

describe("formatBytes", () => {
	it("formats bytes in appropriate units", () => {
		expect(formatBytes(500)).toBe("500 B");
		expect(formatBytes(2048)).toBe("2.0 KB");
		expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
		expect(formatBytes(2.5 * 1024 * 1024 * 1024)).toBe("2.50 GB");
	});
});
