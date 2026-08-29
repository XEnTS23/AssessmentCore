import React, { useRef } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  Bot,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "../../../components/ui/button";

export function UploadStage({ upload }: { upload?: any; wizard?: any }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!upload) return null; // Fallback if props are missing

  const { output, isLoading, error, handleFile, handleLoadOcr, reset } = upload;

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center p-8 overflow-y-auto">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground">
            Upload Source Data
          </h2>
          <p className="mt-2 text-muted-foreground">
            Import a CSV, Excel sheet, or load your latest AI OCR extraction.
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive-light p-4 text-destructive max-w-2xl mx-auto">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium">{error.title}</h4>
              <p className="mt-1 text-sm opacity-90">{error.message}</p>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 max-w-2xl mx-auto">
          {/* File Upload Dropzone */}
          <div
            className={`flex items-center justify-between gap-4 rounded-xl border-2 border-dashed border-border bg-card p-5 transition-all hover:border-primary hover:bg-muted/50 cursor-pointer ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv"
              onChange={onFileChange}
            />
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-2.5 text-primary">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground text-sm">
                  Upload File
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  CSV or XLSX format
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="h-8 text-xs shrink-0"
              disabled={isLoading}
            >
              Browse
            </Button>
          </div>

          {/* OCR Load Button */}
          <div
            className={`flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 transition-all ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
          >
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-purple-500/10 p-2.5 text-purple-500">
                <Bot className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground text-sm">
                  Load AI OCR
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Last extracted data
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs shrink-0"
              onClick={handleLoadOcr}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Import"}
            </Button>
          </div>
        </div>

        {output && (
          <div className="mt-12 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  File Parsed Successfully
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Found {output.columns.length} columns and{" "}
                  {output.rawRows.length} rows in{" "}
                  <span className="font-medium text-foreground">
                    {output.sourceFileName}
                  </span>
                  .
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={reset}>
                <RefreshCw className="mr-2 h-4 w-4" /> Clear
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">
                        #
                      </th>
                      {output.columns.map((col: string, i: number) => (
                        <th
                          key={i}
                          className="px-4 py-3 font-medium whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {output.previewRows.map((row: any, i: number) => (
                      <tr
                        key={row.__internalId || i}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.__sourceRowNumber}
                        </td>
                        {output.columns.map((col: string, j: number) => (
                          <td
                            key={j}
                            className="px-4 py-3 text-foreground truncate max-w-[200px]"
                            title={row[col]}
                          >
                            {row[col] || (
                              <span className="text-muted-foreground/50 italic">
                                empty
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {output.rawRows.length > 5 && (
                <div className="bg-muted px-4 py-3 text-center text-xs text-muted-foreground border-t border-border">
                  Showing first 5 rows of {output.rawRows.length}.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
