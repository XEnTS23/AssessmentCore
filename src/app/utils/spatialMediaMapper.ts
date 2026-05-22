import type { OCRResult } from '../../services/ocrService';

// ── Public Types ────────────────────────────────────────────────────────────────

/**
 * A text block representing a question region on the page.
 * Coordinates are normalized 0.0–1.0 relative to the page image.
 */
export interface TextBlock {
  /** Index into the original questions array. */
  questionIndex: number;
  /** Top edge of the question text region. */
  y_min: number;
  /** Bottom edge of the question text region. */
  y_max: number;
  /** The media URL assigned by spatial mapping (initially undefined). */
  media_url?: string;
}

/**
 * An image block representing a diagram/figure on the page.
 * Coordinates are normalized 0.0–1.0 relative to the page image.
 */
export interface ImageBlock {
  /** Public URL or storage reference for the image. */
  url: string;
  /** Top edge of the image region. */
  y_min: number;
  /** Bottom edge of the image region. */
  y_max: number;
}

/**
 * The result of spatial mapping: a question with its auto-mapped media URL.
 */
export interface SpatiallyMappedQuestion {
  questionIndex: number;
  stem: string;
  stem_box?: [number, number, number, number];
  options: string[];
  diagrams: OCRResult['questions'][number]['diagrams'];
  /** The auto-mapped media URL from spatial analysis. Null if no image matched. */
  media_url: string | null;
}

// ── Core Spatial Mapping Algorithm ──────────────────────────────────────────────

/**
 * Deterministic spatial mapping: assigns images to the nearest preceding text
 * block based on strict Y-coordinate math.
 *
 * **Algorithm:**
 * 1. Sort `textBlocks` top-to-bottom by `y_min`.
 * 2. Sort `imageBlocks` top-to-bottom by `y_min`.
 * 3. For each image block, find the text block `n` where:
 *    - `imageBlock.y_min >= textBlocks[n].y_max`  (image starts after text ends)
 *    - `imageBlock.y_min < textBlocks[n+1].y_min`  (image starts before next text)
 *    If the image is after the last text block, assign to that last block.
 *    If the image is before all text blocks, assign to the first.
 * 4. Assign `textBlocks[n].media_url = imageBlock.url`.
 *
 * When multiple images map to the same text block, the first (topmost) image wins.
 */
export function mapImagesToQuestions(
  textBlocks: TextBlock[],
  imageBlocks: ImageBlock[],
): TextBlock[] {
  if (textBlocks.length === 0) return [];
  if (imageBlocks.length === 0) return textBlocks.map((tb) => ({ ...tb }));

  // Deep-copy to avoid mutation.
  const sortedTextBlocks = textBlocks
    .map((tb) => ({ ...tb }))
    .sort((a, b) => a.y_min - b.y_min);

  const sortedImageBlocks = [...imageBlocks].sort((a, b) => a.y_min - b.y_min);

  for (const img of sortedImageBlocks) {
    const ownerIndex = findOwnerTextBlockIndex(sortedTextBlocks, img.y_min);

    // Only assign if no image has been assigned yet (first image wins per block).
    if (ownerIndex >= 0 && !sortedTextBlocks[ownerIndex].media_url) {
      sortedTextBlocks[ownerIndex].media_url = img.url;
    }
  }

  return sortedTextBlocks;
}

/**
 * Finds the index of the text block that "owns" a given Y-coordinate.
 *
 * The owner is the text block `n` where:
 *   - `y >= textBlocks[n].y_max`  AND
 *   - `y < textBlocks[n+1].y_min` (or n is the last block)
 *
 * Edge cases:
 *   - If y is before the first text block's y_max, assign to block 0.
 *   - If y is after the last text block, assign to the last block.
 */
function findOwnerTextBlockIndex(sortedTextBlocks: TextBlock[], y: number): number {
  const len = sortedTextBlocks.length;
  if (len === 0) return -1;

  // Image is above or overlapping the first question — assign to first.
  if (y < sortedTextBlocks[0].y_max) {
    return 0;
  }

  // Walk from bottom to top: find the text block whose y_max is <= y
  // and which precedes the next text block.
  for (let n = len - 1; n >= 0; n--) {
    if (y >= sortedTextBlocks[n].y_max) {
      return n;
    }
  }

  // Fallback to first block.
  return 0;
}

// ── Convenience Wrapper for OCR Results ─────────────────────────────────────────

/**
 * Takes raw OCR results (with stem_box and diagram boxes) and returns
 * an array of questions with `media_url` populated by spatial mapping.
 *
 * For questions that lack `stem_box` (e.g. from older OCR runs or free-tier),
 * falls back to sequential index-based positioning with even spacing.
 */
export function mapOCRDiagramsToQuestions(
  ocrResult: OCRResult,
): SpatiallyMappedQuestion[] {
  const questions = ocrResult.questions ?? [];
  if (questions.length === 0) return [];

  // Build text blocks from stem_box.
  const textBlocks: TextBlock[] = questions.map((q, idx) => {
    if (q.stem_box && q.stem_box.length === 4) {
      return {
        questionIndex: idx,
        y_min: q.stem_box[0],
        y_max: q.stem_box[2], // stem_box is [y_min, x_min, y_max, x_max]
      };
    }

    // Fallback: distribute evenly if no bounding box.
    const totalQuestions = questions.length;
    const segmentHeight = 1.0 / totalQuestions;
    return {
      questionIndex: idx,
      y_min: idx * segmentHeight,
      y_max: (idx + 1) * segmentHeight,
    };
  });

  // Build image blocks from all diagrams across all questions.
  const imageBlocks: ImageBlock[] = [];
  for (const q of questions) {
    for (const diagram of q.diagrams ?? []) {
      const url = diagram.url || '';
      if (!url) continue; // Skip diagrams without URLs.
      if (diagram.box && diagram.box.length === 4) {
        imageBlocks.push({
          url,
          y_min: diagram.box[0],
          y_max: diagram.box[2],
        });
      }
    }
  }

  // Run spatial mapping.
  const mapped = mapImagesToQuestions(textBlocks, imageBlocks);

  // Build lookup: questionIndex -> media_url.
  const mediaMap = new Map<number, string>();
  for (const tb of mapped) {
    if (tb.media_url) {
      mediaMap.set(tb.questionIndex, tb.media_url);
    }
  }

  // Return enriched questions.
  return questions.map((q, idx) => ({
    questionIndex: idx,
    stem: q.stem,
    stem_box: q.stem_box,
    options: q.options,
    diagrams: q.diagrams,
    media_url: mediaMap.get(idx) ?? null,
  }));
}

// ── IoU Utility ─────────────────────────────────────────────────────────────────

/**
 * Axis-Aligned Bounding Box: [y_min, x_min, y_max, x_max], normalized 0..1.
 */
export type AABB = [number, number, number, number];

/**
 * Calculates the Intersection over Union (IoU) ratio for two axis-aligned
 * bounding boxes expressed as [y_min, x_min, y_max, x_max] (normalized 0..1).
 *
 * **Algorithm:**
 * 1. Compute the intersection rectangle by taking the max of top-left coords
 *    and the min of bottom-right coords.
 * 2. Calculate the intersection area (clamped to 0 if no overlap).
 * 3. Divide by the union area (areaA + areaB − intersection).
 *
 * @returns A value in [0, 1] where 0 = no overlap, 1 = identical boxes.
 */
export function calculateIoU(boxA: AABB, boxB: AABB): number {
  const interYMin = Math.max(boxA[0], boxB[0]);
  const interXMin = Math.max(boxA[1], boxB[1]);
  const interYMax = Math.min(boxA[2], boxB[2]);
  const interXMax = Math.min(boxA[3], boxB[3]);

  const interWidth = Math.max(0, interXMax - interXMin);
  const interHeight = Math.max(0, interYMax - interYMin);
  const interArea = interWidth * interHeight;

  if (interArea === 0) return 0;

  const areaA = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]);
  const areaB = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]);
  const unionArea = areaA + areaB - interArea;

  return unionArea <= 0 ? 0 : interArea / unionArea;
}

// ── Reading-Order Sort ──────────────────────────────────────────────────────────

/**
 * An element with spatial coordinates that can be sorted into reading order.
 */
export interface SortableElement {
  /** Arbitrary index or identifier. */
  index: number;
  /** Top edge of the element (normalized 0..1). */
  y_min: number;
  /** Left edge of the element (normalized 0..1). */
  x_min: number;
}

/**
 * Sorts elements into natural reading order: top-to-bottom, left-to-right.
 *
 * Elements within the same horizontal band (±yTolerance) are treated as
 * belonging to the same "row" and sorted by their X position.
 *
 * @param elements  Array of sortable elements.
 * @param yTolerance  Vertical tolerance for row grouping (default 0.02 = 2%).
 * @returns A new sorted array (does not mutate the input).
 */
export function sortByReadingOrder<T extends SortableElement>(
  elements: T[],
  yTolerance = 0.02,
): T[] {
  return [...elements].sort((a, b) => {
    if (Math.abs(a.y_min - b.y_min) < yTolerance) {
      return a.x_min - b.x_min;
    }
    return a.y_min - b.y_min;
  });
}

