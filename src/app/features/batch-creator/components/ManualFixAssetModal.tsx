import { useMemo, useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  Link,
  Loader2,
  Music2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import type { MediaContentType } from "../core/mediaTypes";
import { normalizePublicHttpUrl } from "../security/publicUrlPolicy";
import { uploadMediaFilesToSupabase } from "../../../../services/mediaUploadService";

export interface ManualFixAsset {
  url: string;
  altText: string;
  contentType: MediaContentType;
}

interface Props {
  isOpen: boolean;
  onClose(): void;
  onAddAsset(asset: ManualFixAsset): void;
  existingMedia?: ManualFixAsset[];
}

const ASSET_TYPES: Array<{
  type: MediaContentType;
  label: string;
  icon: typeof ImageIcon;
  accept: string;
}> = [
  {
    type: "image",
    label: "Image",
    icon: ImageIcon,
    accept: ".jpg,.jpeg,.png,.webp,.gif",
  },
  {
    type: "graph",
    label: "Graph",
    icon: ImageIcon,
    accept: ".jpg,.jpeg,.png,.webp,.gif",
  },
  {
    type: "diagram",
    label: "Diagram",
    icon: ImageIcon,
    accept: ".jpg,.jpeg,.png,.webp,.gif",
  },
  {
    type: "equation_image",
    label: "Equation image",
    icon: ImageIcon,
    accept: ".jpg,.jpeg,.png,.webp",
  },
  {
    type: "audio",
    label: "Audio",
    icon: Music2,
    accept: ".mp3,.wav,.ogg,.m4a,.aac",
  },
  {
    type: "video",
    label: "Video",
    icon: Video,
    accept: ".mp4,.webm,.mov,.m4v,.ogv",
  },
  {
    type: "document",
    label: "Document",
    icon: FileText,
    accept: ".pdf,.doc,.docx,.ppt,.pptx",
  },
];

export function ManualFixAssetModal({ isOpen, onClose, onAddAsset, existingMedia = [] }: Props) {
  const [source, setSource] = useState<"url" | "upload">("upload");
  const [contentType, setContentType] = useState<MediaContentType>("image");
  const [url, setUrl] = useState("");
  const [altText, setAltText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const selectedType = useMemo(
    () => ASSET_TYPES.find((candidate) => candidate.type === contentType)!,
    [contentType],
  );

  if (!isOpen) return null;

  const resetAndClose = () => {
    setUrl("");
    setAltText("");
    setFile(null);
    setError("");
    onClose();
  };

  const addFromUrl = () => {
    const normalized = normalizePublicHttpUrl(url);
    if (!normalized) {
      setError("Enter a valid public HTTP or HTTPS URL.");
      return;
    }
    onAddAsset({
      url: normalized,
      altText: altText.trim(),
      contentType,
    });
    resetAndClose();
  };

  const uploadFile = async () => {
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    setIsUploading(true);
    setError("");
    try {
      const files = new Map([
        [
          file.name,
          {
            filename: file.name,
            data: await file.arrayBuffer(),
            type: file.type || "application/octet-stream",
          },
        ],
      ]);
      const [uploaded] = await uploadMediaFilesToSupabase(files);
      if (!uploaded?.publicUrl)
        throw new Error("Upload returned no public URL.");
      onAddAsset({
        url: uploaded.publicUrl,
        altText: altText.trim() || file.name,
        contentType,
      });
      resetAndClose();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The asset upload failed.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-fix-asset-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/35"
        onClick={resetAndClose}
        aria-label="Close asset dialog"
      />
      <div className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl">
        <header className="flex min-h-14 items-center justify-between border-b px-5">
          <div>
            <h3 id="manual-fix-asset-title" className="text-sm font-semibold">
              Insert asset
            </h3>
            <p className="text-[10px] text-muted-foreground">
              Media are supporting content. Response interactions are configured
              separately in the Response card.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={resetAndClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="overflow-y-auto p-5">
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold">Asset type</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ASSET_TYPES.map((assetType) => (
                <button
                  key={assetType.type}
                  type="button"
                  onClick={() => {
                    setContentType(assetType.type);
                    setFile(null);
                    setError("");
                  }}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border p-2 text-[10px] font-medium ${
                    contentType === assetType.type
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <assetType.icon className="h-4 w-4" />
                  {assetType.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mt-5 flex rounded-lg border p-1">
            <button
              type="button"
              className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded text-xs ${
                source === "url" ? "bg-primary text-primary-foreground" : ""
              }`}
              onClick={() => setSource("url")}
            >
              <Link className="h-3.5 w-3.5" />
              From URL
            </button>
            <button
              type="button"
              className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded text-xs ${
                source === "upload" ? "bg-primary text-primary-foreground" : ""
              }`}
              onClick={() => setSource("upload")}
            >
              <Upload className="h-3.5 w-3.5" />
              Upload
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {source === "url" ? (
              <label className="block space-y-1.5">
                <span className="text-xs font-medium">
                  {selectedType.label} URL
                </span>
                <Input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://..."
                  className="h-9 text-sm"
                />
              </label>
            ) : (
              <>
                <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center hover:bg-muted/40">
                  <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
                  <span className="text-xs font-medium">
                    {file
                      ? file.name
                      : `Choose ${selectedType.label.toLowerCase()}`}
                  </span>
                  <span className="mt-1 text-[10px] text-muted-foreground">
                    Uploaded securely to your question-media folder
                  </span>
                  <input
                    type="file"
                    accept={selectedType.accept}
                    className="hidden"
                    onChange={(event) => {
                      setFile(event.target.files?.[0] || null);
                      setError("");
                    }}
                  />
                </label>

                {(() => {
                  const IMAGE_TYPES = ["image", "graph", "diagram", "equation_image"];
                  const isImage = IMAGE_TYPES.includes(contentType);
                  const filteredMedia = existingMedia.filter((m) =>
                    isImage
                      ? IMAGE_TYPES.includes(m.contentType)
                      : m.contentType === contentType
                  );

                  if (filteredMedia.length === 0) return null;

                  return (
                    <div className="mt-4 border-t pt-4">
                      <h4 className="text-xs font-semibold mb-3">Previously used in this batch</h4>
                      <div className="grid grid-cols-4 gap-3 max-h-[160px] overflow-y-auto pr-1">
                        {filteredMedia.map((m, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setSource("url");
                            setUrl(m.url);
                            setAltText(m.altText || "");
                          }}
                          className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted/30 hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                          title={m.altText || m.url}
                        >
                          {contentType === "image" || contentType === "equation_image" || contentType === "graph" || contentType === "diagram" ? (
                            <img src={m.url} alt={m.altText || ""} className="h-full w-full object-contain p-1" />
                          ) : contentType === "audio" ? (
                            <div className="flex h-full w-full items-center justify-center">
                              <Music2 className="h-6 w-6 text-muted-foreground" />
                            </div>
                          ) : contentType === "video" ? (
                            <div className="flex h-full w-full items-center justify-center">
                              <Video className="h-6 w-6 text-muted-foreground" />
                            </div>
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <FileText className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 text-[9px] text-white opacity-0 group-hover:opacity-100 transition-opacity truncate">
                            {m.url.split('/').pop()}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  );
                })()}
              </>
            )}

            <label className="block space-y-1.5">
              <span className="text-xs font-medium">
                Accessibility description
              </span>
              <Input
                value={altText}
                onChange={(event) => setAltText(event.target.value)}
                placeholder={
                  contentType === "audio" || contentType === "video"
                    ? "Describe the content; provide transcript details when available"
                    : "Describe the asset for learners using assistive technology"
                }
                className="h-9 text-sm"
              />
            </label>
            {error && (
              <p className="rounded border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                {error}
              </p>
            )}
          </div>
        </div>

        <footer className="flex min-h-14 items-center justify-end gap-2 border-t px-5">
          <Button type="button" variant="outline" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              isUploading || (source === "url" ? !url.trim() : file === null)
            }
            onClick={source === "url" ? addFromUrl : uploadFile}
          >
            {isUploading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {source === "url" ? "Insert asset" : "Upload and insert"}
          </Button>
        </footer>
      </div>
    </div>
  );
}
