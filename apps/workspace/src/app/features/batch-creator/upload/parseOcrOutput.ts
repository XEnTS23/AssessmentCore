import {
  getLatestOCRExport,
  downloadOCRExport,
} from "../../../../services/ocrService";
import { parseXlsx } from "./parseXlsx";
import { RawSheetRow } from "../core/rowTypes";

export interface ParseOcrOptions {
  userId: string;
  onSuccess: (data: {
    columns: string[];
    rawRows: RawSheetRow[];
    fileName: string;
  }) => void;
  onError: (error: Error) => void;
}

export async function parseOcrOutput({
  userId,
  onSuccess,
  onError,
}: ParseOcrOptions): Promise<void> {
  try {
    const latestExport = await getLatestOCRExport(userId);
    if (!latestExport) {
      throw new Error(
        "No recent OCR export found for your account. Please run OCR Processor first.",
      );
    }

    const blob = await downloadOCRExport(latestExport);
    const file = new File(
      [blob],
      latestExport.export_file_name || "ocr_export.xlsx",
      {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    );

    parseXlsx({
      file,
      onSuccess: (data) => {
        onSuccess({
          ...data,
          fileName: latestExport.export_file_name || "ocr_export.xlsx",
        });
      },
      onError,
    });
  } catch (err: any) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}
