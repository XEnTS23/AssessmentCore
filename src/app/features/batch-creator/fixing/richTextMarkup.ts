export interface SelectionEditResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export { normalizePublicHttpUrl } from "../security/publicUrlPolicy";

export function wrapTextSelection(
  value: string,
  start: number,
  end: number,
  open: string,
  close: string,
  placeholder = "text",
): SelectionEditResult {
  const selected = value.slice(start, end) || placeholder;
  const replacement = `${open}${selected}${close}`;
  const nextValue = value.slice(0, start) + replacement + value.slice(end);
  const contentStart = start + open.length;

  return {
    value: nextValue,
    selectionStart: contentStart,
    selectionEnd: contentStart + selected.length,
  };
}

export function insertAtSelection(
  value: string,
  start: number,
  end: number,
  content: string,
): SelectionEditResult {
  const nextValue = value.slice(0, start) + content + value.slice(end);
  const cursor = start + content.length;
  return { value: nextValue, selectionStart: cursor, selectionEnd: cursor };
}
