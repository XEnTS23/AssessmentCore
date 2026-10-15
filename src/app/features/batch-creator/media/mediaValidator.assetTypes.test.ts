import { describe, expect, it } from "vitest";
import { validateMediaReference } from "./mediaValidator";

describe("media validation by asset type", () => {
  it("accepts common audio, video, and document extensions", () => {
    const fixtures = [
      ["audio", "https://example.com/prompt.mp3"],
      ["video", "https://example.com/demo.mp4"],
      ["document", "https://example.com/source.pdf"],
    ] as const;

    for (const [contentType, publicUrlSource] of fixtures) {
      const issues = validateMediaReference({
        id: contentType,
        contentType,
        publicUrlSource,
        role: "question_stem",
        status: "pending",
        altText: "Accessible description",
      });
      expect(issues.some((issue) => issue.severity === "block")).toBe(false);
    }
  });

  it("rejects an extension that does not match the selected asset type", () => {
    const issues = validateMediaReference({
      id: "bad-audio",
      contentType: "audio",
      publicUrlSource: "https://example.com/chart.png",
      role: "question_stem",
      status: "pending",
      altText: "Audio prompt",
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MEDIA_URL_UNSUPPORTED_EXTENSION",
          severity: "block",
        }),
      ]),
    );
  });
});
