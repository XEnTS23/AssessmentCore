import { describe, expect, it } from "vitest";

import {
  BatchProcessingCancelledError,
  processInChunks,
} from "./chunkedBatchProcessor";

describe("processInChunks", () => {
  it("preserves order and reports monotonic progress", async () => {
    const progress: number[] = [];
    const starts: number[] = [];
    const result = await processInChunks(
      [1, 2, 3, 4, 5],
      (chunk, start) => {
        starts.push(start);
        return chunk.map((value) => value * 2);
      },
      {
        chunkSize: 2,
        yieldControl: async () => undefined,
        onProgress: (update) => progress.push(update.percent),
      },
    );

    expect(result).toEqual([2, 4, 6, 8, 10]);
    expect(starts).toEqual([0, 2, 4]);
    expect(progress).toEqual([40, 80, 100]);
  });

  it("cancels between chunks without returning partial output", async () => {
    const controller = new AbortController();
    let processedChunks = 0;

    await expect(
      processInChunks(
        [1, 2, 3, 4],
        (chunk) => {
          processedChunks += 1;
          return [...chunk];
        },
        {
          chunkSize: 2,
          signal: controller.signal,
          yieldControl: async () => undefined,
          onProgress: () => controller.abort(),
        },
      ),
    ).rejects.toBeInstanceOf(BatchProcessingCancelledError);

    expect(processedChunks).toBe(1);
  });

  it("does not start when already cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    let called = false;

    await expect(
      processInChunks(
        [1],
        (chunk) => {
          called = true;
          return [...chunk];
        },
        { chunkSize: 1, signal: controller.signal },
      ),
    ).rejects.toBeInstanceOf(BatchProcessingCancelledError);

    expect(called).toBe(false);
  });

  it("rejects invalid chunk output and invalid chunk sizes", async () => {
    await expect(
      processInChunks([1, 2], () => [1], { chunkSize: 2 }),
    ).rejects.toThrow("returned 1 results for 2 inputs");

    await expect(
      processInChunks([1], (chunk) => [...chunk], { chunkSize: 0 }),
    ).rejects.toThrow("chunkSize must be a positive safe integer");
  });

  it("handles an empty batch as completed work", async () => {
    const progress: number[] = [];
    const result = await processInChunks([], (chunk) => [...chunk], {
      chunkSize: 10,
      onProgress: (update) => progress.push(update.percent),
    });

    expect(result).toEqual([]);
    expect(progress).toEqual([100]);
  });
});
