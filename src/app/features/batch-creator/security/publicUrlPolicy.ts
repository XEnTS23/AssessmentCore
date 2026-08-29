export type PublicUrlRejectionCode =
  | "EMPTY_URL"
  | "URL_TOO_LONG"
  | "INVALID_URL"
  | "UNSUPPORTED_PROTOCOL"
  | "CREDENTIALS_NOT_ALLOWED"
  | "NON_PUBLIC_HOST";

export interface PublicUrlPolicyResult {
  isAllowed: boolean;
  normalizedUrl?: string;
  rejectionCode?: PublicUrlRejectionCode;
  message?: string;
}

export const MAX_PUBLIC_URL_LENGTH = 2_048;

function parseIpv4(hostname: string): number[] | null {
  const parts = hostname.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part)))
    return null;
  const octets = parts.map(Number);
  return octets.every((part) => part >= 0 && part <= 255) ? octets : null;
}

function isNonPublicIpv4([a, b]: number[]): boolean {
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0) ||
    a >= 224
  );
}

function isNonPublicIpv6(hostname: string): boolean {
  const value = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!value.includes(":")) return false;
  if (value === "::" || value === "::1") return true;
  if (
    value.startsWith("fe8") ||
    value.startsWith("fe9") ||
    value.startsWith("fea") ||
    value.startsWith("feb")
  )
    return true;
  if (value.startsWith("fc") || value.startsWith("fd")) return true;
  const mapped = value.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? isNonPublicIpv4(parseIpv4(mapped[1]) || [0, 0, 0, 0]) : false;
}

function isNonPublicHostname(hostname: string): boolean {
  const host = hostname.replace(/\.$/, "").toLowerCase();
  const ipv4 = parseIpv4(host);
  if (ipv4) return isNonPublicIpv4(ipv4);
  if (isNonPublicIpv6(host)) return true;
  if (!host.includes(".")) return true;
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".home.arpa")
  );
}

export function inspectPublicHttpUrl(value: string): PublicUrlPolicyResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      isAllowed: false,
      rejectionCode: "EMPTY_URL",
      message: "Enter a URL.",
    };
  }
  if (trimmed.length > MAX_PUBLIC_URL_LENGTH) {
    return {
      isAllowed: false,
      rejectionCode: "URL_TOO_LONG",
      message: `The URL exceeds the ${MAX_PUBLIC_URL_LENGTH.toLocaleString()} character limit.`,
    };
  }
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) {
    return {
      isAllowed: false,
      rejectionCode: "INVALID_URL",
      message: "The URL contains control characters.",
    };
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return {
        isAllowed: false,
        rejectionCode: "UNSUPPORTED_PROTOCOL",
        message: "Only HTTP and HTTPS URLs are supported.",
      };
    }
    if (url.username || url.password) {
      return {
        isAllowed: false,
        rejectionCode: "CREDENTIALS_NOT_ALLOWED",
        message: "URLs containing embedded credentials are not allowed.",
      };
    }
    if (isNonPublicHostname(url.hostname)) {
      return {
        isAllowed: false,
        rejectionCode: "NON_PUBLIC_HOST",
        message: "Local, private-network, and reserved hosts are not allowed.",
      };
    }
    url.hash = "";
    return { isAllowed: true, normalizedUrl: url.toString() };
  } catch {
    return {
      isAllowed: false,
      rejectionCode: "INVALID_URL",
      message: "Enter a valid absolute URL.",
    };
  }
}

export function normalizePublicHttpUrl(value: string): string | null {
  const result = inspectPublicHttpUrl(value);
  return result.isAllowed ? result.normalizedUrl || null : null;
}
