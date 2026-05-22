import React, { useState, useRef } from 'react';
import { useLocation } from 'react-router';
import {
  Database,
  Download,
  FileCode2,
  FileSpreadsheet,
  FileText,
  FileUp,
  Image as ImageIcon,
  Loader2,
  ScanText,
  Settings2,
  Sparkles,
  TableProperties,
  X,
} from 'lucide-react';
import { processOCRImage, convertPDFToImages, convertImageToBase64, OCRResult } from '../../../services/ocrService';
import { MathMLRenderer } from '../../components/MathMLRenderer';
import { convertTextWithMath } from '../../utils/mathmlConverter';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Navbar } from '../../components/Navbar';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'sonner';
import { saveLatestOCRExport, saveOCRHistory, saveLatestOCRExtractedDiagrams } from '../../../services/ocrService';
import { DiagramPreCrop, CropBox } from '../../components/DiagramPreCrop';
import { generateLatexDocument } from '../../utils/latexExporter';

type OCRProcessedPage = { filename: string; base64: string; data: OCRResult };

export default function OCRProcessor() {
  const location = useLocation();
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<{ filename: string, data: OCRResult }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'markdown'>('preview');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-cropping state
  const [isPreCropping, setIsPreCropping] = useState(false);
  const [preCropQueue, setPreCropQueue] = useState<{ filename: string; base64: string }[]>([]);
  const [currentPreCropIndex, setCurrentPreCropIndex] = useState(0);
  const [manualCrops, setManualCrops] = useState<Record<string, CropBox[]>>({});
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const buildExcelBlob = async (exportResults: { filename: string; data: OCRResult }[]) => {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('OCR Results');

    let maxOptions = 0;
    exportResults.forEach((res) => {
      res.data.questions?.forEach((question) => {
        if (question.options && question.options.length > maxOptions) {
          maxOptions = question.options.length;
        }
      });
    });

    const headers = ['Source File', 'Question Stem'];
    for (let index = 0; index < maxOptions; index++) {
      headers.push(`Option ${String.fromCharCode(65 + index)}`);
    }
    headers.push('Diagrams', 'Stem Box');

    worksheet.addRow(headers);
    worksheet.getRow(1).font = { bold: true };

    exportResults.forEach((res) => {
      res.data.questions?.forEach((question) => {
        const row = [res.filename, question.stem || ''];

        for (let index = 0; index < maxOptions; index++) {
          row.push(question.options && question.options[index] ? question.options[index] : '');
        }

        row.push(question.diagrams && question.diagrams.length > 0 ? JSON.stringify(question.diagrams) : '');
        row.push(question.stem_box ? JSON.stringify(question.stem_box) : '');
        worksheet.addRow(row);
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  };

  const clearFiles = () => {
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getSourceFileName = () => (
    files.length === 1 ? files[0].name : `${files.length} OCR source files`
  );

  const getSourceFileType = () => (
    files.length === 1 ? files[0].type : 'mixed'
  );

  const saveReusableOCRExport = async (
    exportResults: { filename: string; data: OCRResult }[],
    totalPages: number
  ) => {
    if (!user?.id) {
      toast.warning('Sign in to save this OCR sheet for Batch Creator.');
      return;
    }

    const totalQuestions = exportResults.reduce(
      (count, result) => count + (result.data.questions?.length || 0),
      0
    );

    try {
      const blob = await buildExcelBlob(exportResults);
      await saveLatestOCRExport({
        userId: user.id,
        fileName: 'extracted_ocr_results.xlsx',
        blob,
        totalPages,
        totalQuestions,
        sourceFileName: getSourceFileName(),
        sourceFileType: getSourceFileType(),
      });
      toast.success('Latest OCR sheet saved for Batch Creator.');
    } catch (saveError) {
      console.warn('Failed to save OCR export for reuse:', saveError);

      try {
        await saveOCRHistory({
          userId: user.id,
          totalPages,
          totalQuestions,
          sourceFileName: getSourceFileName(),
          sourceFileType: getSourceFileType(),
        });
        toast.error('OCR history was saved, but the reusable sheet could not be stored.');
      } catch (historyError) {
        console.warn('Failed to save OCR history:', historyError);
        toast.error('OCR finished, but history could not be saved. Check the OCR table and storage policies.');
      }
    }
  };

  const cropDiagramBlobFromBase64 = async (
    imageBase64: string,
    box: [number, number, number, number],
  ): Promise<Blob | null> => {
    const [rawY1, rawX1, rawY2, rawX2] = box;
    const clamp = (value: number) => Math.max(0, Math.min(1, value));

    const y1 = clamp(rawY1);
    const x1 = clamp(rawX1);
    const y2 = clamp(rawY2);
    const x2 = clamp(rawX2);

    const top = Math.min(y1, y2);
    const bottom = Math.max(y1, y2);
    const left = Math.min(x1, x2);
    const right = Math.max(x1, x2);

    if (bottom - top < 0.002 || right - left < 0.002) {
      return null;
    }

    const image = new Image();
    const loadPromise = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Failed to decode OCR source image.'));
    });

    image.src = `data:image/jpeg;base64,${imageBase64}`;
    await loadPromise;

    const sx = Math.max(0, Math.floor(left * image.width));
    const sy = Math.max(0, Math.floor(top * image.height));
    const sw = Math.max(1, Math.floor((right - left) * image.width));
    const sh = Math.max(1, Math.floor((bottom - top) * image.height));

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;

    const context = canvas.getContext('2d');
    if (!context) return null;

    context.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((value) => resolve(value), 'image/jpeg', 0.92);
    });

    return blob;
  };

  const saveReusableOCRDiagrams = async (processedPages: OCRProcessedPage[]) => {
    if (!user?.id || processedPages.length === 0) return;

    let questionCounter = 0;
    const uploads: Array<{
      questionNumber: number;
      questionId: string;
      sourcePageLabel: string;
      diagramIndex: number;
      description?: string;
      box?: [number, number, number, number];
      fileName: string;
      blob: Blob;
    }> = [];

    for (const page of processedPages) {
      const questions = page.data.questions || [];
      for (const question of questions) {
        questionCounter += 1;
        const diagrams = question.diagrams || [];

        for (let diagramIndex = 0; diagramIndex < diagrams.length; diagramIndex += 1) {
          const diagram = diagrams[diagramIndex];
          if (!diagram?.box || diagram.box.length !== 4) continue;

          try {
            const blob = await cropDiagramBlobFromBase64(page.base64, diagram.box);
            if (!blob) continue;

            const questionNumber = questionCounter;
            const fileName = `q${String(questionNumber).padStart(4, '0')}_d${String(diagramIndex + 1).padStart(2, '0')}.jpg`;

            uploads.push({
              questionNumber,
              questionId: `Q${questionNumber}`,
              sourcePageLabel: page.filename,
              diagramIndex: diagramIndex + 1,
              description: diagram.description || '',
              box: diagram.box,
              fileName,
              blob,
            });
          } catch (error) {
            console.warn('Failed to crop OCR diagram:', error);
          }
        }
      }
    }

    try {
      await saveLatestOCRExtractedDiagrams({
        userId: user.id,
        diagrams: uploads,
      });
    } catch (error) {
      console.warn('Failed to save reusable OCR diagrams:', error);
    }
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setResults([]);
    setError(null);
    setManualCrops({});

    let filesToProcess: { filename: string, base64: string }[] = [];
    
    for (const file of files) {
      if (file.type === 'application/pdf') {
        const pagesRef = await convertPDFToImages(file);
        pagesRef.forEach((b64, i) => {
          filesToProcess.push({ filename: `${file.name} (Page ${i + 1})`, base64: b64 });
        });
      } else if (file.type.startsWith('image/')) {
        const b64 = await convertImageToBase64(file);
        filesToProcess.push({ filename: file.name, base64: b64 });
      }
    }

    if (filesToProcess.length > 0) {
      setPreCropQueue(filesToProcess);
      setCurrentPreCropIndex(0);
      setIsPreCropping(true);
    } else {
      setIsProcessing(false);
    }
  };

  const runAiProcessing = async (finalQueue: { filename: string; base64: string }[], finalCrops: Record<string, CropBox[]>) => {
    setIsAiProcessing(true);
    setProgress({ current: 0, total: finalQueue.length });
    
    const processingResults: OCRProcessedPage[] = [];
    
    for (let i = 0; i < finalQueue.length; i++) {
        const { filename, base64 } = finalQueue[i];
        const pageCrops = finalCrops[filename] || [];
        
        // Add pageIndex to the crops so that getCropsForPage allows them
        const cropsWithPage = pageCrops.map(c => ({
          ...c,
          pageIndex: i
        })) as any;
        
        try {
            // Pass manual crops to the OCR service as hints
            const data = await processOCRImage(base64, filename, cropsWithPage, i);
            processingResults.push({ filename, base64, data });
        } catch (err) {
            console.error(`Error processing ${filename}:`, err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred during OCR.');
        }
        setProgress(prev => ({ ...prev, current: prev.current + 1 }));
    }

    if (processingResults.length > 0) {
      await saveReusableOCRExport(processingResults.map((entry) => ({ filename: entry.filename, data: entry.data })), finalQueue.length);
      await saveReusableOCRDiagrams(processingResults);
    }
    
    setResults(processingResults.map((entry) => ({ filename: entry.filename, data: entry.data })));
    setIsAiProcessing(false);
    setIsProcessing(false);
  };

  const handleApprovePreCrop = (crops: CropBox[]) => {
    const currentFile = preCropQueue[currentPreCropIndex];
    const newCrops = {
      ...manualCrops,
      [currentFile.filename]: crops
    };
    setManualCrops(newCrops);

    if (currentPreCropIndex < preCropQueue.length - 1) {
      setCurrentPreCropIndex(prev => prev + 1);
    } else {
      setIsPreCropping(false);
      runAiProcessing(preCropQueue, newCrops);
    }
  };

  const handleCancelPreCrop = () => {
    setIsPreCropping(false);
    setIsProcessing(false);
    setPreCropQueue([]);
    setCurrentPreCropIndex(0);
  };

  const handleDownload = () => {
    if (results.length === 0) return;
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extracted_ocr_results.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadExcel = async () => {
    if (results.length === 0) return;
    const blob = await buildExcelBlob(results);

    if (user?.id) {
      try {
        await saveLatestOCRExport({
          userId: user.id,
          fileName: 'extracted_ocr_results.xlsx',
          blob,
          totalPages: progress.total,
          totalQuestions: questionCount,
          sourceFileName: getSourceFileName(),
          sourceFileType: getSourceFileType(),
        });
        toast.success('Saved the latest OCR export for your account.');
      } catch (saveError) {
        console.warn('Failed to save OCR export for reuse:', saveError);
        toast.error('Downloaded locally, but the reusable OCR export could not be saved.');
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extracted_ocr_results.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadLatex = () => {
    if (results.length === 0) return;
    const latexSource = generateLatexDocument(results);
    const blob = new Blob([latexSource], { type: 'application/x-tex' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extracted_ocr_results.tex';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const questionCount = results.reduce((count, result) => count + (result.data.questions?.length || 0), 0);
  const progressValue = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  const selectedFileSize = files.reduce((sum, file) => sum + file.size, 0);
  const formattedFileSize =
    selectedFileSize > 0
      ? selectedFileSize > 1024 * 1024
        ? `${(selectedFileSize / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(selectedFileSize / 1024))} KB`
      : '0 KB';

  const isStandalone = location.pathname === "/ocr";

  const content = (
    <>
      <div className="h-screen flex flex-col bg-workspace-bg p-6 text-foreground transition-colors duration-200 sm:p-8 overflow-hidden">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 flex-1 overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground">
              <ScanText className="h-3 w-3" />
              Vision extraction
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">OCR Processor</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Upload scanned PDFs or images and extract STEM questions, options, LaTeX, and diagram metadata.
            </p>
          </div>
          <span className="rounded-md border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
            PDF, PNG, JPEG, WEBP
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)] flex-1 overflow-hidden">
          <div className="space-y-4 overflow-y-auto">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <ScanText className="h-3.5 w-3.5" />
                  OCR Summary
                </div>
                <span className="rounded-md border border-border bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                  Live
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-md border border-border bg-muted p-3">
                  <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    Selected
                  </div>
                  <div className="mt-1 text-lg font-semibold text-foreground">{files.length}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{formattedFileSize} ready for OCR</div>
                </div>
                <div className="rounded-md border border-border bg-muted p-3">
                  <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    <Database className="h-3.5 w-3.5" />
                    Processed
                  </div>
                  <div className="mt-1 text-lg font-semibold text-foreground">{progress.current}/{progress.total}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Pages in current run</div>
                </div>
                <div className="rounded-md border border-border bg-muted p-3">
                  <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    <TableProperties className="h-3.5 w-3.5" />
                    Found
                  </div>
                  <div className="mt-1 text-lg font-semibold text-foreground">{questionCount}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Questions for export</div>
                </div>
              </div>
            </div>

            <div
              className="flex min-h-[288px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-workspace-border bg-card p-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/50"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                accept="application/pdf,image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
              />
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md border border-border bg-muted text-foreground">
                <FileUp className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Drop files here</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Scan PDFs and image files while preserving equations, answer choices, and diagrams.
              </p>
              <Button type="button" variant="outline" size="sm" className="mt-5">
                <FileUp className="h-4 w-4" />
                Browse Files
              </Button>
            </div>
          
          {files.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-foreground">Selected Files ({files.length})</h4>
                <button
                  type="button"
                  onClick={clearFiles}
                  className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </button>
              </div>
              <ul className="mb-4 max-h-48 space-y-2 overflow-y-auto">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{f.name}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {f.size > 1024 * 1024 ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(f.size / 1024))} KB`}
                    </span>
                  </li>
                ))}
              </ul>

              {isProcessing && (
                <div className="mb-4 rounded-md border border-border bg-muted p-3">
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Processing batch</span>
                    <span>{progressValue}%</span>
                  </div>
                  <Progress value={progressValue} />
                </div>
              )}

              <Button
                type="button"
                onClick={processFiles}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing {progress.current} of {progress.total}...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Start OCR Process
                  </>
                )}
              </Button>

              {error && (
                <div className="mt-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
                  <p className="font-semibold">Processing Error:</p>
                  <p className="mt-1">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

          <div className={`flex flex-col overflow-hidden rounded-lg border border-border bg-card ${results.length > 0 ? 'flex-1' : 'h-auto'}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 p-3">
            <div className="flex rounded-md border border-border bg-background p-1">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === 'preview' 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                Output Preview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('markdown')}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === 'markdown' 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                Raw Markdown
              </button>
            </div>
            
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleDownloadExcel}
                disabled={results.length === 0}
                size="sm"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export XLSX
              </Button>
              <Button
                type="button"
                onClick={handleDownload}
                disabled={results.length === 0}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4" />
                JSON
              </Button>
              <Button
                type="button"
                onClick={handleDownloadLatex}
                disabled={results.length === 0}
                variant="outline"
                size="sm"
              >
                <FileCode2 className="h-4 w-4" />
                LaTeX
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto bg-background p-4">
            {results.length > 0 ? (
              <div className="space-y-6">
                {results.map((res, i) => (
                  <div key={i} className="overflow-hidden rounded-lg border border-border bg-card">
                    <div className="border-b border-border bg-muted/60 px-4 py-2">
                      <h4 className="truncate text-sm font-semibold text-foreground">{res.filename}</h4>
                    </div>
                    <div className="p-4 space-y-6">
                      {res.data.questions?.map((q, qIndex) => (
                        <div key={qIndex} className="space-y-4">
                          <div className="flex gap-3">
                            <span className="mt-0.5 shrink-0 text-xs font-semibold uppercase text-muted-foreground">Q{qIndex + 1}</span>
                            <div className={`min-w-0 whitespace-pre-wrap text-sm font-medium text-foreground ${activeTab === 'markdown' ? 'rounded-md border border-border bg-muted p-3 font-mono text-xs' : ''}`}>
                              {activeTab === 'preview' ? (
                                <MathMLRenderer content={convertTextWithMath(q.stem || '')} />
                              ) : (
                                q.stem
                              )}
                            </div>
                          </div>
                          
                          {q.diagrams && q.diagrams.length > 0 && (
                            <div className="ml-8 flex items-start gap-3 rounded-md border border-border bg-muted p-3">
                              <ImageIcon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium text-foreground">Extracted Diagram: {q.diagrams[0].description}</p>
                                <p className="mt-1 text-xs text-muted-foreground">Bounding Box: {JSON.stringify(q.diagrams[0].box)}</p>
                              </div>
                            </div>
                          )}

                          {q.options && q.options.length > 0 && (
                            <div className="ml-8 grid grid-cols-1 md:grid-cols-2 gap-3">
                              {q.options.map((opt, optIndex) => (
                                <div key={optIndex} className="group relative rounded-md border border-border bg-muted p-3 transition-colors hover:border-primary/40">
                                  <span className="absolute -left-3 top-3 flex h-6 w-6 items-center justify-center rounded-md border border-border bg-card text-xs font-semibold text-muted-foreground">
                                    {String.fromCharCode(65 + optIndex)}
                                  </span>
                                  <span className={`ml-4 inline-block text-sm text-foreground ${activeTab === 'markdown' ? 'font-mono text-xs' : ''}`}>
                                    {activeTab === 'preview' ? (
                                      <MathMLRenderer content={convertTextWithMath(opt || '')} inline />
                                    ) : (
                                      opt
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {qIndex < res.data.questions.length - 1 && <hr className="mt-6 border-border" />}
                        </div>
                      ))}
                      
                      {(!res.data.questions || res.data.questions.length === 0) && (
                        <p className="text-sm italic text-muted-foreground">No questions uniquely identified in this page.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                 <Settings2 className="mb-4 h-8 w-8 opacity-60" />
                 <p className="text-sm font-medium text-foreground">Processed output will appear here</p>
                 <p className="mt-1 max-w-sm text-sm">Run OCR to preview extracted questions, answer choices, LaTeX, and diagram metadata.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>

      {/* ── Pre-Crop Stage Overlay ─────────────────────────────────────── */}
      {isPreCropping && preCropQueue[currentPreCropIndex] && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-background">
          <div className="flex-1 overflow-hidden">
            <DiagramPreCrop
              key={currentPreCropIndex}
              imageUrl={`data:image/jpeg;base64,${preCropQueue[currentPreCropIndex].base64}`}
              onApprove={handleApprovePreCrop}
              onCancel={handleCancelPreCrop}
              allPages={preCropQueue}
              currentPageIndex={currentPreCropIndex}
              onPageChange={setCurrentPreCropIndex}
            />
          </div>
        </div>
      )}

      {/* ── AI Processing Overlay ───────────────────────────────────────── */}
      {isAiProcessing && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-8 w-8 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-foreground">AI Extraction in Progress</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Using your manual hints to guarantee perfect diagram extraction...
              </p>
              
              <div className="mt-8 w-full space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span>Processing {progress.current} of {progress.total} pages</span>
                  <span>{progressValue}%</span>
                </div>
                <Progress value={progressValue} className="h-2" />
              </div>
              
              <p className="mt-6 text-[11px] text-muted-foreground uppercase tracking-widest font-bold italic">
                Optimizing vision parameters...
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return isStandalone ? (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-1">{content}</div>
    </div>
  ) : content;
}
