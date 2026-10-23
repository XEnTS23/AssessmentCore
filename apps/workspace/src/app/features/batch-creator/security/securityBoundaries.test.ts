import { describe, expect, it } from "vitest";
import {
  inspectPublicHttpUrl,
  normalizePublicHttpUrl,
} from "./publicUrlPolicy";
import { sanitizeMathMl } from "./safeMathMl";

describe("public URL policy", () => {
  it("normalizes public HTTP(S) URLs and removes fragments", () => {
    expect(
      normalizePublicHttpUrl(" https://example.com/image.png#preview "),
    ).toBe("https://example.com/image.png");
    expect(normalizePublicHttpUrl("http://cdn.example.com/graph.webp")).toBe(
      "http://cdn.example.com/graph.webp",
    );
  });

  it.each([
    "javascript:alert(1)",
    "data:image/svg+xml,<svg onload=alert(1)>",
    "https://user:secret@example.com/image.png",
    "http://localhost/image.png",
    "http://127.0.0.1/image.png",
    "http://10.0.0.5/image.png",
    "http://169.254.169.254/latest/meta-data",
    "http://[::1]/image.png",
    "https://service.internal/image.png",
  ])("rejects non-public or dangerous URL %s", (value) => {
    expect(inspectPublicHttpUrl(value).isAllowed).toBe(false);
  });
});

describe("strict MathML boundary", () => {
  it("preserves a safe MathML vocabulary", () => {
    const input =
      '<math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mi>x</mi><mn>2</mn></mfrac></math>';
    expect(sanitizeMathMl(input)).toEqual({
      content: input,
      isSafeMathMl: true,
    });
  });

  it.each([
    "<math><script>alert(1)</script><mi>x</mi></math>",
    '<math><mi onclick="alert(1)">x</mi></math>',
    '<math><mi style="background:url(javascript:alert(1))">x</mi></math>',
    '<math><annotation-xml encoding="text/html"><img src=x onerror=alert(1) /></annotation-xml></math>',
    '<!DOCTYPE math [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><math><mtext>&xxe;</mtext></math>',
  ])("escapes unsafe MathML instead of passing it through: %s", (input) => {
    const result = sanitizeMathMl(input);
    expect(result.isSafeMathMl).toBe(false);
    expect(result.content).not.toContain("<script");
    expect(result.content).not.toContain("<img");
  });
});
