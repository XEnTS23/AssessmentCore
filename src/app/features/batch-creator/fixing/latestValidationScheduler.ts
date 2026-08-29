export interface LatestValidationHandlers<TResult> {
  onStart(): void;
  onComplete(result: TResult): void;
  onError(error: unknown): void;
}

export interface LatestValidationScheduler<TInput, TResult> {
  schedule(input: TInput, handlers: LatestValidationHandlers<TResult>): void;
  cancel(): void;
  dispose(): void;
}

/**
 * Debounces validation and guarantees that only the newest scheduled run can
 * publish a result. This also protects callers if validation later becomes
 * asynchronous (for example, media or remote schema checks).
 */
export function createLatestValidationScheduler<TInput, TResult>(
  validate: (input: TInput) => TResult | Promise<TResult>,
  delayMs: number,
): LatestValidationScheduler<TInput, TResult> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let generation = 0;
  let disposed = false;

  const cancel = () => {
    generation += 1;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return {
    schedule(input, handlers) {
      if (disposed) return;

      cancel();
      const scheduledGeneration = generation;
      handlers.onStart();

      timer = setTimeout(
        async () => {
          timer = null;
          try {
            const result = await validate(input);
            if (!disposed && generation === scheduledGeneration) {
              handlers.onComplete(result);
            }
          } catch (error) {
            if (!disposed && generation === scheduledGeneration) {
              handlers.onError(error);
            }
          }
        },
        Math.max(0, delayMs),
      );
    },
    cancel,
    dispose() {
      disposed = true;
      cancel();
    },
  };
}
