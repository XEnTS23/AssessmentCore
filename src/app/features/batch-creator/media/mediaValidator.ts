import { ValidationIssue } from "../core/issueTypes";
import { MediaReference } from "../core/mediaTypes";
import type { MediaContentType } from "../core/mediaTypes";
import { inspectPublicHttpUrl } from "../security/publicUrlPolicy";

const SUPPORTED_PROTOCOLS = ["https:", "http:"];
const SUPPORTED_EXTENSIONS: Record<MediaContentType, string[]> = {
  image: [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"],
  graph: [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"],
  diagram: [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"],
  equation_image: [".png", ".jpg", ".jpeg", ".webp", ".svg"],
  audio: [".mp3", ".wav", ".ogg", ".m4a", ".aac"],
  video: [".mp4", ".webm", ".mov", ".m4v", ".ogv"],
  document: [".pdf", ".doc", ".docx", ".ppt", ".pptx"],
};

export interface MediaValidationResult {
  code: string;
  severity: "block" | "review" | "warning" | "info";
  message: string;
}

export function validateMediaUrl(
  urlStr: string,
  contentType: MediaContentType = "image",
): MediaValidationResult[] {
  const issues: MediaValidationResult[] = [];

  if (!urlStr || urlStr.trim() === "") {
    return issues; // Empty handled elsewhere if required
  }

  const policy = inspectPublicHttpUrl(urlStr);
  if (!policy.isAllowed || !policy.normalizedUrl) {
    issues.push({
      code:
        policy.rejectionCode === "UNSUPPORTED_PROTOCOL"
          ? "MEDIA_URL_UNSUPPORTED_PROTOCOL"
          : policy.rejectionCode === "NON_PUBLIC_HOST"
            ? "MEDIA_URL_NON_PUBLIC_HOST"
            : "MEDIA_URL_INVALID_FORMAT",
      message: policy.message || "Invalid public media URL.",
      severity: "block",
    });
    return issues;
  }

  try {
    const url = new URL(policy.normalizedUrl);

    // Check protocol
    if (!SUPPORTED_PROTOCOLS.includes(url.protocol)) {
      issues.push({
        code: "MEDIA_URL_UNSUPPORTED_PROTOCOL",
        message: `Unsupported protocol: ${url.protocol}. Only HTTP/HTTPS are supported.`,
        severity: "block",
      });
    } else if (url.protocol === "http:") {
      issues.push({
        code: "MEDIA_URL_UNSUPPORTED_PROTOCOL",
        message: `HTTP protocol used. HTTPS is recommended for public media URLs.`,
        severity: "warning",
      });
    }

    // Check extension if present in pathname
    const pathname = url.pathname.toLowerCase();
    const extMatch = pathname.match(/\.[a-z0-9]+$/);

    if (extMatch) {
      const ext = extMatch[0];
      const supported = SUPPORTED_EXTENSIONS[contentType];
      if (!supported.includes(ext)) {
        issues.push({
          code: "MEDIA_URL_UNSUPPORTED_EXTENSION",
          message: `Unsupported ${contentType.replace("_", " ")} format: ${ext}. Supported extensions are ${supported.join(", ")}.`,
          severity: "block",
        });
      }
    }

    // Warn about general export compatibility for external URLs
    issues.push({
      code: "MEDIA_PUBLIC_URL_EXPORT_COMPATIBILITY",
      message: `External URL provided. The asset may need to be downloaded later for an LMS export if external linking is blocked.`,
      severity: "info",
    });
  } catch (e) {
    issues.push({
      code: "MEDIA_URL_INVALID_FORMAT",
      message: `Invalid URL format: ${urlStr}`,
      severity: "block",
    });
  }

  return issues;
}

export function validateMediaReference(
  ref: MediaReference,
): MediaValidationResult[] {
  const issues = validateMediaUrl(ref.publicUrlSource, ref.contentType || "image");

  if (!ref.altText || ref.altText.trim() === "") {
    issues.push({
      code: "MEDIA_ALT_TEXT_MISSING_WARNING",
      message: `Missing accessibility description for asset. A description or transcript reference is recommended.`,
      severity: "warning",
    });
  }

  return issues;
}
