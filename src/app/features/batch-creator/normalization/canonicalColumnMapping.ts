import { ColumnMapping } from "./normalizeAnswer";
import { inferColumnMapping } from "./autoColumnMapping";

export type CanonicalColumnMapping = ColumnMapping;

export interface MappingMetadata {
  version: string;
  hash: string;
}

export const COLUMN_MAPPING_VERSION = "1.0.0";

function stableMappingJson(mapping: ColumnMapping): string {
  const entries = Object.entries(mapping)
    .filter(([, value]) => value !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => [key, Array.isArray(value) ? [...value] : value]);
  return JSON.stringify(Object.fromEntries(entries));
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function getMappingMetadata(
  mapping: CanonicalColumnMapping,
): MappingMetadata {
  return Object.freeze({
    version: COLUMN_MAPPING_VERSION,
    hash: fnv1a(stableMappingJson(mapping)),
  });
}

export function createCanonicalColumnMapping(
  availableColumns: string[],
): CanonicalColumnMapping {
  const inferred = inferColumnMapping(availableColumns);
  if (inferred.options) Object.freeze(inferred.options);
  return Object.freeze(inferred);
}
