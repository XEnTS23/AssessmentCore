import React, { useState, useRef, useCallback } from 'react';
import { Upload, Trash2, ImagePlus, Loader2, X, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { supabase } from '../../services/supabaseClient';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

// ── Constants ───────────────────────────────────────────────────────────────────

const OCR_DIAGRAM_BUCKET = import.meta.env.VITE_SUPABASE_OCR_DIAGRAM_BUCKET || 'ocr-diagrams';
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ── Props ───────────────────────────────────────────────────────────────────────

export interface MediaOverrideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current media URL for the row, or null if empty. */
  mediaUrl: string | null;
  /** Unique row identifier. */
  rowId: string;
  /** Human-readable row label (e.g. "Row 3"). */
  rowLabel?: string;
  /** Callback to update media for a specific row (local state + optional DB). */
  onMediaUpdate: (rowId: string, newUrl: string | null) => void;
}

// ── Component ───────────────────────────────────────────────────────────────────

export function MediaOverrideModal({
  open,
  onOpenChange,
  mediaUrl,
  rowId,
  rowLabel,
  onMediaUpdate,
}: MediaOverrideModalProps) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Upload Handler ──────────────────────────────────────────────────────────

  const handleUpload = useCallback(
    async (file: File) => {
      if (!user?.id) {
        toast.error('You must be signed in to upload media.');
        return;
      }

      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast.error('Unsupported file type. Use JPEG, PNG, or WebP.');
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error('File exceeds 10 MB limit.');
        return;
      }

      setIsUploading(true);

      try {
        const timestamp = Date.now();
        const sanitized = file.name
          .replace(/\s+/g, '_')
          .replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${user.id}/overrides/${timestamp}_${sanitized}`;

        const { error: uploadError } = await supabase.storage
          .from(OCR_DIAGRAM_BUCKET)
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        const { data: publicData } = supabase.storage
          .from(OCR_DIAGRAM_BUCKET)
          .getPublicUrl(storagePath);

        const publicUrl = publicData.publicUrl;
        onMediaUpdate(rowId, publicUrl);
        toast.success('Image uploaded and mapped.');
      } catch (err) {
        console.error('Media upload error:', err);
        toast.error(err instanceof Error ? err.message : 'Upload failed.');
      } finally {
        setIsUploading(false);
      }
    },
    [user?.id, rowId, onMediaUpdate],
  );

  // ── Delete Handler ──────────────────────────────────────────────────────────

  const handleDelete = useCallback(() => {
    onMediaUpdate(rowId, null);
    toast.success('Media asset removed from this row.');
  }, [rowId, onMediaUpdate]);

  // ── Drag & Drop ─────────────────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const file = e.dataTransfer?.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
      // Reset so the same file can be re-selected.
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [handleUpload],
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ImagePlus className="h-4.5 w-4.5 text-muted-foreground" />
            Media Asset {rowLabel ? `— ${rowLabel}` : ''}
          </DialogTitle>
          <DialogDescription>
            Preview, replace, or remove the image mapped to this question row.
          </DialogDescription>
        </DialogHeader>

        {/* ── Preview ──────────────────────────────────────────────────── */}
        <div className="mt-1">
          {mediaUrl ? (
            <div className="relative group overflow-hidden rounded-lg border border-border bg-muted/30">
              <a 
                href={mediaUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block cursor-zoom-in"
                title="Click to view full size"
              >
                <img
                  src={mediaUrl}
                  alt="Mapped media preview"
                  className="w-full max-h-[420px] object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                  loading="lazy"
                />
              </a>
              
              {/* Overlay Actions */}
              <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <a
                  href={mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur-sm shadow-sm hover:bg-background transition-colors"
                  title="Open in new tab"
                >
                  <Eye className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/90 text-white shadow-sm hover:bg-destructive transition-colors"
                  title="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20">
              <div className="text-center">
                <ImagePlus className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No image mapped to this row
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Drop Zone / File Input ───────────────────────────────────── */}
        <div
          className={`mt-3 flex min-h-[100px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/40 hover:bg-muted/30'
          } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
          />
          {isUploading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading…
            </div>
          ) : (
            <>
              <Upload className="h-5 w-5 text-muted-foreground/60" />
              <p className="mt-1.5 text-xs font-medium text-muted-foreground">
                {mediaUrl ? 'Drop a replacement image' : 'Drop an image here'}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground/60">
                JPEG, PNG, WebP · Max 10 MB
              </p>
            </>
          )}
        </div>

        {/* ── Footer Actions ───────────────────────────────────────────── */}
        <DialogFooter className="mt-2">
          {mediaUrl && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              className="mr-auto"
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Delete Asset
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
