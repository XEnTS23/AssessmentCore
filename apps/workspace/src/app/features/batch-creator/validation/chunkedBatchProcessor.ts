export interface ChunkProgress {
  processed: number;
  total: number;
  percent: number;
  chunkIndex: number;
}

export interface ChunkedBatchOptions {
  chunkSize: number;
  signal?: AbortSignal;
  onProgress?: (progress: ChunkProgress) => void;
  yieldControl?: () => Promise<void>;
}

export class BatchProcessingCancelledError extends Error {
  constructor() {
    super("Batch processing was cancelled.");
    this.name = "BatchProcessingCancelledError";
  }
}

function throwIfCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw new BatchProcessingCancelledError();
}

function defaultYieldControl(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export async function processInChunks<TInput, TOutput>(
  items: readonly TInput[],
  processChunk: (
    chunk: readonly TInput[],
    startIndex: number,
    signal?: AbortSignal,
  ) => readonly TOutput[] | Promise<readonly TOutput[]>,
  options: ChunkedBatchOptions,
): Promise<TOutput[]> {
  if (!Number.isSafeInteger(options.chunkSize) || options.chunkSize <= 0) {
    throw new TypeError("chunkSize must be a positive safe integer.");
  }

  const total = items.length;
  const outputs: TOutput[] = [];
  const yieldControl = options.yieldControl ?? defaultYieldControl;

  if (total === 0) {
    options.onProgress?.({
      processed: 0,
      total: 0,
      percent: 100,
      chunkIndex: 0,
    });
    return outputs;
  }

  let chunkIndex = 0;
  for (let start = 0; start < total; start += options.chunkSize) {
    throwIfCancelled(options.signal);

    const chunk = items.slice(
      start,
      Math.min(total, start + options.chunkSize),
    );
    const chunkOutput = await processChunk(chunk, start, options.signal);
    throwIfCancelled(options.signal);

    if (!Array.isArray(chunkOutput) || chunkOutput.length !== chunk.length) {
      throw new Error(
        `Chunk ${chunkIndex + 1} returned ${Array.isArray(chunkOutput) ? chunkOutput.length : "invalid"} results for ${chunk.length} inputs.`,
      );
    }
    outputs.push(...chunkOutput);

    const processed = Math.min(total, start + chunk.length);
    options.onProgress?.({
      processed,
      total,
      percent: Math.round((processed / total) * 100),
      chunkIndex,
    });

    chunkIndex += 1;
    if (processed < total) {
      await yieldControl();
    }
  }

  return outputs;
}
