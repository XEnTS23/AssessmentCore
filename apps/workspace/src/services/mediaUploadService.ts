import { MediaFile, sanitizeMediaFilename } from "../app/utils/mediaUtils";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

export interface UploadedMediaUrl {
  fileName: string;
  serialNumber: number | null;
  storagePath: string;
  publicUrl: string;
}

const DEFAULT_BUCKET =
  import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || "question-media";

function extractSerialNumber(fileName: string): number | null {
  const baseName = sanitizeMediaFilename(fileName).replace(/\.[^.]+$/, "");
  const match = baseName.match(/(\d+)(?!.*\d)/);
  if (!match) return null;

  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? value : null;
}

function sanitizeStorageFileName(fileName: string): string {
  const clean = sanitizeMediaFilename(fileName)
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!clean) return `asset_${Date.now()}.bin`;

  const extensionIndex = clean.lastIndexOf(".");
  if (extensionIndex <= 0) return clean;

  return `${clean.slice(0, extensionIndex)}${clean.slice(extensionIndex).toLowerCase()}`;
}

export function buildMediaStorageBasePath(
  userId: string,
  now: Date = new Date(),
): string {
  const timestamp = now.toISOString();
  const dateSegment = timestamp.slice(0, 10);
  const runSegment = timestamp.replace(/[:.]/g, "-");
  return `${userId}/uploads/${dateSegment}/${runSegment}`;
}

export async function uploadMediaFilesToSupabase(
  mediaFiles: Map<string, MediaFile>,
  bucketName: string = DEFAULT_BUCKET,
): Promise<UploadedMediaUrl[]> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase environment variables are missing");
  }

  if (mediaFiles.size === 0) {
    return [];
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("You must be signed in to upload media.");
  }

  // Storage RLS scopes every object to the authenticated user's top-level folder.
  const basePath = buildMediaStorageBasePath(user.id);

  const uploaded: UploadedMediaUrl[] = [];
  let index = 0;

  for (const mediaFile of mediaFiles.values()) {
    index += 1;

    const safeFileName = sanitizeStorageFileName(mediaFile.filename);
    const storagePath = `${basePath}/${String(index).padStart(3, "0")}_${safeFileName}`;

    const payload =
      mediaFile.data instanceof Uint8Array
        ? mediaFile.data
        : new Uint8Array(mediaFile.data);

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, payload, {
        contentType: mediaFile.type || "application/octet-stream",
        upsert: false,
      });

    if (error) {
      throw new Error(
        `Failed to upload ${mediaFile.filename}: ${error.message}. ` +
          `Check bucket "${bucketName}" exists and Storage policies allow uploads.`,
      );
    }

    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(storagePath);

    uploaded.push({
      fileName: mediaFile.filename,
      serialNumber: extractSerialNumber(mediaFile.filename),
      storagePath,
      publicUrl: data.publicUrl,
    });
  }

  uploaded.sort((a, b) => {
    if (a.serialNumber == null && b.serialNumber == null) {
      return a.fileName.localeCompare(b.fileName);
    }
    if (a.serialNumber == null) return 1;
    if (b.serialNumber == null) return -1;
    if (a.serialNumber !== b.serialNumber)
      return a.serialNumber - b.serialNumber;
    return a.fileName.localeCompare(b.fileName);
  });

  return uploaded;
}
