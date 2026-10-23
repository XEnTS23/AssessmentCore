import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";

interface ImagePropertiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageEl: HTMLImageElement | null;
  onSave: (updates: {
    width: string;
    height: string;
    alt: string;
    title: string;
    src: string;
  }) => void;
}

export function ImagePropertiesModal({
  isOpen,
  onClose,
  imageEl,
  onSave,
}: ImagePropertiesModalProps) {
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [alt, setAlt] = useState("");
  const [title, setTitle] = useState("");
  const [src, setSrc] = useState("");

  useEffect(() => {
    if (imageEl && isOpen) {
      setWidth(imageEl.style.width || imageEl.getAttribute("width") || "");
      setHeight(imageEl.style.height || imageEl.getAttribute("height") || "");
      setAlt(imageEl.getAttribute("alt") || "");
      setTitle(imageEl.getAttribute("title") || "");
      setSrc(imageEl.getAttribute("src") || "");
    }
  }, [imageEl, isOpen]);

  if (!isOpen || !imageEl) return null;

  const handleSave = () => {
    onSave({ width, height, alt, title, src });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/35"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-xl border bg-background shadow-2xl">
        <header className="flex min-h-14 items-center justify-between border-b px-5">
          <h3 className="text-sm font-semibold">Image Properties</h3>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium">Width</span>
              <Input
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="e.g. 100px or 50%"
                className="h-9 text-sm"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium">Height</span>
              <Input
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="e.g. 100px or auto"
                className="h-9 text-sm"
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium">Alternative Text (Alt)</span>
            <Input
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Description for accessibility"
              className="h-9 text-sm"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium">Caption (Title)</span>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tooltip text"
              className="h-9 text-sm"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium">Image Source (URL)</span>
            <Input
              value={src}
              onChange={(e) => setSrc(e.target.value)}
              placeholder="https://..."
              className="h-9 text-sm"
            />
          </label>
        </div>

        <footer className="flex min-h-14 items-center justify-end gap-2 border-t px-5">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
        </footer>
      </div>
    </div>
  );
}
