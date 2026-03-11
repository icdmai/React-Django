console.log("ReportPaginatedViewerPage mounted");
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  DataTable,
  LoadingSpinner,
  ErrorNotification,
  DownloadButton,
} from "../components";
import {
  usePaginatedReportData,
  normalizeColumnConfig,
  type ColumnConfigItem,
} from "../hooks/usePaginatedReportData";
import { reportsAPI } from "../services/api";
import { getReportAccessErrorMessage } from "../services/clientMac";

interface ReportData {
  id?: number;
  report_id?: number;
  name?: string;
  report_name?: string;
  description?: string;
  column_config?: unknown;
  columns?: string[] | { field_name: string; display_name: string }[];
}

/**
 * ReportPaginatedViewerPage - Optimized for browsing large datasets
 *
 * This component uses the paginated_data endpoint which:
 * - Loads only the requested page from Parquet files (memory efficient)
 * - Supports runtime filters
 * - Does NOT apply slicing/aggregation (use ReportViewerPage for that)
 *
 * Best for: Browsing large datasets (85 lakh+ records) without aggregation needs
 */
export const ReportPaginatedViewerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(true);
  const [error, setError] = useState("");
  const [pageSize, setPageSize] = useState(50000);
  const [chunkSize, setChunkSize] = useState(50000); // Default: 50K rows per chunk
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [activeColumnFilter, setActiveColumnFilter] = useState<{
    column: string;
    filter: { type: string; value: string; operator?: string };
  } | null>(null);
  const [searchData, setSearchData] = useState<Record<string, any>[]>([]);
  const [searchPagination, setSearchPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRows: 0,
    hasNext: false,
    hasPrevious: false,
  });
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const navigate = useNavigate();

  // Use the paginated data hook with chunked loading (only when not in search mode)
  const {
    data,
    loadedChunk,
    columnConfig,
    isLoading: isLoadingData,
    error: dataError,
    pagination,
    chunkInfo,
    goToPage,
    nextPage,
    previousPage,
    refresh,
    updateFilters,
    loadNextChunk,
  } = usePaginatedReportData({
    reportId: Number(id) || 0,
    pageSize,
    filterValues,
    enabled: !!id && !!report && !isSearchMode,
    chunkSize, // Configurable chunk size (default: 50K rows)
  });

  // Handle column filter changes - hybrid strategy: client-side first, backend fallback
  const handleColumnFilterChange = async (
    column: string,
    filter: { type: string; value: string; operator?: string } | null,
  ) => {
    if (!report || !id) return;

    if (!filter || !filter.value || filter.value === "") {
      // Filter cleared - exit search mode, use client-side filtering
      setIsSearchMode(false);
      setActiveColumnFilter(null);
      setSearchData([]);
      setSearchPagination({
        currentPage: 1,
        totalPages: 1,
        totalRows: 0,
        hasNext: false,
        hasPrevious: false,
      });
      return;
    }

    // Check if filter can be applied client-side (if we have loaded chunk)
    if (loadedChunk && loadedChunk.length > 0) {
      // Try client-side filtering first
      // DataTable will handle this automatically with useClientSideFiltering=true
      setIsSearchMode(false);
      return; // Let DataTable handle client-side filtering
    }

    // Fallback to backend search if no chunk loaded
    await performBackendSearch(column, filter, 1);
  };

  // Perform backend search (used when client-side returns no results)
  const performBackendSearch = async (
    column: string,
    filter: { type: string; value: string; operator?: string },
    page: number = 1,
  ) => {
    if (!report || !id) return;

    setIsSearchMode(true);
    setActiveColumnFilter({ column, filter });
    setSearchPagination((prev) => ({ ...prev, currentPage: page }));

    try {
      setIsLoadingSearch(true);
      setError("");

      const searchTypeMap: Record<string, "exact" | "contains" | "startswith"> =
        {
          equals: "exact",
          contains: "contains",
          startswith: "startswith",
        };
      const searchType =
        searchTypeMap[filter.operator || "contains"] || "contains";

      const searchResponse = await reportsAPI.searchByColumn(Number(id), {
        column,
        search_value: filter.value,
        search_type: searchType,
        page,
        page_size: pageSize,
      });

      const response = searchResponse.data;
      const searchResults = response?.records || response?.data || [];
      const total = response?.total_records || response?.count || 0;
      const totalPages = response?.total_pages || Math.ceil(total / pageSize);

      setSearchData(searchResults);
      setSearchPagination({
        currentPage: page,
        totalPages,
        totalRows: total,
        hasNext: response?.has_next || page < totalPages,
        hasPrevious: page > 1,
      });
    } catch (err: any) {
      const macMsg = getReportAccessErrorMessage(err);
      const errorMessage =
        macMsg ||
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to search report data";
      setError(errorMessage);
    } finally {
      setIsLoadingSearch(false);
    }
  };

  // Handle backend search fallback (when no results found in loaded chunk)
  const handleBackendSearchFallback = async (filters: Record<string, any>) => {
    if (!report || !id || Object.keys(filters).length === 0) return;

    // For now, use the first filter for backend search
    // TODO: Support multiple filters in backend search
    const firstFilter = Object.entries(filters)[0];
    if (!firstFilter) return;

    const [column, filter] = firstFilter;
    if (!filter || !filter.value) return;

    // Perform backend search
    await performBackendSearch(column, filter, 1);
  };

  // Fetch search results when search page changes
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (
        !report ||
        !id ||
        !isSearchMode ||
        !activeColumnFilter ||
        searchPagination.currentPage === 1
      )
        return;

      try {
        setIsLoadingSearch(true);
        setError("");

        const { column, filter } = activeColumnFilter;
        const searchTypeMap: Record<
          string,
          "exact" | "contains" | "startswith"
        > = {
          equals: "exact",
          contains: "contains",
          startswith: "startswith",
        };
        const searchType =
          searchTypeMap[filter.operator || "contains"] || "contains";

        const searchResponse = await reportsAPI.searchByColumn(Number(id), {
          column,
          search_value: filter.value,
          search_type: searchType,
          page: searchPagination.currentPage,
          page_size: pageSize,
        });

        const response = searchResponse.data;
        const searchResults = response?.records || response?.data || [];
        const total = response?.total_records || response?.count || 0;
        const totalPages = response?.total_pages || Math.ceil(total / pageSize);

        setSearchData(searchResults);
        setSearchPagination((prev) => ({
          ...prev,
          totalPages,
          totalRows: total,
          hasNext: response?.has_next || prev.currentPage < totalPages,
          hasPrevious: prev.currentPage > 1,
        }));
      } catch (err: any) {
        const macMsg = getReportAccessErrorMessage(err);
        const errorMessage =
          macMsg ||
          err?.response?.data?.error ||
          err?.response?.data?.detail ||
          err?.message ||
          "Failed to search report data";
        setError(errorMessage);
      } finally {
        setIsLoadingSearch(false);
      }
    };

    fetchSearchResults();
  }, [
    report,
    id,
    isSearchMode,
    activeColumnFilter,
    searchPagination.currentPage,
    pageSize,
  ]);

  const handleSearchNextPage = () => {
    if (searchPagination.hasNext && !isLoadingSearch) {
      setSearchPagination((prev) => ({
        ...prev,
        currentPage: prev.currentPage + 1,
      }));
    }
  };

  const handleSearchPreviousPage = () => {
    if (searchPagination.hasPrevious && !isLoadingSearch) {
      setSearchPagination((prev) => ({
        ...prev,
        currentPage: prev.currentPage - 1,
      }));
    }
  };

  // Fetch report metadata
  useEffect(() => {
    const fetchReport = async () => {
      try {
        setIsLoadingReport(true);
        const { data } = await reportsAPI.getReport(Number(id));
        setReport(data);
      } catch (err: any) {
        setError(err?.message || "Failed to load report");
      } finally {
        setIsLoadingReport(false);
      }
    };

    if (id) {
      fetchReport();
    }
  }, [id]);

  if (isLoadingReport) {
    return <LoadingSpinner message="Loading report..." />;
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <ErrorNotification message="Report not found" />
        </div>
      </div>
    );
  }

  const displayData = isSearchMode ? searchData : data;
  const displayIsLoading = isSearchMode ? isLoadingSearch : isLoadingData;
  const displayError = dataError || error;
  const displayPagination = isSearchMode ? searchPagination : pagination;

  // Use column_config from hook (data API) first, then report, then keys from first row
  const fromReport = report
    ? normalizeColumnConfig(report.column_config ?? report.columns)
    : [];
  const effectiveColumnConfig =
    (columnConfig && columnConfig.length > 0 ? columnConfig : fromReport) as ColumnConfigItem[];

  // Resolve column key to actual row key (so cells render when API uses different casing)
  const firstRow = displayData.length > 0 ? displayData[0] : null;
  const resolveKey = (fieldName: string): string => {
    if (!firstRow) return fieldName;
    if (fieldName in firstRow) return fieldName;
    const lower = fieldName.toLowerCase();
    const found = Object.keys(firstRow).find((k) => k.toLowerCase() === lower);
    return found ?? fieldName;
  };

  const columns =
    effectiveColumnConfig.length > 0
      ? effectiveColumnConfig.map((c: ColumnConfigItem) => ({
          key: resolveKey(c.field_name),
          label: c.display_name || c.field_name,
        }))
      : displayData.length > 0
        ? Object.keys(displayData[0]).map((key) => ({
            key,
            label: key.replace(/_/g, " ").toUpperCase(),
          }))
        : [];

  return (
    <div className="min-h-[calc(100vh-64px)] px-2 py-3">
      <div className="w-full space-y-3">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => navigate("/reports")}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white ring-1 ring-white/10 backdrop-blur hover:bg-white/15"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            Reports
          </button>
        </div>

        {/* Always-visible chunk size selector row */}
        <div className="w-full flex flex-row items-center gap-3 mb-2 px-1">
          <label
            className="text-xs text-white font-semibold"
            htmlFor="chunk-size-select"
          >
            Chunk size:
          </label>
          <select
            id="chunk-size-select"
            value={chunkSize}
            onChange={(e) => {
              setChunkSize(Number(e.target.value));
              refresh(); // Reload with new chunk size
            }}
            className="rounded-full bg-white/10 px-2.5 py-1 text-white ring-1 ring-white/15 focus:ring-2 focus:ring-emerald-400 min-w-[110px]"
            title="Initial chunk size (rows to load for filtering)"
          >
            <option value={25000}>25K chunk</option>
            <option value={50000}>50K chunk</option>
            <option value={100000}>100K chunk</option>
          </select>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-1">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-semibold text-white drop-shadow-sm leading-tight">
              {report.name ?? report.report_name}
            </h1>
            {report.description && (
              <p className="text-slate-200/80 text-xs leading-snug max-w-3xl">
                {report.description}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/80">
            {isSearchMode && activeColumnFilter && (
              <span className="rounded-full bg-blue-500/20 px-2.5 py-1 ring-1 ring-blue-500/30 text-blue-200">
                Search: {activeColumnFilter.column} = "
                {activeColumnFilter.filter.value}"
              </span>
            )}
            <span className="rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15">
              Page {displayPagination.currentPage} of{" "}
              {displayPagination.totalPages}
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15">
              Total {displayPagination.totalRows.toLocaleString()}
            </span>
            {chunkInfo && !isSearchMode && (
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 ring-1 ring-emerald-500/30 text-emerald-200">
                Loaded {chunkInfo.loadedRows.toLocaleString()} rows
                {chunkInfo.hasMoreChunks && " • More available"}
              </span>
            )}
            {report && (
              <DownloadButton
                reportId={report.id ?? report.report_id ?? Number(id)}
                reportName={report.name ?? report.report_name ?? ""}
                filterValues={filterValues}
                disabled={isLoadingData || data.length === 0}
                variant="outline"
              />
            )}
            <div className="flex items-center gap-2 mr-6">
              <label
                className="text-xs text-white font-semibold"
                htmlFor="page-size-select"
              >
                Rows per page:
              </label>
              <select
                id="page-size-select"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  goToPage(1);
                }}
                className="rounded-full bg-white/10 px-2.5 py-1 text-white ring-1 ring-white/15 focus:ring-2 focus:ring-emerald-400 min-w-[90px]"
                title="Rows per page"
              >
                <option value={25}>25/page</option>
                <option value={50}>50/page</option>
                <option value={100}>100/page</option>
                <option value={200}>200/page</option>
                <option value={500}>500/page</option>
              </select>
            </div>
            <button
              onClick={refresh}
              disabled={isLoadingData}
              className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/15 hover:bg-white/15 disabled:opacity-50"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                  clipRule="evenodd"
                />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {displayError && (
          <div className="mb-6">
            <ErrorNotification
              message={displayError}
              onClose={() => setError("")}
            />
          </div>
        )}

        {displayIsLoading && displayData.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/10 p-8 shadow-xl shadow-black/30 backdrop-blur">
            <LoadingSpinner
              message={
                isSearchMode
                  ? "Searching..."
                  : "Loading report data from parquet file..."
              }
            />
          </div>
        )}

        {displayData.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-white/10 bg-white shadow-lg shadow-black/10">
            <div className="bg-slate-900 px-4 py-3 text-white">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <h2 className="text-base font-semibold">Report Results</h2>
                  <span className="text-[11px] text-slate-200">
                    Showing page {displayPagination.currentPage} of{" "}
                    {displayPagination.totalPages} (
                    {displayPagination.totalRows.toLocaleString()} total
                    records)
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white">
              <DataTable
                columns={columns}
                data={displayData}
                loadedChunk={isSearchMode ? undefined : loadedChunk}
                compact
                useBackendSearch={isSearchMode} // Only use backend search in search mode
                useClientSideFiltering={
                  !isSearchMode && !!loadedChunk && loadedChunk.length > 0
                }
                onColumnFilterChange={handleColumnFilterChange}
                onLoadMoreChunk={loadNextChunk}
                onBackendSearchFallback={handleBackendSearchFallback}
                chunkInfo={chunkInfo}
              />
            </div>

            {/* Pagination Controls */}
            {displayPagination.totalPages > 1 && (
              <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={
                      isSearchMode ? handleSearchPreviousPage : previousPage
                    }
                    disabled={
                      !(isSearchMode
                        ? searchPagination.hasPrevious
                        : pagination.hasPrevious) || displayIsLoading
                    }
                    className="px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-sm shadow-slate-900/10 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-slate-600 px-4">
                    Page {displayPagination.currentPage} of{" "}
                    {displayPagination.totalPages}
                  </span>
                  <button
                    onClick={isSearchMode ? handleSearchNextPage : nextPage}
                    disabled={
                      !(isSearchMode
                        ? searchPagination.hasNext
                        : pagination.hasNext) || displayIsLoading
                    }
                    className="px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-sm shadow-slate-900/10 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <p className="text-[11px] text-slate-600 mt-1.5">
                  {displayPagination.totalRows.toLocaleString()} total records
                </p>
              </div>
            )}
          </div>
        )}

        {displayData.length === 0 && !displayIsLoading && !displayError && (
          <div className="rounded-2xl border border-white/10 bg-white/10 p-8 text-center text-slate-100 shadow-xl shadow-black/30 backdrop-blur">
            <p className="text-lg font-semibold">
              No data available for this report
            </p>
            <p className="text-sm text-slate-200/80 mt-2">
              Confirm the parquet source and try reloading.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
