import React, { useState } from "react";
import { MediaReference } from "../core/mediaTypes";
import { validateMediaUrl } from "./mediaValidator";
import { ImageOff, AlertCircle } from "lucide-react";

interface MediaPreviewProps {
  media: MediaReference;
  className?: string;
}

export function MediaPreview({ media, className = "" }: MediaPreviewProps) {
  const [hasError, setHasError] = useState(false);
  const issues = validateMediaUrl(media.publicUrlSource);
  const isBlocked = issues.some((i) => i.severity === "block");

  if (isBlocked) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-md border border-destructive/50 bg-destructive-light p-4 text-destructive ${className}`}
      >
        <ImageOff className="h-6 w-6 mb-2 opacity-80" />
        <span className="text-xs font-medium text-center">
          Invalid Media URL
        </span>
        <span
          className="text-[10px] text-center opacity-80 mt-1 line-clamp-2"
          title={media.publicUrlSource}
        >
          {media.publicUrlSource}
        </span>
      </div>
    );
  }

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-md border border-muted bg-muted/30 p-4 text-muted-foreground ${className}`}
      >
        <AlertCircle className="h-6 w-6 mb-2 opacity-80" />
        <span className="text-xs font-medium text-center">
          Failed to load image
        </span>
        <span
          className="text-[10px] text-center opacity-80 mt-1 line-clamp-2"
          title={media.publicUrlSource}
        >
          {media.publicUrlSource}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-md border border-border bg-muted/20 ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${media.publicUrlSource}${media.publicUrlSource.includes("?") ? "&" : "?"}t=${Date.now()}`}
        alt={media.altText || "Media preview"}
        className="h-full w-full object-contain"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
