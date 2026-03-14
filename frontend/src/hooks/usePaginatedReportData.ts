import { useState, useEffect, useCallback } from "react";
import { reportsAPI } from "../services/api";
import { getReportAccessErrorMessage } from "../services/clientMac";

export interface ColumnConfigItem {
  field_name: string;
  display_name: string;
  display_order?: number;
}

/** Normalize column config from API (may use column_config or columnConfig, and field/label or field_name/display_name). */
export function normalizeColumnConfig(raw: unknown): ColumnConfigItem[] {
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "string") {
    return (raw as string[]).map((s) => ({
      field_name: s,
      display_name: s.replace(/_/g, " ").toUpperCase(),
    }));
  }
  const arr = Array.isArray(raw) ? raw : [];
  const normalized = arr
    .filter((c) => c && typeof c === "object" && (c.field_name ?? c.field ?? c.key))
    .map((c: Record<string, unknown>) => ({
      field_name: String(c.field_name ?? c.field ?? c.key),
      display_name: String(c.display_name ?? c.label ?? c.field_name ?? c.field ?? c.key ?? "").trim() || String(c.field_name ?? c.field ?? c.key),
      display_order: typeof c.display_order === "number" ? c.display_order : undefined,
    }));
  return normalized.sort((a, b) => {
    const oa = a.display_order ?? 9999;
    const ob = b.display_order ?? 9999;
    return oa - ob;
  });
}

interface PaginatedReportDataResponse {
  results: Record<string, any>[];
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
  column_config?: ColumnConfigItem[];
  columns?: string[];
}

interface UsePaginatedReportDataOptions {
  reportId: number;
  pageSize?: number;
  filterValues?: Record<string, any>;
  enabled?: boolean; // Allow disabling automatic fetching
  chunkSize?: number; // Initial chunk size to load (default: 50000)
}

interface UsePaginatedReportDataReturn {
  data: Record<string, any>[];
  loadedChunk: Record<string, any>[]; // Full loaded chunk (50K rows)
  columnConfig: ColumnConfigItem[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    pageSize: number;
    totalRows: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  branchInfo?: {
    branchCount: number;
    branchesIncluded: string[] | null;
  };
  chunkInfo: {
    loadedRows: number;
    chunkSize: number;
    hasMoreChunks: boolean;
  };
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  refresh: () => void;
  updateFilters: (filters: Record<string, any>) => void;
  loadNextChunk: () => Promise<void>; // Load next 50K rows
}

/**
 * Custom hook for fetching paginated report data with chunked loading
 *
 * This hook uses a hybrid strategy:
 * - Loads initial chunk (50K rows) for client-side filtering
 * - Supports runtime filters (applied client-side on loaded chunk)
 * - Falls back to backend pagination when needed
 * - Does NOT apply slicing/aggregation (use execute endpoint for that)
 *
 * @example
 * ```tsx
 * const { data, loadedChunk, isLoading, pagination, goToPage } = usePaginatedReportData({
 *   reportId: 1,
 *   pageSize: 50000
 *   chunkSize: 50000,
 * });
 * ```
 */
export const usePaginatedReportData = ({
  reportId,
  chunkSize = 50000,
  pageSize = 50000,
  filterValues,
  enabled = true,
}: UsePaginatedReportDataOptions): UsePaginatedReportDataReturn => {
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>(
    filterValues ?? {},
  );
  const [chunkStartIndex, setChunkStartIndex] = useState(0); // Track which chunk we're on
  const [hasMoreChunks, setHasMoreChunks] = useState(true);
  // Add missing loadedChunk state
  const [loadedChunk, setLoadedChunk] = useState<Record<string, any>[]>([]);
  const [columnConfig, setColumnConfig] = useState<ColumnConfigItem[]>([]);
  // Add missing currentPage state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [branchInfo, setBranchInfo] = useState<{
    branchCount: number;
    branchesIncluded: string[] | null;
  } | null>(null);

  // Load initial chunk (50K rows)
  const loadInitialChunk = useCallback(async () => {
    if (!enabled || !reportId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await reportsAPI.getPaginatedData(reportId, {
        page: 1,
        page_size: chunkSize,
        filter_values: {}, // Don't apply filters here - we'll do client-side
      });

      // Handle different response formats
      const responseData = response.data;
      const chunkData = Array.isArray(responseData.data)
        ? responseData.data
        : Array.isArray(responseData.results)
          ? responseData.results
          : [];
      const cc = normalizeColumnConfig(
        responseData.column_config ?? responseData.columnConfig,
      );
      setColumnConfig(cc.length > 0 ? cc : []);
      const totalRowsFromAPI =
        responseData.count || responseData.total_rows || 0;
      const hasMoreFromAPI =
        responseData.has_next !== undefined
          ? responseData.has_next
          : chunkData.length >= chunkSize;

      setLoadedChunk(chunkData);
      setTotalRows(totalRowsFromAPI || chunkData.length);
      setChunkStartIndex(0);
      setHasMoreChunks(hasMoreFromAPI);

      // Capture branch metadata if provided by backend
      if (
        typeof responseData.branch_count === "number" ||
        responseData.branches_included
      ) {
        setBranchInfo({
          branchCount: Number(responseData.branch_count ?? 0),
          branchesIncluded:
            (Array.isArray(responseData.branches_included)
              ? responseData.branches_included
              : null) ?? null,
        });
      } else {
        setBranchInfo(null);
      }

      // Calculate pagination for loaded chunk
      const chunkPages = Math.ceil(chunkData.length / pageSize);
      setTotalPages(chunkPages);
      setHasNext(chunkData.length > pageSize || hasMoreFromAPI);
      setHasPrevious(false);
    } catch (err: any) {
      const macMsg = getReportAccessErrorMessage(err);
      const errorMessage =
        macMsg ||
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to load report data";
      setError(errorMessage);
      setLoadedChunk([]);
      setData([]);
      setTotalRows(0);
      setTotalPages(0);
      setHasNext(false);
      setHasPrevious(false);
      setHasMoreChunks(false);
    } finally {
      setIsLoading(false);
    }
  }, [reportId, chunkSize, pageSize, enabled]);

  // Load next chunk (when user needs more data)
  const loadNextChunk = useCallback(async () => {
    if (!enabled || !reportId || !hasMoreChunks) return;

    try {
      setIsLoading(true);
      setError(null);

      // Calculate next page based on current loaded rows
      const currentLoadedRows = loadedChunk.length;
      const nextPage = Math.floor(currentLoadedRows / chunkSize) + 1;

      const response = await reportsAPI.getPaginatedData(reportId, {
        page: nextPage,
        page_size: chunkSize,
        filter_values: {}, // Don't apply filters here - client-side filtering
      });

      const responseData = response.data;
      const newChunkData = Array.isArray(responseData.data)
        ? responseData.data
        : Array.isArray(responseData.results)
        ? responseData.results
        : [];
      const hasMoreFromAPI =
        responseData.has_next !== undefined
          ? responseData.has_next
          : newChunkData.length >= chunkSize;

      if (newChunkData.length > 0) {
        // Append to existing chunk
        setLoadedChunk((prev: Record<string, any>[]) => [
          ...prev,
          ...newChunkData,
        ]);
        setChunkStartIndex(currentLoadedRows);
        setHasMoreChunks(hasMoreFromAPI);
      } else {
        setHasMoreChunks(false);
      }
    } catch (err: any) {
      const macMsg = getReportAccessErrorMessage(err);
      const errorMessage =
        macMsg ||
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to load next chunk";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [reportId, chunkSize, hasMoreChunks, enabled, loadedChunk.length]);

  // Apply client-side pagination to loaded chunk
  const applyPagination = useCallback(() => {
    if (loadedChunk.length === 0) {
      setData([]);
      setHasNext(false);
      setHasPrevious(false);
      setTotalPages(0);
      return;
    }

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = loadedChunk.slice(startIndex, endIndex);

    setData(paginatedData);
    setHasNext(endIndex < loadedChunk.length || hasMoreChunks);
    setHasPrevious(currentPage > 1);

    // Update total pages based on loaded chunk
    const chunkPages = Math.ceil(loadedChunk.length / pageSize);
    setTotalPages(chunkPages);
  }, [loadedChunk, currentPage, pageSize, hasMoreChunks]);

  // Load initial chunk on mount or when reportId/chunkSize changes
  useEffect(() => {
    loadInitialChunk();
  }, [loadInitialChunk]);

  // Apply pagination when page or loaded chunk changes
  useEffect(() => {
    if (loadedChunk.length > 0) {
      applyPagination();
    }
  }, [currentPage, loadedChunk.length, applyPagination]);

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
      }
    },
    [totalPages],
  );

  const nextPage = useCallback(() => {
    if (hasNext) {
      setCurrentPage((prev: number) => prev + 1);
    }
  }, [hasNext]);

  const previousPage = useCallback(() => {
    if (hasPrevious) {
      setCurrentPage((prev: number) => prev - 1);
    }
  }, [hasPrevious]);

  const updateFilters = useCallback((newFilters: Record<string, any>) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
    // Note: Filters will be applied client-side in DataTable component
  }, []);

  const refresh = useCallback(() => {
    loadInitialChunk();
    setCurrentPage(1);
  }, [loadInitialChunk]);

  return {
    data,
    loadedChunk, // Full loaded chunk for client-side filtering
    columnConfig,
    isLoading,
    error,
    pagination: {
      currentPage,
      pageSize,
      totalRows,
      totalPages,
      hasNext,
      hasPrevious,
    },
    chunkInfo: {
      loadedRows: loadedChunk.length,
      chunkSize,
      hasMoreChunks,
    },
    branchInfo: branchInfo || undefined,
    goToPage,
    nextPage,
    previousPage,
    refresh,
    updateFilters,
    loadNextChunk,
  };
};
