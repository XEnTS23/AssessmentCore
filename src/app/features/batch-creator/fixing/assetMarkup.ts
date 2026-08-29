import type { MediaContentType } from "../core/mediaTypes";

export interface InsertedAsset {
  url: string;
  altText: string;
  contentType: MediaContentType;
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildAssetMarkup(asset: InsertedAsset): string {
  const url = escapeAttribute(asset.url);
  const description = escapeAttribute(asset.altText || "Attached media");

  if (asset.contentType === "audio") {
    return `<audio controls src="${url}" aria-label="${description}"></audio>`;
  }
  if (asset.contentType === "video") {
    return `<video controls src="${url}" aria-label="${description}" style="max-width: 100%; height: auto;"></video>`;
  }
  if (asset.contentType === "document") {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${description}</a>`;
  }
  return `<img src="${url}" alt="${description}" style="max-width: 100%; height: auto; border-radius: 8px;" />`;
}
