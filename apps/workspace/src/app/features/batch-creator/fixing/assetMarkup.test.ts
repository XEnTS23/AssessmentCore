import { describe, expect, it } from "vitest";
import { buildAssetMarkup } from "./assetMarkup";

describe("Manual Fix asset markup", () => {
  it("creates accessible audio, video, document, and image markup", () => {
    expect(
      buildAssetMarkup({
        url: "https://example.com/prompt.mp3",
        altText: "Spoken prompt",
        contentType: "audio",
      }),
    ).toContain("<audio controls");
    expect(
      buildAssetMarkup({
        url: "https://example.com/demo.mp4",
        altText: "Experiment demonstration",
        contentType: "video",
      }),
    ).toContain("<video controls");
    expect(
      buildAssetMarkup({
        url: "https://example.com/source.pdf",
        altText: "Source document",
        contentType: "document",
      }),
    ).toContain('rel="noopener noreferrer"');
    expect(
      buildAssetMarkup({
        url: "https://example.com/chart.png",
        altText: "Bar chart",
        contentType: "graph",
      }),
    ).toContain('alt="Bar chart"');
  });

  it("escapes asset attributes", () => {
    const markup = buildAssetMarkup({
      url: 'https://example.com/a.png?x="bad"',
      altText: '<script>alert("x")</script>',
      contentType: "image",
    });

    expect(markup).not.toContain("<script>");
    expect(markup).toContain("&quot;");
    expect(markup).toContain("&lt;script&gt;");
  });
});
