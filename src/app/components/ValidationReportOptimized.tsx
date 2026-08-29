import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Save,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import type { ValidationResult } from "../utils/questionValidator.js";
import { computeDataQualityMetrics } from "../utils/questionValidator.js";
import type { AuditResult } from "../../services/aiAuditService";

interface ValidationReportProps {
  columns: string[];
  rows: Record<string, any>[];
  validationResults: Map<string, ValidationResult>;
  auditResults?: Record<string, AuditResult>;
  isCollapsed?: boolean;
  onDataChange?: (updatedRows: Record<string, any>[]) => void;
  selectedRowKey?: string | null;
  onRowClick?: (rowKey: string) => void;
}

interface EditingCell {
  rowId: string;
  column: string;
}

function getRowValidationKey(row: Record<string, any>, index: number): string {
  if (row.__rowKey && String(row.__rowKey).trim()) {
    return String(row.__rowKey);
  }

  const explicitId = row.id != null ? String(row.id).trim() : "";
  const sourceId = explicitId || `row_${index + 1}`;
  return `${sourceId}#${index + 1}`;
}

const ROWS_PER_PAGE = 50;

export function ValidationReportOptimized({
  columns,
  rows,
  validationResults,
  auditResults = {},
  isCollapsed = false,
  onDataChange,
  selectedRowKey,
  onRowClick,
}: ValidationReportProps) {
  const [collapsed, setCollapsed] = useState(isCollapsed);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [localRows, setLocalRows] = useState(rows);
  const [customColumns, setCustomColumns] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync localRows with rows prop
  useEffect(() => {
    setLocalRows(rows);
    setCurrentPage(0);
  }, [rows]);

  // Auto-focus input when editing
  useEffect(() => {
    if (editingCell && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [editingCell]);

  const allColumns = useMemo(
    () => [...columns, ...customColumns],
    [columns, customColumns],
  );

  const handleCellEdit = useCallback(
    (rowId: string, column: string, cellValue: any) => {
      setEditingCell({ rowId, column });
      setEditValue(cellValue?.toString() || "");
    },
    [],
  );

  const saveEdit = useCallback(() => {
    if (!editingCell) return;

    const updatedRows = localRows.map((row, index) => {
      if (getRowValidationKey(row, index) === editingCell.rowId) {
        return {
          ...row,
          [editingCell.column]: editValue,
        };
      }
      return row;
    });

    setLocalRows(updatedRows);
    onDataChange?.(updatedRows);
    setEditingCell(null);
    setEditValue("");
  }, [editingCell, editValue, localRows, onDataChange]);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue("");
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveEdit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelEdit();
      }
    },
    [saveEdit, cancelEdit],
  );

  const addCustomColumn = useCallback(() => {
    const newColumnName = `Custom ${customColumns.length + 1}`;
    setCustomColumns([...customColumns, newColumnName]);
  }, [customColumns]);

  const getStatusColor = useCallback((status: ValidationResult["status"]) => {
    switch (status) {
      case "valid":
        return "bg-green-50 border-green-200";
      case "caution":
        return "bg-yellow-50 border-yellow-200";
      case "rejected":
        return "bg-destructive-light border-destructive";
      default:
        return "bg-gray-50 border-gray-200";
    }
  }, []);

  const getStatusBadge = useCallback((status: ValidationResult["status"]) => {
    switch (status) {
      case "valid":
        return (
          <Badge className="bg-green-100 text-green-800 gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Valid
          </Badge>
        );
      case "caution":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 gap-1">
            <AlertCircle className="w-3 h-3" />
            Caution
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-destructive-light text-red-800 gap-1">
            <XCircle className="w-3 h-3" />
            Rejected
          </Badge>
        );
    }
  }, []);

  const getAiStatusBadge = useCallback((auditResult: AuditResult) => {
    const { bucket, confidence, explanation } = auditResult;
    const confidencePercent = Math.round(confidence * 100);

    switch (bucket) {
      case "AI_CERTIFIED":
        return (
          <Badge className="bg-green-100 text-green-800 gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Verified {confidencePercent}%
          </Badge>
        );
      case "NEEDS_MANUAL_REVIEW":
        return (
          <Badge
            className="bg-yellow-100 text-yellow-800 gap-1 cursor-help"
            title={explanation}
          >
            <AlertCircle className="w-3 h-3" />
            Review {confidencePercent}%
          </Badge>
        );
      case "LOW_CONFIDENCE_FAIL":
        return (
          <Badge className="bg-destructive-light text-red-800 gap-1">
            <XCircle className="w-3 h-3" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    const allResults = Array.from(validationResults.values());
    const validCount = allResults.filter((r) => r.status === "valid").length;
    const cautionCount = allResults.filter(
      (r) => r.status === "caution",
    ).length;
    const rejectedCount = allResults.filter(
      (r) => r.status === "rejected",
    ).length;
    const dataQuality = computeDataQualityMetrics(allResults);
    return { validCount, cautionCount, rejectedCount, dataQuality };
  }, [validationResults]);

  // Pagination calculations
  const totalPages = Math.ceil(localRows.length / ROWS_PER_PAGE);
  const startIndex = currentPage * ROWS_PER_PAGE;
  const endIndex = Math.min(startIndex + ROWS_PER_PAGE, localRows.length);
  const paginatedRows = localRows.slice(startIndex, endIndex);

  const handlePreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
  }, [totalPages]);

  if (collapsed) {
    return (
      <Card className="border border-gray-200">
        <Collapsible
          open={!collapsed}
          onOpenChange={(open: boolean) => setCollapsed(!open)}
        >
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <ChevronDown className="w-5 h-5" />
                <h3 className="font-semibold">Validation Report</h3>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">{localRows.length} rows</Badge>
              </div>
            </div>
          </CollapsibleTrigger>
        </Collapsible>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-200">
      <Collapsible
        open={!collapsed}
        onOpenChange={(open: boolean) => setCollapsed(!open)}
      >
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                {collapsed ? <ChevronUp /> : <ChevronDown />}
                <CardTitle>Validation Report</CardTitle>
              </Button>
            </CollapsibleTrigger>
            <div className="flex gap-2">
              <Badge className="bg-green-100 text-green-800">
                {stats.validCount} Valid
              </Badge>
              <Badge className="bg-yellow-100 text-yellow-800">
                {stats.cautionCount} Caution
              </Badge>
              <Badge className="bg-destructive-light text-red-800">
                {stats.rejectedCount} Rejected
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <span>Usable after dedup:</span>
            <span className="font-medium text-foreground">
              {stats.dataQuality.adjustedValidRows} /{" "}
              {stats.dataQuality.totalRows}
            </span>
            <span>({stats.dataQuality.usableAfterCleanupPercentage}%)</span>
            <span>·</span>
            <span>{stats.dataQuality.duplicatesCount} duplicates flagged</span>
          </div>
        </CardHeader>

        <CollapsibleContent asChild>
          <CardContent className="p-0">
            <div className="space-y-4">
              {/* Table */}
              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  {/* Header */}
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-300">
                      <th className="border-r border-gray-300 px-3 py-2 text-left font-semibold w-10">
                        #
                      </th>
                      {allColumns.map((col) => (
                        <th
                          key={col}
                          className="border-r border-gray-300 px-3 py-2 text-left font-semibold whitespace-nowrap bg-gray-50 min-w-[100px]"
                        >
                          {col}
                        </th>
                      ))}
                      <button
                        onClick={addCustomColumn}
                        className="text-primary hover:text-blue-800 border-r border-gray-300 px-3 py-2 font-semibold bg-gray-50 text-sm"
                        title="Add custom column"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                      <th className="border-r border-gray-300 px-3 py-2 text-left font-semibold bg-gray-50 min-w-[140px]">
                        Status
                      </th>
                      <th className="border-r border-gray-300 px-3 py-2 text-left font-semibold bg-gray-50 min-w-[140px]">
                        AI Status
                      </th>
                      <th className="px-3 py-2 text-left font-semibold bg-gray-50 min-w-[100px]">
                        Details
                      </th>
                    </tr>
                  </thead>

                  {/* Body */}
                  <tbody>
                    {paginatedRows.length > 0 ? (
                      paginatedRows.map((row, rowIndex) => {
                        const absoluteIndex = startIndex + rowIndex;
                        const rowKey = getRowValidationKey(row, absoluteIndex);
                        const validation = validationResults.get(rowKey);
                        const isSelected = selectedRowKey === rowKey;
                        const statusColor = validation
                          ? getStatusColor(validation.status)
                          : "bg-card";

                        return (
                          <tr
                            key={rowKey}
                            className={
                              isSelected
                                ? `border-b-2 border-blue-500 bg-primary-light transition-colors`
                                : `border-b border-gray-200 ${statusColor} transition-colors`
                            }
                          >
                            <td className="border-r border-gray-300 px-3 py-2 text-center bg-gray-50 font-medium">
                              {absoluteIndex + 1}
                            </td>
                            {allColumns.map((col) => {
                              const isEditing =
                                editingCell?.rowId === rowKey &&
                                editingCell?.column === col;
                              const cellValue = row[col];
                              const issue = validation?.issues?.find(
                                (i: any) => i.field === col,
                              );
                              const hasErrorMsg = issue ? issue.message : null;

                              return (
                                <td
                                  key={`${rowKey}-${col}`}
                                  className={`border-r border-gray-300 px-3 py-2 cursor-pointer hover:bg-primary-light max-w-xs overflow-hidden text-ellipsis ${hasErrorMsg ? "bg-destructive-light" : ""}`}
                                  onClick={() => {
                                    if (onRowClick) onRowClick(rowKey);
                                    if (!isEditing) {
                                      handleCellEdit(rowKey, col, cellValue);
                                    }
                                  }}
                                  title={hasErrorMsg || String(cellValue || "")}
                                >
                                  <div className="flex items-center justify-between group">
                                    <span
                                      className={`text-xs ${hasErrorMsg ? "text-red-900 font-medium" : ""}`}
                                    >
                                      {String(cellValue || "").substring(
                                        0,
                                        100,
                                      )}
                                    </span>
                                    {hasErrorMsg && (
                                      <AlertCircle className="w-3 h-3 text-destructive ml-1 shrink-0" />
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                            <td className="border-r border-gray-300 px-3 py-2 text-center bg-gray-50">
                              {/* Empty cell for alignment */}
                            </td>
                            <td className="border-r border-gray-300 px-3 py-2 bg-gray-50">
                              {validation && getStatusBadge(validation.status)}
                            </td>
                            <td className="border-r border-gray-300 px-3 py-2 bg-gray-50">
                              {auditResults[rowKey] &&
                                getAiStatusBadge(auditResults[rowKey])}
                            </td>
                            <td className="px-3 py-2">
                              {validation && (
                                <div className="text-xs text-gray-600">
                                  {validation.errorCount > 0 && (
                                    <span className="text-destructive font-semibold">
                                      {validation.errorCount}e
                                    </span>
                                  )}
                                  {validation.warningCount > 0 && (
                                    <span
                                      className={
                                        validation.errorCount > 0
                                          ? "ml-1 text-yellow-600"
                                          : "text-yellow-600"
                                      }
                                    >
                                      {validation.warningCount}w
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={allColumns.length + 3}
                          className="text-center py-8 text-gray-500"
                        >
                          No data to display
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1}-{endIndex} of {localRows.length}{" "}
                    rows (Page {currentPage + 1} of {totalPages})
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handlePreviousPage}
                      disabled={currentPage === 0}
                      variant="outline"
                      size="sm"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages - 1}
                      variant="outline"
                      size="sm"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Edit Modal */}
              {editingCell && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <Card className="w-96">
                    <CardHeader>
                      <CardTitle>Edit Cell</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">
                          Column: {editingCell.column}
                        </label>
                        <Input
                          ref={inputRef}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className="mt-2"
                          placeholder="Enter value"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={cancelEdit}>
                          Cancel
                        </Button>
                        <Button
                          onClick={saveEdit}
                          className="bg-primary hover:bg-blue-700"
                        >
                          Save
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
