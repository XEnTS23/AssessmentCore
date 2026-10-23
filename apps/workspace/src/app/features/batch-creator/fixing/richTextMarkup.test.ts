import { describe, expect, it } from "vitest";
import { renderRichContent } from "../builders/shared/richContentRenderer";
import {
  insertAtSelection,
  normalizePublicHttpUrl,
  wrapTextSelection,
} from "./richTextMarkup";

describe("contextual rich-text markup", () => {
  it("wraps selected text and preserves a useful selection", () => {
    expect(wrapTextSelection("Hello world", 6, 11, "[b]", "[/b]")).toEqual({
      value: "Hello [b]world[/b]",
      selectionStart: 9,
      selectionEnd: 14,
    });
  });

  it("inserts content at the current selection", () => {
    expect(insertAtSelection("Solve: ", 7, 7, "$x^2$").value).toBe(
      "Solve: $x^2$",
    );
  });

  it("accepts only public HTTP(S) links", () => {
    expect(normalizePublicHttpUrl("https://example.com/image.png")).toBe(
      "https://example.com/image.png",
    );
    expect(normalizePublicHttpUrl("javascript:alert(1)")).toBeNull();
  });

  it("renders only the supported safe formatting vocabulary", () => {
    const output = renderRichContent(
      "[b]Bold[/b] [i]Italic[/i] [u]Underline[/u] [font=serif]Serif[/font] [size=large]Large[/size]",
      "latex",
    );

    expect(output).toContain("<strong>Bold</strong>");
    expect(output).toContain("<em>Italic</em>");
    expect(output).toContain("<u>Underline</u>");
    expect(output).toContain("font-family: Georgia, serif");
    expect(output).toContain("font-size: 1.2em");

    const formattedMath = renderRichContent("[b]Use $x^2$ here[/b]", "latex");
    expect(formattedMath).toContain(
      '<strong>Use <span class="math">$x^2$</span> here</strong>',
    );

    const media = renderRichContent(
      "[MEDIA:https://example.com/graph.png|Quadratic graph]",
      "latex",
    );
    expect(media).toContain('alt="Quadratic graph"');
  });
  it("preserves sanitized Manual Fix assets in generated rich content", () => {
    const output = renderRichContent(
      [
        '<img src="https://example.com/diagram.png" alt="A diagram" title="Detailed diagram" width="320" height="180" style="width: 320px; border-radius: 12px; object-fit: contain; background-image: url(javascript:alert(1))" />',
        '<audio controls src="https://example.com/audio.mp3" aria-label="Audio clue" title="Listen carefully" style="width: 75%"></audio>',
        '<video controls src="https://example.com/video.mp4" aria-label="Video clue" poster="https://example.com/poster.png" style="width: 640px; height: 360px"></video>',
        '<a href="https://example.com/guide.pdf" target="_blank" title="Open study guide">Study guide</a>',
      ].join(""),
      "latex",
    );

    expect(output).toContain('<img src="https://example.com/diagram.png"');
    expect(output).toContain('title="Detailed diagram"');
    expect(output).toContain("width: 320px");
    expect(output).toContain("height: 180px");
    expect(output).toContain("border-radius: 12px");
    expect(output).toContain("object-fit: contain");
    expect(output).not.toContain("background-image");
    expect(output).toContain(
      '<audio controls="controls" src="https://example.com/audio.mp3"',
    );
    expect(output).toContain('title="Listen carefully"');
    expect(output).toContain("width: 75%");
    expect(output).toContain(
      '<video controls="controls" src="https://example.com/video.mp4"',
    );
    expect(output).toContain('poster="https://example.com/poster.png"');
    expect(output).toContain("width: 640px");
    expect(output).toContain("height: 360px");
    expect(output).toContain('<a href="https://example.com/guide.pdf"');
    expect(output).toContain('title="Open study guide"');
    expect(output).not.toContain("&lt;audio");

    const unsafe = renderRichContent(
      '<audio controls src="javascript:alert(1)"></audio>',
      "latex",
    );
    expect(unsafe).not.toContain('<audio controls="controls"');
  });

  it("renders Manual Fix tables without leaked markup or structural whitespace", () => {
    const output = renderRichContent(
      [
        'What is the capital of India?<div class="editor-block"><table border="1" style="border-collapse: collapse; border-color: #cccccc; width: 360px;">',
        "  <colgroup>",
        '    <col style="width: 120px;" />',
        '    <col style="width: 120px;" />',
        '    <col style="width: 120px;" />',
        "  </colgroup>",
        "  <tbody>",
        '    <tr style="height: 45px;">',
        '      <td style="background-color: #f3f4f6; border-color: #cccccc; border-width: 1px; width: 120px; height: 45px; padding: 8px">Header 1</td>',
        '      <td colspan="2" onclick="alert(1)" style="width: 240px; padding: 8px">Header 2</td>',
        "    </tr>",
        "  </tbody>",
        "</table></div>",
      ].join("\n"),
      "latex",
    );

    expect(output).toContain("What is the capital of India?<table");
    expect(output).toContain("width: 360px");
    expect(output).toContain("<colgroup>");
    expect(output).toContain('<col style="width: 120px" />');
    expect(output).toContain("<tbody><tr");
    expect(output).toContain("height: 45px");
    expect(output).toContain("width: 240px");
    expect(output).toContain("Header 1</td><td");
    expect(output).not.toContain("&lt;col");
    expect(output).not.toContain("<br />");
    expect(output).not.toContain("onclick");
    expect(output).not.toContain("&lt;div");
    expect(output).not.toContain("<div");
  });
});
