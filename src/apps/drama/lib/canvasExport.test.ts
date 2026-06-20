import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportSingleThumbnail, exportCanvasGrid } from "./canvasExport";
import type { CanvasNode } from "@drama/types";

// jsdom does not implement URL.createObjectURL/revokeObjectURL; stub them globally.
if (!("createObjectURL" in URL)) {
	(URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL =
		() => "blob:test";
}
if (!("revokeObjectURL" in URL)) {
	(URL as unknown as { revokeObjectURL: (u: string) => void }).revokeObjectURL =
		() => {};
}

function makeCard(id: string, title: string, thumbnail?: string): CanvasNode {
	return {
		id,
		type: "art",
		position: { x: 0, y: 0 },
		data: { title, ...(thumbnail ? { thumbnail } : {}) },
	};
}

function mockCanvasApi() {
	const createElement = document.createElement.bind(document);
	const fakeCanvas = {
		width: 0,
		height: 0,
		toBlob: vi.fn((cb: BlobCallback) =>
			cb(new Blob(["x"], { type: "image/png" })),
		),
		getContext: vi.fn(() => ({
			fillStyle: "",
			strokeStyle: "",
			font: "",
			textBaseline: "",
			textAlign: "",
			fillRect: vi.fn(),
			strokeRect: vi.fn(),
			drawImage: vi.fn(),
			fillText: vi.fn(),
		})),
	} as unknown as HTMLCanvasElement;
	vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
		if (tag === "canvas") return fakeCanvas;
		return createElement(tag);
	});
	// Stub Image loading: resolve immediately
	class FakeImage {
		crossOrigin = "";
		onload: (() => void) | null = null;
		onerror: (() => void) | null = null;
		width = 100;
		height = 100;
		set src(_: string) {
			// Fire load on next tick
			Promise.resolve().then(() => this.onload?.());
		}
	}
	vi.stubGlobal("Image", FakeImage);
	return { fakeCanvas };
}

describe("canvasExport — filename sanitization", () => {
	it("sanitizes spaces and special characters via the produced filename", async () => {
		const { fakeCanvas } = mockCanvasApi();
		vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
		const clickSpy = vi
			.spyOn(HTMLAnchorElement.prototype, "click")
			.mockImplementation(() => {});
		const revokeSpy = vi
			.spyOn(URL, "revokeObjectURL")
			.mockImplementation(() => {});

		let capturedAnchor: HTMLAnchorElement | undefined;
		const origCreate = document.createElement.bind(document);
		const createSpy = vi
			.spyOn(document, "createElement")
			.mockImplementation((tag: string) => {
				const el = origCreate(tag);
				if (tag === "a") capturedAnchor = el as HTMLAnchorElement;
				return el;
			});

		await exportSingleThumbnail(
			makeCard("1", "雨夜 重逢!! 场景", "https://x.com/img.png"),
		);

		expect(capturedAnchor?.download).toMatch(
			/^[\u4e00-\u9fa5_a-zA-Z0-9-]+\.png$/,
		);
		expect(capturedAnchor?.download).toContain(".png");
		expect(fakeCanvas.toBlob).toHaveBeenCalled();
		clickSpy.mockRestore();
		revokeSpy.mockRestore();
		createSpy.mockRestore();
	});
});

describe("canvasExport — exportCanvasGrid", () => {
	beforeEach(() => vi.restoreAllMocks());

	it("renders all cards and reports skipped count", async () => {
		mockCanvasApi();
		vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
		vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
		vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

		const cards: CanvasNode[] = [
			makeCard("1", "A", "https://x.com/a.png"),
			makeCard("2", "B", undefined),
			makeCard("3", "C", "https://x.com/c.png"),
		];
		const result = await exportCanvasGrid(cards, { columns: 2 });
		expect(result.totalCards).toBe(3);
		expect(result.renderedCards).toBe(2);
		expect(result.skippedCards).toBe(1);
	});

	it("uses default 3-column grid when columns not specified", async () => {
		mockCanvasApi();
		vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
		vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
		vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

		const cards = Array.from({ length: 7 }, (_, i) =>
			makeCard(`${i}`, `card-${i}`, `https://x.com/${i}.png`),
		);
		const result = await exportCanvasGrid(cards);
		expect(result.totalCards).toBe(7);
		expect(result.renderedCards).toBe(7);
	});

	it("handles empty card list", async () => {
		mockCanvasApi();
		vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
		vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
		vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

		const result = await exportCanvasGrid([]);
		expect(result.totalCards).toBe(0);
		expect(result.renderedCards).toBe(0);
		expect(result.skippedCards).toBe(0);
	});
});

describe("canvasExport — error paths", () => {
	beforeEach(() => vi.restoreAllMocks());

	it("throws when card has no thumbnail", async () => {
		await expect(
			exportSingleThumbnail(makeCard("1", "no-thumb")),
		).rejects.toThrow(/没有 thumbnail/);
	});
});
