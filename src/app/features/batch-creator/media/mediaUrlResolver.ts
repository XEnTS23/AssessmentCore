import { MediaReference, MediaRole } from "../core/mediaTypes";
import { validateMediaUrl } from "./mediaValidator";
import { QuestionRow } from "../core/rowTypes";

export interface MediaColumnMapping {
  mediaUrlColumn?: string;
  defaultRole?: MediaRole;
}

/**
 * Extracts a media URL from a raw row and creates a MediaReference object.
 * Does NOT inject it into the question stem HTML.
 * Associates it with question_stem by default unless specified.
 */
export function resolveMediaReferences(
  rawRow: Record<string, any>,
  mapping: MediaColumnMapping,
): MediaReference[] {
  const references: MediaReference[] = [];

  if (!mapping.mediaUrlColumn || !rawRow[mapping.mediaUrlColumn]) {
    return references;
  }

  const urlStr = String(rawRow[mapping.mediaUrlColumn]).trim();
  if (urlStr === "") {
    return references;
  }

  // Basic validation check to see if it's completely invalid before creating
  // (We still create it even if invalid, so the validator can flag it later in the UI)

  const newRef: MediaReference = {
    id: crypto.randomUUID(),
    publicUrlSource: urlStr,
    role: mapping.defaultRole || "question_stem",
    status: "pending", // Will be resolved when validated or downloaded
    altText: `Image for ${mapping.defaultRole || "question_stem"}`, // Placeholder alt text
  };

  references.push(newRef);

  return references;
}

/**
 * Convenience function to apply media references to an existing QuestionRow
 */
export function attachMediaToRow(
  row: QuestionRow,
  mapping: MediaColumnMapping,
): QuestionRow {
  const mediaRefs = resolveMediaReferences(row.rawRow, mapping);

  return {
    ...row,
    mediaReferences: [...(row.mediaReferences || []), ...mediaRefs],
  };
}
