/**
 * Canvas PNG export utilities.
 *
 * Supports two flows:
 *  - exportSingleThumbnail: download a single canvas card's thumbnail as a PNG file.
 *    For non-PNG source URLs (e.g. JPEG, WebP), we re-encode through a Canvas to
 *    guarantee a `.png` extension and consistent format.
 *  - exportCanvasGrid: render multiple canvas cards into a single PNG grid image
 *    (label + thumbnail rows). Used to share a project visually with collaborators
 *    who don't have Spellpaw installed.
 *
 * This is a minimal replacement for the full Figma/PDF export pipeline described
 * in docs/superpowers/plans/2026-06-15-buzzy-borrow-plan.md (Phase C). Figma
 * plugin integration and proper storyboard layout are deferred.
 */

import type { CanvasNode } from "@drama/types";

const DEFAULT_THUMB_WIDTH = 320;
const DEFAULT_THUMB_HEIGHT = 180;
const GRID_PADDING = 16;
const GRID_LABEL_HEIGHT = 28;
const GRID_COLUMNS = 3;

function triggerDownload(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string): string {
	return (
		name
			.replace(/\s+/g, "_")
			.replace(/[^a-zA-Z0-9_\-一-龥]/g, "")
			.slice(0, 64) || "canvas"
	);
}

async function loadImage(src: string): Promise<HTMLImageElement | undefined> {
	return new Promise((resolve) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => resolve(img);
		img.onerror = () => resolve(undefined);
		img.src = src;
	});
}

function rasterizeToCanvas(
	img: HTMLImageElement,
	width: number,
	height: number,
): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) return canvas;
	ctx.fillStyle = "#f5f5f5";
	ctx.fillRect(0, 0, width, height);
	const ratio = Math.min(width / img.width, height / img.height);
	const drawWidth = img.width * ratio;
	const drawHeight = img.height * ratio;
	const dx = (width - drawWidth) / 2;
	const dy = (height - drawHeight) / 2;
	ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
	return canvas;
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob | undefined> {
	return new Promise((resolve) => {
		canvas.toBlob((blob) => resolve(blob ?? undefined), "image/png");
	});
}

/** Download a single canvas card's thumbnail as a PNG file. */
export async function exportSingleThumbnail(card: CanvasNode): Promise<void> {
	const thumbnail = card.data.thumbnail;
	if (!thumbnail) {
		throw new Error(`卡片 ${card.id} 没有 thumbnail`);
	}
	const img = await loadImage(thumbnail);
	if (!img) {
		throw new Error(`无法加载图片: ${thumbnail}`);
	}
	const canvas = rasterizeToCanvas(
		img,
		img.width || DEFAULT_THUMB_WIDTH,
		img.height || DEFAULT_THUMB_HEIGHT,
	);
	const blob = await canvasToPngBlob(canvas);
	if (!blob) {
		throw new Error("PNG 编码失败");
	}
	triggerDownload(blob, `${sanitizeFilename(card.data.title)}.png`);
}

export interface GridExportOptions {
	columns?: number;
	thumbWidth?: number;
	thumbHeight?: number;
	title?: string;
}

export interface GridExportResult {
	totalCards: number;
	renderedCards: number;
	skippedCards: number;
}

/** Render multiple canvas cards into a single PNG grid image and download it. */
export async function exportCanvasGrid(
	cards: CanvasNode[],
	options: GridExportOptions = {},
): Promise<GridExportResult> {
	const columns = Math.max(1, options.columns ?? GRID_COLUMNS);
	const thumbWidth = options.thumbWidth ?? DEFAULT_THUMB_WIDTH;
	const thumbHeight = options.thumbHeight ?? DEFAULT_THUMB_HEIGHT;
	const rows = Math.ceil(cards.length / columns);

	const cellWidth = thumbWidth + GRID_PADDING * 2;
	const cellHeight = thumbHeight + GRID_LABEL_HEIGHT + GRID_PADDING * 2;
	const totalWidth = cellWidth * columns;
	const totalHeight = cellHeight * rows;

	const canvas = document.createElement("canvas");
	canvas.width = totalWidth;
	canvas.height = totalHeight;
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("无法创建 Canvas 2D context");
	}

	// Background
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(0, 0, totalWidth, totalHeight);

	ctx.font = "14px system-ui, sans-serif";
	ctx.fillStyle = "#1f2937";
	ctx.textBaseline = "middle";

	let rendered = 0;
	let skipped = 0;

	for (let i = 0; i < cards.length; i++) {
		const card = cards[i];
		const col = i % columns;
		const row = Math.floor(i / columns);
		const cellX = col * cellWidth + GRID_PADDING;
		const cellY = row * cellHeight + GRID_PADDING;

		const thumbnail = card.data.thumbnail;
		if (thumbnail) {
			const img = await loadImage(thumbnail);
			if (img) {
				ctx.drawImage(img, cellX, cellY, thumbWidth, thumbHeight);
				rendered++;
			} else {
				drawPlaceholder(
					ctx,
					cellX,
					cellY,
					thumbWidth,
					thumbHeight,
					"image load failed",
				);
				skipped++;
			}
		} else {
			drawPlaceholder(
				ctx,
				cellX,
				cellY,
				thumbWidth,
				thumbHeight,
				"no thumbnail",
			);
			skipped++;
		}

		// Label
		ctx.fillStyle = "#1f2937";
		ctx.fillText(
			card.data.title,
			cellX,
			cellY + thumbHeight + GRID_LABEL_HEIGHT / 2,
		);
	}

	const blob = await canvasToPngBlob(canvas);
	if (!blob) {
		throw new Error("PNG 编码失败");
	}
	const filename = sanitizeFilename(options.title ?? "canvas-grid") + ".png";
	triggerDownload(blob, filename);

	return {
		totalCards: cards.length,
		renderedCards: rendered,
		skippedCards: skipped,
	};
}

function drawPlaceholder(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	message: string,
) {
	ctx.fillStyle = "#f5f5f5";
	ctx.fillRect(x, y, w, h);
	ctx.strokeStyle = "#d1d5db";
	ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
	ctx.fillStyle = "#9ca3af";
	ctx.font = "12px system-ui, sans-serif";
	ctx.textAlign = "center";
	ctx.fillText(message, x + w / 2, y + h / 2);
	ctx.textAlign = "start";
}
