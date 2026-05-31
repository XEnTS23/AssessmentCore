/**
 * Package Builder
 *
 * Responsible for:
 *   1. Invoking the correct format builder (JSON / QTI 2.1 / QTI 3.0).
 *   2. Validating every generated artifact.
 *   3. Optionally creating an in-browser ZIP blob for multi-file exports.
 *
 * ZIP creation uses the native CompressionStream API (supported in all modern
 * browsers) via a minimal hand-rolled implementation to avoid adding a large
 * dependency.  For QTI packages (multiple XML files + manifest) we produce a
 * real ZIP.  For JSON we just produce a single file download.
 */

import { QuestionRow } from '../core/rowTypes';
import { ExportConfig } from '../core/exportTypes';
import { BuildResult, GeneratedArtifact, BuildError, BuildWarning } from '../core/buildTypes';
import { buildJsonExport } from '../builders/jsonBuilder';
import { buildQti21Export } from '../builders/qti21Builder';
import { buildQti30Export } from '../builders/qti30Builder';
import {
  validateJsonArtifact,
  validateXmlArtifact,
  validateQti30Artifact,
} from './artifactValidator';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PackageFormat = 'single_file' | 'zip';

export interface PackageResult {
  buildResult: BuildResult;
  /** Validated artifacts (only those that passed validation). */
  validatedArtifacts: GeneratedArtifact[];
  /** Validation errors that blocked download. */
  validationErrors: BuildError[];
  /** Validation warnings (non-blocking). */
  validationWarnings: BuildWarning[];
  /** Final downloadable blob (may be null if validation failed). */
  downloadBlob: Blob | null;
  /** Suggested filename for the download. */
  downloadFileName: string;
  /** Whether all artifacts passed validation. */
  isDownloadReady: boolean;
}

// ─── Main Entry ───────────────────────────────────────────────────────────────

export async function buildAndPackage(
  rows: QuestionRow[],
  config: ExportConfig,
): Promise<PackageResult> {
  // 1. Build
  let buildResult: BuildResult;
  try {
    if (config.target === 'json' || config.target === 'custom_lms') {
      buildResult = buildJsonExport(rows, config);
    } else if (config.target === 'qti_2_1') {
      buildResult = buildQti21Export(rows, config);
    } else if (config.target === 'qti_3_0') {
      buildResult = buildQti30Export(rows, config);
    } else {
      buildResult = { success: false, artifacts: [], warnings: [], errors: [{ code: 'UNKNOWN_TARGET', message: `Unknown export target: ${config.target}` }] };
    }
  } catch (e: any) {
    buildResult = { success: false, artifacts: [], warnings: [], errors: [{ code: 'BUILD_EXCEPTION', message: e?.message ?? String(e) }] };
  }

  if (!buildResult.success || buildResult.artifacts.length === 0) {
    return {
      buildResult,
      validatedArtifacts: [],
      validationErrors: buildResult.errors,
      validationWarnings: buildResult.warnings,
      downloadBlob: null,
      downloadFileName: '',
      isDownloadReady: false,
    };
  }

  // 2. Validate each artifact
  const validationErrors: BuildError[] = [];
  const validationWarnings: BuildWarning[] = [];
  const validatedArtifacts: GeneratedArtifact[] = [];

  for (const artifact of buildResult.artifacts) {
    let result: { isValid: boolean; errors: BuildError[] };

    if (artifact.mimeType === 'application/json') {
      result = validateJsonArtifact(artifact);
    } else if (config.target === 'qti_3_0') {
      result = validateQti30Artifact(artifact);
    } else {
      result = validateXmlArtifact(artifact);
    }

    if (result.isValid) {
      validatedArtifacts.push(artifact);
    } else {
      validationErrors.push(...result.errors);
    }
  }

  const isDownloadReady = validationErrors.length === 0;

  // 3. Package into blob
  let downloadBlob: Blob | null = null;
  let downloadFileName = '';

  if (isDownloadReady) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    if (validatedArtifacts.length === 1) {
      // Single file
      const a = validatedArtifacts[0];
      downloadBlob = typeof a.data === 'string'
        ? new Blob([a.data], { type: a.mimeType })
        : a.data;
      downloadFileName = a.fileName;
    } else {
      // Multi-file → ZIP
      downloadBlob = await buildZipBlob(validatedArtifacts);
      downloadFileName = `assessment_export_${timestamp}.zip`;
    }
  }

  return {
    buildResult,
    validatedArtifacts,
    validationErrors,
    validationWarnings: [...buildResult.warnings, ...validationWarnings],
    downloadBlob,
    downloadFileName,
    isDownloadReady,
  };
}

// ─── Minimal ZIP Builder ──────────────────────────────────────────────────────
// Implements the ZIP local file + central directory structure manually.
// This avoids a large dependency (JSZip) for what is a straightforward use-case.

async function buildZipBlob(artifacts: GeneratedArtifact[]): Promise<Blob> {
  const encoder = new TextEncoder();
  const localHeaders: Uint8Array[] = [];
  const centralDirectories: Uint8Array[] = [];
  const offsets: number[] = [];

  let offset = 0;

  for (const artifact of artifacts) {
    const data: Uint8Array = typeof artifact.data === 'string'
      ? encoder.encode(artifact.data)
      : new Uint8Array(await (artifact.data as Blob).arrayBuffer());

    const nameBytes = encoder.encode(artifact.fileName);
    const crc = crc32(data);
    const localHeader = buildLocalFileHeader(nameBytes, data, crc);

    offsets.push(offset);
    localHeaders.push(localHeader);
    localHeaders.push(data);
    offset += localHeader.length + data.length;

    centralDirectories.push(buildCentralDirectoryHeader(nameBytes, data, crc, offsets[offsets.length - 1]));
  }

  const cdStart = offset;
  const cdSize = centralDirectories.reduce((s, b) => s + b.length, 0);
  const eocd = buildEndOfCentralDirectory(artifacts.length, cdSize, cdStart);

  return new Blob(
    [...localHeaders, ...centralDirectories, eocd] as BlobPart[],
    { type: 'application/zip' },
  );
}

// ─── ZIP primitives ───────────────────────────────────────────────────────────

function u16le(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >> 8) & 0xff]);
}
function u32le(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]);
}
function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const a of arrays) { out.set(a, pos); pos += a.length; }
  return out;
}

function buildLocalFileHeader(name: Uint8Array, data: Uint8Array, crc: number): Uint8Array {
  return concat(
    new Uint8Array([0x50, 0x4b, 0x03, 0x04]),   // signature
    u16le(20),      // version needed
    u16le(0),       // flags
    u16le(0),       // compression (stored)
    u16le(0),       // mod time
    u16le(0),       // mod date
    u32le(crc),
    u32le(data.length),
    u32le(data.length),
    u16le(name.length),
    u16le(0),       // extra field length
    name,
  );
}

function buildCentralDirectoryHeader(
  name: Uint8Array, data: Uint8Array, crc: number, localOffset: number,
): Uint8Array {
  return concat(
    new Uint8Array([0x50, 0x4b, 0x01, 0x02]),  // signature
    u16le(20),      // version made by
    u16le(20),      // version needed
    u16le(0),       // flags
    u16le(0),       // compression
    u16le(0),       // mod time
    u16le(0),       // mod date
    u32le(crc),
    u32le(data.length),
    u32le(data.length),
    u16le(name.length),
    u16le(0),       // extra
    u16le(0),       // comment
    u16le(0),       // disk start
    u16le(0),       // internal attrs
    u32le(0),       // external attrs
    u32le(localOffset),
    name,
  );
}

function buildEndOfCentralDirectory(
  count: number, cdSize: number, cdStart: number,
): Uint8Array {
  return concat(
    new Uint8Array([0x50, 0x4b, 0x05, 0x06]),  // signature
    u16le(0),           // disk number
    u16le(0),           // disk with CD
    u16le(count),
    u16le(count),
    u32le(cdSize),
    u32le(cdStart),
    u16le(0),           // comment length
  );
}

// ─── CRC-32 ──────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
