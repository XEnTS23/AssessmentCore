import { ValidationIssue } from '../core/issueTypes';
import { MediaReference } from '../core/mediaTypes';

const SUPPORTED_PROTOCOLS = ['https:', 'http:'];
const SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];

export interface MediaValidationResult {
  code: string;
  severity: 'block' | 'review' | 'warning' | 'info';
  message: string;
}

export function validateMediaUrl(urlStr: string): MediaValidationResult[] {
  const issues: MediaValidationResult[] = [];
  
  if (!urlStr || urlStr.trim() === '') {
    return issues; // Empty handled elsewhere if required
  }

  try {
    const url = new URL(urlStr.trim());
    
    // Check protocol
    if (!SUPPORTED_PROTOCOLS.includes(url.protocol)) {
      issues.push({
        code: 'MEDIA_URL_UNSUPPORTED_PROTOCOL',
        message: `Unsupported protocol: ${url.protocol}. Only HTTP/HTTPS are supported.`,
        severity: 'block'
      });
    } else if (url.protocol === 'http:') {
      issues.push({
        code: 'MEDIA_URL_UNSUPPORTED_PROTOCOL',
        message: `HTTP protocol used. HTTPS is recommended for public media URLs.`,
        severity: 'warning'
      });
    }

    // Check extension if present in pathname
    const pathname = url.pathname.toLowerCase();
    const extMatch = pathname.match(/\.[a-z0-9]+$/);
    
    if (extMatch) {
      const ext = extMatch[0];
      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        issues.push({
          code: 'MEDIA_URL_UNSUPPORTED_EXTENSION',
          message: `Unsupported image format: ${ext}. Supported formats are PNG, JPG, JPEG, WEBP, SVG.`,
          severity: 'block'
        });
      } else if (ext === '.svg') {
        issues.push({
          code: 'MEDIA_URL_UNSUPPORTED_EXTENSION',
          message: `SVG format used. Ensure the target platform supports SVG images securely.`,
          severity: 'warning'
        });
      }
    }

    // Warn about general export compatibility for external URLs
    issues.push({
      code: 'MEDIA_PUBLIC_URL_EXPORT_COMPATIBILITY',
      message: `External URL provided. The image may need to be downloaded later to be embedded in an LMS export (like QTI) if external linking is blocked.`,
      severity: 'info'
    });

  } catch (e) {
    issues.push({
      code: 'MEDIA_URL_INVALID_FORMAT',
      message: `Invalid URL format: ${urlStr}`,
      severity: 'block'
    });
  }

  return issues;
}

export function validateMediaReference(ref: MediaReference): MediaValidationResult[] {
  const issues = validateMediaUrl(ref.publicUrlSource);
  
  if (!ref.altText || ref.altText.trim() === '') {
    issues.push({
      code: 'MEDIA_ALT_TEXT_MISSING_WARNING',
      message: `Missing alt text for image. Alt text is recommended for accessibility.`,
      severity: 'warning'
    });
  }
  
  return issues;
}
