import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from './supabaseClient';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const processOcrFunctionUrl = `${supabaseUrl}/functions/v1/process-ocr`;

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export type NormalizedBox = [number, number, number, number]; // [y_min, x_min, y_max, x_max]
export type CropCoordinates = [number, number, number, number]; // [y, x, h, w] percentages

export interface ManualCrop {
  id: string;
  coordinates: CropCoordinates;
  type: 'stem' | 'option';
  optionLabel?: 'A' | 'B' | 'C' | 'D';
  /** 1-based question number for deterministic diagram assignment */
  questionNumber?: number;
  /**
   * Zero-based page index.
   * Page 1 = 0, Page 2 = 1, etc.
   */
  pageIndex?: number;
}

export interface OCRDiagram {
  id?: string;
  box: NormalizedBox;
  description: string;
  url?: string;
  source?: 'manual_crop' | 'model';
  role?: 'stem' | 'option';
  optionLabel?: 'A' | 'B' | 'C' | 'D';
  pageIndex?: number;
  originalPageIndex?: number;
  assignment?: {
    confidence: number;
    reason: string;
  };
}

export interface OCRQuestion {
  stem: string;
  stem_box?: NormalizedBox;
  pageIndex?: number;
  options: string[];
  diagrams: OCRDiagram[];
  media_url?: string;
  media_urls?: string[];
  layout_warning?: string;
}

export interface OCRDiagramReviewItem {
  cropId: string;
  cropUrl: string;
  pageIndex?: number;
  originalPageIndex?: number;
  assignedQuestionIndex?: number;
  confidence?: number;
  reason: string;
  message?: string;
}

export interface MistralNativeImage {
  id: string;
  top_left_x: number;
  top_left_y: number;
  bottom_right_x: number;
  bottom_right_y: number;
}

export interface PageDimensions {
  width: number;
  height: number;
  dpi: number;
}

export interface OCRResult {
  questions: OCRQuestion[];
  diagram_review_items?: OCRDiagramReviewItem[];
  /** Native image bounding boxes extracted by the Mistral OCR endpoint. */
  mistral_native_images?: MistralNativeImage[];
  /** Pixel dimensions of the page as reported by Mistral OCR. */
  page_dimensions?: PageDimensions | null;
}

/**
 * Internal helper:
 * For PDF processing, the Edge Function receives one rendered page image at a time.
 * So we send only the crops that belong to that page.
 *
 * Inside the Edge Function, that page image is treated as pageIndex 0.
 * We preserve originalPageIndex so the frontend can still display the real PDF page.
 */
function getCropsForPage(manualCrops: ManualCrop[], pageIndex: number): Array<ManualCrop & { originalPageIndex: number }> {
  return (manualCrops || [])
    .filter((crop) => {
      const cropPage = crop.pageIndex ?? 0;
      return cropPage === pageIndex;
    })
    .map((crop) => ({
      ...crop,
      pageIndex: 0,
      originalPageIndex: crop.pageIndex ?? pageIndex,
    }));
}

function applyRealPageIndexToResult(result: OCRResult, pageIndex: number): OCRResult {
  const questions = (result.questions || []).map((question) => ({
    ...question,
    pageIndex,
    diagrams: (question.diagrams || []).map((diagram) => ({
      ...diagram,
      pageIndex,
      originalPageIndex: diagram.originalPageIndex ?? pageIndex,
    })),
  }));

  const diagramReviewItems = (result.diagram_review_items || []).map((item) => ({
    ...item,
    pageIndex,
    originalPageIndex: item.originalPageIndex ?? pageIndex,
  }));

  return {
    ...result,
    questions,
    diagram_review_items: diagramReviewItems,
  };
}

function mergeOCRResults(results: OCRResult[]): OCRResult {
  return {
    questions: results.flatMap((result) => result.questions || []),
    diagram_review_items: results.flatMap((result) => result.diagram_review_items || []),
  };
}

export const processOCRImage = async (
  imageBase64: string,
  filename: string,
  manualCrops: ManualCrop[] = [],
  pageIndex = 0
): Promise<OCRResult> => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const token = session?.access_token || supabaseAnonKey;
    const pageCrops = getCropsForPage(manualCrops, pageIndex);

    const response = await fetch(processOcrFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        imageBase64,
        filename,
        manualCrops: pageCrops,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Edge Function Failed (Status ${response.status}):`, errorText);
      throw new Error(`Edge Function Error: ${errorText}`);
    }

    const data = (await response.json()) as OCRResult;
    return applyRealPageIndexToResult(data, pageIndex);
  } catch (error) {
    console.error(`Error processing image ${filename}:`, error);
    throw error;
  }
};

/**
 * Recommended high-level function.
 *
 * Use this from your upload flow instead of manually looping outside.
 * It supports:
 * - Single images
 * - Multi-page PDFs
 * - pageIndex-aware manual crops
 */
export const processOCRFile = async (
  file: File,
  manualCrops: ManualCrop[] = []
): Promise<OCRResult> => {
  const isPdf =
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    const pageImages = await convertPDFToImages(file);
    const pageResults: OCRResult[] = [];

    for (let pageIndex = 0; pageIndex < pageImages.length; pageIndex += 1) {
      const pageFilename = `${file.name.replace(/\.pdf$/i, '')}_page_${pageIndex + 1}.jpg`;

      const pageResult = await processOCRImage(
        pageImages[pageIndex],
        pageFilename,
        manualCrops,
        pageIndex
      );

      pageResults.push(pageResult);
    }

    return mergeOCRResults(pageResults);
  }

  const imageBase64 = await convertImageToBase64(file);
  return processOCRImage(imageBase64, file.name, manualCrops, 0);
};

/**
 * Converts a PDF file into an array of base64 image strings per page.
 */
export const convertPDFToImages = async (file: File): Promise<string[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdfDocument.numPages;
  const images: string[] = [];

  for (let pageNumber = 1; pageNumber <= numPages; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) continue;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport,
      canvas,
    }).promise;

    const base64Data = canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
    images.push(base64Data);
  }

  return images;
};

/**
 * Helper to convert standard image File to Base64.
 */
export const convertImageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };

    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export interface OCRStats {
  total_pages: number;
  total_questions: number;
}

export interface OCRHistoryRecord {
  user_id: string;
  export_file_name: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  source_file_name: string | null;
  source_file_type: string | null;
  total_pages: number;
  total_questions_extracted: number;
  extraction_status: string;
  created_at: string;
  updated_at: string;
}

export interface OCRExtractedDiagramRecord {
  id: string;
  user_id: string;
  run_id: string;
  question_number: number;
  question_id: string | null;
  source_page_label: string | null;
  diagram_index: number;
  description: string | null;
  box: NormalizedBox | null;
  storage_bucket: string;
  storage_path: string;
  public_url: string;
  created_at: string;
}

export interface OCRExtractedDiagramUpload {
  questionNumber: number;
  questionId?: string;
  sourcePageLabel?: string;
  diagramIndex: number;
  description?: string;
  box?: NormalizedBox;
  fileName: string;
  blob: Blob;
}

const OCR_EXPORT_BUCKET = import.meta.env.VITE_SUPABASE_OCR_BUCKET || 'ocr-exports';
const OCR_DIAGRAM_BUCKET = import.meta.env.VITE_SUPABASE_OCR_DIAGRAM_BUCKET || 'ocr-diagrams';

function getOCRExportPath(userId: string): string {
  return `${userId}/latest.xlsx`;
}

function getOCRDiagramBasePath(userId: string): string {
  return `${userId}/latest`;
}

function sanitizeStorageSegment(value: string): string {
  const cleaned = String(value || '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '_');

  return cleaned || `asset_${Date.now()}`;
}

async function clearLatestOCRDiagrams(userId: string) {
  try {
    await supabase
      .from('ocr_extracted_diagrams')
      .delete()
      .eq('user_id', userId);
  } catch (error) {
    console.warn('Could not clear old OCR diagram metadata:', error);
  }

  try {
    const basePath = getOCRDiagramBasePath(userId);

    const { data, error } = await supabase.storage
      .from(OCR_DIAGRAM_BUCKET)
      .list(basePath, {
        limit: 1000,
      });

    if (error) {
      console.warn('Could not list old OCR diagram files:', error.message);
      return;
    }

    const filePaths = (data || [])
      .filter((entry) => entry.name)
      .map((entry) => `${basePath}/${entry.name}`);

    if (filePaths.length > 0) {
      const { error: removeError } = await supabase.storage
        .from(OCR_DIAGRAM_BUCKET)
        .remove(filePaths);

      if (removeError) {
        console.warn('Could not remove old OCR diagram files:', removeError.message);
      }
    }
  } catch (error) {
    console.warn('Failed while cleaning OCR diagram files:', error);
  }
}

/**
 * Fetch OCR extraction statistics for the current user.
 */
export const getUserOCRStats = async (userId: string): Promise<OCRStats> => {
  try {
    const { data, error } = await supabase
      .from('ocr_history')
      .select('total_pages, total_questions_extracted')
      .eq('user_id', userId)
      .eq('extraction_status', 'completed');

    if (error) {
      console.error('Error fetching OCR stats:', error);
      return {
        total_pages: 0,
        total_questions: 0,
      };
    }

    if (!data || data.length === 0) {
      return {
        total_pages: 0,
        total_questions: 0,
      };
    }

    return data.reduce(
      (acc, record) => ({
        total_pages: acc.total_pages + (record.total_pages || 0),
        total_questions: acc.total_questions + (record.total_questions_extracted || 0),
      }),
      {
        total_pages: 0,
        total_questions: 0,
      }
    );
  } catch (error) {
    console.error('Error in getUserOCRStats:', error);

    return {
      total_pages: 0,
      total_questions: 0,
    };
  }
};

export const getLatestOCRExport = async (userId: string): Promise<OCRHistoryRecord | null> => {
  try {
    const { data, error } = await supabase
      .from('ocr_history')
      .select('*')
      .eq('user_id', userId)
      .eq('extraction_status', 'completed')
      .order('updated_at', {
        ascending: false,
      })
      .limit(1);

    if (error) {
      console.error('Error fetching latest OCR export:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const latest = data[0] as OCRHistoryRecord;

    if (!latest.storage_bucket || !latest.storage_path) {
      return null;
    }

    return latest;
  } catch (error) {
    console.error('Error in getLatestOCRExport:', error);
    return null;
  }
};

async function insertOrReplaceLatestOCRRecord(payload: Record<string, unknown>) {
  console.log('=== Attempting OCR Record Insert/Replace ===');
  console.log('Payload:', payload);
  console.log('User ID in payload:', payload.user_id);

  const insertResult = await supabase
    .from('ocr_history')
    .insert(payload)
    .select('*')
    .single();

  if (!insertResult.error) {
    console.log('✓ Insert succeeded');
    return insertResult;
  }

  console.error('Insert failed with error:', insertResult.error);

  if (!/duplicate key|violates unique constraint/i.test(insertResult.error.message)) {
    return insertResult;
  }

  console.log('Detected duplicate key, attempting UPDATE...');

  const updateResult = await supabase
    .from('ocr_history')
    .update(payload)
    .eq('user_id', payload.user_id)
    .select('*')
    .single();

  if (!updateResult.error) {
    console.log('✓ Update succeeded');
  } else {
    console.error('Update also failed:', updateResult.error);
  }

  return updateResult;
}

export const saveOCRHistory = async (params: {
  userId: string;
  totalPages: number;
  totalQuestions: number;
  sourceFileName?: string;
  sourceFileType?: string;
}): Promise<OCRHistoryRecord> => {
  const now = new Date().toISOString();

  const basePayload = {
    user_id: params.userId,
    source_file_name: params.sourceFileName ?? null,
    source_file_type: params.sourceFileType ?? null,
    total_pages: params.totalPages,
    total_questions_extracted: params.totalQuestions,
    extraction_status: 'completed',
    updated_at: now,
  };

  let { data, error } = await insertOrReplaceLatestOCRRecord({
    ...basePayload,
    export_file_name: null,
    storage_bucket: null,
    storage_path: null,
  });

  if (error && /schema cache|export_file_name|storage_bucket|storage_path/i.test(error.message)) {
    ({ data, error } = await insertOrReplaceLatestOCRRecord(basePayload));
  }

  if (error) {
    throw new Error(`Failed to save OCR history: ${error.message}`);
  }

  return data as OCRHistoryRecord;
};

export const saveLatestOCRExport = async (params: {
  userId: string;
  fileName: string;
  blob: Blob;
  totalPages: number;
  totalQuestions: number;
  sourceFileName?: string;
  sourceFileType?: string;
}): Promise<OCRHistoryRecord> => {
  const storagePath = getOCRExportPath(params.userId);
  const now = new Date().toISOString();

  const { error: uploadError } = await supabase.storage
    .from(OCR_EXPORT_BUCKET)
    .upload(storagePath, params.blob, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to store OCR export: ${uploadError.message}`);
  }

  const { data, error } = await insertOrReplaceLatestOCRRecord({
    user_id: params.userId,
    export_file_name: params.fileName,
    storage_bucket: OCR_EXPORT_BUCKET,
    storage_path: storagePath,
    source_file_name: params.sourceFileName ?? null,
    source_file_type: params.sourceFileType ?? null,
    total_pages: params.totalPages,
    total_questions_extracted: params.totalQuestions,
    extraction_status: 'completed',
    updated_at: now,
  });

  if (error) {
    throw new Error(`Failed to save OCR export metadata: ${error.message}`);
  }

  return data as OCRHistoryRecord;
};

export const saveLatestOCRExtractedDiagrams = async (params: {
  userId: string;
  diagrams: OCRExtractedDiagramUpload[];
}): Promise<OCRExtractedDiagramRecord[]> => {
  if (!params.userId) {
    throw new Error('userId is required to save OCR diagrams');
  }

  await clearLatestOCRDiagrams(params.userId);

  if (!params.diagrams || params.diagrams.length === 0) {
    return [];
  }

  const runId = crypto.randomUUID();
  const basePath = getOCRDiagramBasePath(params.userId);
  const rowsToInsert: Array<Record<string, unknown>> = [];

  for (let index = 0; index < params.diagrams.length; index += 1) {
    const diagram = params.diagrams[index];
    const safeFileName = sanitizeStorageSegment(diagram.fileName);
    const storagePath = `${basePath}/${String(index + 1).padStart(4, '0')}_${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(OCR_DIAGRAM_BUCKET)
      .upload(storagePath, diagram.blob, {
        contentType: diagram.blob.type || 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload OCR diagram ${diagram.fileName}: ${uploadError.message}`);
    }

    const { data: publicData } = supabase.storage
      .from(OCR_DIAGRAM_BUCKET)
      .getPublicUrl(storagePath);

    rowsToInsert.push({
      user_id: params.userId,
      run_id: runId,
      question_number: diagram.questionNumber,
      question_id: diagram.questionId ?? null,
      source_page_label: diagram.sourcePageLabel ?? null,
      diagram_index: diagram.diagramIndex,
      description: diagram.description ?? null,
      box: diagram.box ?? null,
      storage_bucket: OCR_DIAGRAM_BUCKET,
      storage_path: storagePath,
      public_url: publicData.publicUrl,
    });
  }

  const insertedData: OCRExtractedDiagramRecord[] = [];
  
  for (const row of rowsToInsert) {
    const { data, error } = await supabase
      .from('ocr_extracted_diagrams')
      .insert(row)
      .select('*')
      .single();

    if (error) {
      console.error('Individual diagram insert failed:', error);
      continue;
    }

    if (data) {
      insertedData.push(data as OCRExtractedDiagramRecord);
    }
    
    // Stagger webhook firing to prevent overwhelming the microservice
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  return insertedData;
};

export const getLatestOCRExtractedDiagrams = async (
  userId: string
): Promise<OCRExtractedDiagramRecord[]> => {
  const { data, error } = await supabase
    .from('ocr_extracted_diagrams')
    .select('*')
    .eq('user_id', userId)
    .order('question_number', {
      ascending: true,
    })
    .order('diagram_index', {
      ascending: true,
    });

  if (error) {
    console.error('Failed to fetch OCR extracted diagrams:', error);
    return [];
  }

  return (data || []) as OCRExtractedDiagramRecord[];
};

export const downloadOCRExport = async (record: OCRHistoryRecord): Promise<Blob> => {
  if (!record.storage_bucket || !record.storage_path) {
    throw new Error('OCR export is missing storage references.');
  }

  const { data, error } = await supabase.storage
    .from(record.storage_bucket)
    .download(record.storage_path);

  if (error) {
    throw new Error(`Failed to download OCR export: ${error.message}`);
  }

  return data;
};