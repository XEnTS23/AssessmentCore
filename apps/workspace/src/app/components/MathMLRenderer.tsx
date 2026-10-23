import { useEffect, useRef } from "react";
import DOMPurify from "dompurify";

interface MathMLRendererProps {
  content: string;
  className?: string;
  inline?: boolean;
}

/**
 * Component that renders HTML content containing MathML.
 * Sets innerHTML so that any <math> elements are preserved by the browser.
 */
export function MathMLRenderer({
  content,
  className = "",
  inline = false,
}: MathMLRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!content) {
      el.innerHTML = "";
      return;
    }

    // Sanitize before injection — allow MathML/SVG elements, strip all event handlers and dangerous tags
    const clean = DOMPurify.sanitize(content, {
      USE_PROFILES: { mathMl: true, svg: true, html: true },
      FORBID_TAGS: [
        "script",
        "style",
        "iframe",
        "object",
        "embed",
        "form",
        "input",
        "textarea",
        "base",
        "link",
        "meta",
      ],
    });
    el.innerHTML = clean;
  }, [content]);

  const Tag = inline ? "span" : "div";

  return (
    <Tag
      ref={containerRef as any}
      className={`qti-rendered-content ${className}`.trim()}
      style={{ wordWrap: "break-word", overflowWrap: "break-word" }}
    />
  );
}
