import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  DataTable,
  LoadingSpinner,
  ErrorNotification,
  DownloadButton,
} from "../components";
import { reportsAPI } from "../services/api";
import { getReportAccessErrorMessage } from "../services/clientMac";
import {
  normalizeColumnConfig,
  type ColumnConfigItem,
} from "../hooks/usePaginatedReportData";

interface ReportData {
  id: number;
  name?: string;
  report_name?: string;
  description?: string;
  slicing_config?: any;
  sync_enabled?: boolean;
  sync_status?: string;
  last_sync_at?: string;
  column_config?: unknown;
  columns?: string[] | { field_name: string; display_name: string }[];
}

interface CacheStatus {
  report_id: number;
  sync_enabled: boolean;
  parquet_exists: boolean;
  rows?: number;
  size_mb?: number;
  last_sync_at?: string;
  next_sync_at?: string;
  sync_strategy?: string;
  sync_status?: string;
  message?: string;
}

export const ReportViewerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [activeColumnFilter, setActiveColumnFilter] = useState<{
    column: string;
    filter: { type: string; value: string; operator?: string };
  } | null>(null);
  const [searchPage, setSearchPage] = useState(1);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [filteredData, setFilteredData] = useState<Record<string, any>[]>([]);
  const [dataSource, setDataSource] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50000);
  const [totalRecords, setTotalRecords] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingCacheStatus, setIsLoadingCacheStatus] = useState(false);
  const [usePaginatedAPI, setUsePaginatedAPI] = useState(false);
  const [columnConfig, setColumnConfig] = useState<ColumnConfigItem[]>([]);
  const [branchInfo, setBranchInfo] = useState<{
    branchCount: number;
    branchesIncluded: string[] | null;
  } | null>(null);
  const [filterMessage, setFilterMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  // Column-level filtering logic
  React.useEffect(() => {
    if (
      !activeColumnFilter ||
      !activeColumnFilter.filter ||
      !activeColumnFilter.filter.value
    ) {
      setFilteredData(data);
      return;
    }
    // Client-side filtering for date columns
    const { column, filter } = activeColumnFilter;
    if (filter.type === "date" && filter.value) {
      const [start, end] = filter.value.split("|");
      setFilteredData(
        data.filter((row) => {
          const cellValue = row[column];
          if (!cellValue) return false;
          const rowDate = new Date(cellValue);
          return rowDate >= new Date(start) && rowDate <= new Date(end);
        }),
      );
    } else {
      setFilteredData(data);
    }
  }, [data, activeColumnFilter]);

  // Clear column config when report id changes
  useEffect(() => {
    setColumnConfig([]);
  }, [id]);

  // Fetch report metadata and cache status
  useEffect(() => {
    const fetchReport = async () => {
      try {
        setIsLoading(true);
        const { data } = await reportsAPI.getReport(Number(id));
        setReport(data);

        // Determine which API to use based on report configuration
        // Use paginated_data if no slicing/aggregation is configured
        const hasSlicing =
          data.slicing_config && Object.keys(data.slicing_config).length > 0;
        setUsePaginatedAPI(!hasSlicing);

        // Fetch cache status
        try {
          setIsLoadingCacheStatus(true);
          const cacheResponse = await reportsAPI.getCacheStatus(Number(id));
          setCacheStatus(cacheResponse.data);
        } catch (cacheErr: any) {
          console.warn("Failed to fetch cache status:", cacheErr);
        } finally {
          setIsLoadingCacheStatus(false);
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load report");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchReport();
    }
  }, [id]);

  // Handle column filter changes - trigger backend search
  const handleColumnFilterChange = async (
    column: string,
    filter: { type: string; value: string; operator?: string } | null,
  ) => {
    if (!report || !id) return;

    if (!filter || !filter.value || filter.value === "") {
      // Filter cleared - exit search mode and reload normal data
      setIsSearchMode(false);
      setActiveColumnFilter(null);
      setSearchPage(1);
      setCurrentPage(1);
      setData([]);
      return;
    }

    // Enter search mode
    setIsSearchMode(true);
    setActiveColumnFilter({ column, filter });
    setSearchPage(1);
    setCurrentPage(1);
    setFilterMessage(null);

    try {
      // Only show data loading state, keep overall report page visible
      setIsLoadingData(true);
      setError("");

      // Map operator to search_type for cascade API
      const searchTypeMap: Record<string, string> = {
        equals: "exact",
        contains: "contains",
        startswith: "startswith",
        gt: "gt",
        gte: "gte",
        lt: "lt",
        lte: "lte",
        between: "between",
      };
      const op = filter.operator || "contains";
      const search_type = searchTypeMap[op] || "contains";

      const payload = {
        filters: {
          [column]: {
            type: filter.type,
            search_type,
            value: filter.value,
            ...(op === "between" && (filter as any).value2
              ? { value2: (filter as any).value2 }
              : {}),
          },
        },
        page: 1,
        page_size: pageSize,
      };

      const searchResponse = await reportsAPI.searchCascade(
        Number(id),
        payload,
      );

      const response = searchResponse.data;
      // If no matches found, keep existing data and show a small message
      if (response && response.found === false) {
        setFilterMessage(
          response.message || "No records match the current filters",
        );
      } else {
        const searchResults =
          response?.results || response?.data || response?.records || [];
        const total =
          response?.total_rows ||
          response?.count ||
          response?.total_records ||
          0;

        setData(searchResults);
        setTotalRecords(total);
        setHasMore(response?.has_next || searchResults.length < total);
        setDataSource("parquet");
        setFilterMessage(null);
      }
    } catch (err: any) {
      // For search errors, keep the current data.
      // If backend returns a branch/permission 404, show its message inline.
      const status = err?.response?.status;
      const backendMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message;
      if (status === 404) {
        setFilterMessage(
          backendMsg || "No data found for your assigned branch(es).",
        );
      }
    } finally {
      setIsLoadingData(false);
    }
  };

  // Fetch search results when search page changes
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!report || !id || !isSearchMode || !activeColumnFilter) return;

      try {
        // Only show data loading state during search pagination
        setIsLoadingData(true);
        setError("");

        const { column, filter } = activeColumnFilter;
        const searchTypeMap: Record<string, string> = {
          equals: "exact",
          contains: "contains",
          startswith: "startswith",
          gt: "gt",
          gte: "gte",
          lt: "lt",
          lte: "lte",
          between: "between",
        };
        const op = filter.operator || "contains";
        const search_type = searchTypeMap[op] || "contains";

        const payload = {
          filters: {
            [column]: {
              type: filter.type,
              search_type,
              value: filter.value,
              ...(op === "between" && (filter as any).value2
                ? { value2: (filter as any).value2 }
                : {}),
            },
          },
          page: searchPage,
          page_size: pageSize,
        };

        const searchResponse = await reportsAPI.searchCascade(
          Number(id),
          payload,
        );

        const response = searchResponse.data;
        if (response && response.found === false) {
          setFilterMessage(
            response.message || "No records match the current filters",
          );
        } else {
          const searchResults =
            response?.results || response?.data || response?.records || [];
          const total =
            response?.total_rows ||
            response?.count ||
            response?.total_records ||
            0;

          setData(searchResults);
          setTotalRecords(total);
          setHasMore(response?.has_next || searchResults.length < total);
          setFilterMessage(null);
        }
      } catch (err: any) {
        const status = err?.response?.status;
        const backendMsg =
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message;
        if (status === 404) {
          setFilterMessage(
            backendMsg || "No data found for your assigned branch(es).",
          );
        }
      } finally {
        setIsLoadingData(false);
      }
    };

    if (searchPage > 1) {
      fetchSearchResults();
    }
  }, [report, id, isSearchMode, activeColumnFilter, searchPage, pageSize]);

  // Auto-fetch report data when report loads or pagination changes (only if not in search mode)
  useEffect(() => {
    const fetchData = async () => {
      if (!report || isSearchMode) return; // Skip if in search mode

      try {
        setIsLoadingData(true);
        setError("");

        let response: any;

        // Use paginated_data API for browsing (no aggregation)
        // Use execute API for aggregation/slicing
        if (usePaginatedAPI) {
          // Use paginated_data API - optimized for browsing
          const paginatedResponse = await reportsAPI.getPaginatedData(
            Number(id),
            {
              page: currentPage,
              page_size: pageSize,
            },
          );

          response = paginatedResponse.data;

          // Handle paginated response format (data may be under .data or .results)
          const newData = Array.isArray(response.data)
            ? response.data
            : Array.isArray(response.results)
            ? response.results
            : [];
          const total = response.count || response.total_rows || 0;
          const totalPages = response.total_pages || 1;

          const rawCc =
            response.column_config ??
            response.columnConfig ??
            response.schema?.column_config ??
            response.meta?.column_config;
          const cc = normalizeColumnConfig(rawCc);
          if (cc.length > 0) setColumnConfig(cc);

          setData(() => newData);
          setTotalRecords(total);
          setHasMore(response.has_next || currentPage < totalPages);
          setDataSource("parquet"); // Paginated API always uses parquet

          // Capture branch metadata if provided by backend
          if (
            typeof response.branch_count === "number" ||
            response.branches_included
          ) {
            setBranchInfo({
              branchCount: Number(response.branch_count ?? 0),
              branchesIncluded:
                (Array.isArray(response.branches_included)
                  ? response.branches_included
                  : null) ?? null,
            });
          } else {
            setBranchInfo(null);
          }
        } else {
          // Use execute API - for aggregation/slicing
          const params: any = {
            max_rows: pageSize * currentPage, // Load up to current page
          };

          const executeResponse = await reportsAPI.executeReport(
            Number(id),
            params,
          );

          response = executeResponse.data;

          // Handle execute response format
          const allData = Array.isArray(response.data)
            ? response.data
            : Array.isArray(response.results)
            ? response.results
            : [];
          const total = response.row_count || response.count || allData.length;

          const rawCc =
            response.column_config ??
            response.columnConfig ??
            response.schema?.column_config ??
            response.meta?.column_config;
          const cc = normalizeColumnConfig(rawCc);
          if (cc.length > 0) setColumnConfig(cc);

          // For execute API, slice data for pagination
          const startIndex = (currentPage - 1) * pageSize;
          const endIndex = startIndex + pageSize;
          const newData = allData.slice(startIndex, endIndex);

          setData(newData);
          setTotalRecords(total);
          setHasMore(endIndex < allData.length);

          // Use actual data source from backend response
          const actualDataSource = response.data_source || "parquet";
          setDataSource(actualDataSource);

          if (actualDataSource.toLowerCase() !== "parquet") {
            console.warn(
              `⚠️ WARNING: Data is from ${actualDataSource}, NOT parquet!`,
            );
          }

          // Capture branch metadata here as well if backend includes it
          if (
            typeof response.branch_count === "number" ||
            response.branches_included
          ) {
            setBranchInfo({
              branchCount: Number(response.branch_count ?? 0),
              branchesIncluded:
                (Array.isArray(response.branches_included)
                  ? response.branches_included
                  : null) ?? null,
            });
          } else {
            setBranchInfo(null);
          }
        }
      } catch (err: any) {
        const macMsg = getReportAccessErrorMessage(err);
        const errorMessage =
          macMsg ||
          err?.response?.data?.error ||
          err?.response?.data?.detail ||
          err?.message ||
          "Failed to load report data";
        setError(errorMessage);

        // If parquet not available, show helpful message
        if (err?.response?.data?.parquet_available === false) {
          setError(
            "Parquet file not available. Please generate the Parquet file first using admin endpoints.",
          );
        }
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [report, id, currentPage, pageSize, usePaginatedAPI, isSearchMode]);

  const loadMoreData = () => {
    if (!isLoadingData && hasMore) {
      if (isSearchMode) {
        setSearchPage((prev) => prev + 1);
      } else {
        setCurrentPage((prev) => prev + 1);
      }
    }
  };

  const refreshData = () => {
    setCurrentPage(1);
    setData([]);
  };

  // When date range changes, reset to page 1
  // Date filter reset logic removed

  if (isLoading || isLoadingData) {
    return <LoadingSpinner message="Loading report..." />;
  }

  if (!report && error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <ErrorNotification message={error || "Report not found"} />
        </div>
      </div>
    );
  }

  // Use column_config from API/report when present, else keys from first row
  const fromReport = report
    ? normalizeColumnConfig(report.column_config ?? report.columns)
    : [];
  const effectiveColumnConfig =
    columnConfig.length > 0 ? columnConfig : fromReport;
  const firstRow = filteredData.length > 0 ? filteredData[0] : null;
  const resolveKey = (fieldName: string): string => {
    if (!firstRow) return fieldName;
    if (fieldName in firstRow) return fieldName;
    const lower = fieldName.toLowerCase();
    const found = Object.keys(firstRow).find((k) => k.toLowerCase() === lower);
    return found ?? fieldName;
  };
  const columns =
    effectiveColumnConfig.length > 0
      ? effectiveColumnConfig.map((c) => ({
          key: resolveKey(c.field_name),
          label: c.display_name || c.field_name,
        }))
      : filteredData.length > 0
      ? Object.keys(filteredData[0]).map((key) => ({
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

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-1">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-semibold text-white drop-shadow-sm leading-tight">
              {report?.name ?? report?.report_name}
            </h1>
            {report?.description && (
              <p className="text-slate-200/80 text-xs leading-snug max-w-3xl">
                {report?.description}
              </p>
            )}
            {filterMessage && (
              <p className="text-[11px] text-amber-200 mt-0.5">
                {filterMessage}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/80">
            <span className="rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15 flex items-center gap-1">
              Page
              <input
                type="number"
                min={1}
                max={Math.max(
                  1,
                  Math.ceil((totalRecords || data.length) / pageSize),
                )}
                value={currentPage}
                onChange={(e) => {
                  let page = Number(e.target.value);
                  if (isNaN(page) || page < 1) page = 1;
                  if (
                    page > Math.ceil((totalRecords || data.length) / pageSize)
                  )
                    page = Math.ceil((totalRecords || data.length) / pageSize);
                  setCurrentPage(page);
                }}
                disabled={
                  Math.ceil((totalRecords || data.length) / pageSize) <= 1
                }
                className="w-12 text-center rounded bg-white/20 px-1 py-0.5 text-xs text-white border border-white/20 focus:ring-2 focus:ring-emerald-400"
                style={{ width: 40 }}
              />
              of{" "}
              {Math.max(1, Math.ceil((totalRecords || data.length) / pageSize))}
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15">
              Loaded {data.length.toLocaleString()}
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15">
              Total {(totalRecords || data.length).toLocaleString()}
            </span>
            {branchInfo && branchInfo.branchCount > 0 && (
              <span className="rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15">
                Branches:{" "}
                {Array.isArray(branchInfo.branchesIncluded) &&
                branchInfo.branchesIncluded.length > 0
                  ? branchInfo.branchesIncluded.join(", ")
                  : "N/A"}{" "}
                ({branchInfo.branchCount})
              </span>
            )}
            {cacheStatus && !cacheStatus.parquet_exists && (
              <span className="rounded-full bg-rose-500/20 px-2.5 py-1 ring-1 ring-rose-500/30 text-rose-200">
                No Parquet File
              </span>
            )}
            {report && (
              <DownloadButton
                reportId={report.id}
                reportName={report.name ?? report.report_name ?? ""}
                filterValues={{}}
                disabled={isLoadingData || data.length === 0}
                variant="outline"
              />
            )}
            <button
              onClick={refreshData}
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

        {error && (
          <div className="mb-6">
            <ErrorNotification message={error} onClose={() => setError("")} />
          </div>
        )}

        {isLoadingData && data.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/10 p-8 shadow-xl shadow-black/30 backdrop-blur">
            <LoadingSpinner message="Loading report data from parquet file..." />
          </div>
        )}

        {/* Date filter section removed. Column-level filtering handled in DataTable */}

        {filteredData.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-white/10 bg-white shadow-lg shadow-black/10">
            <div className="bg-slate-900 px-4 py-3 text-white">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <h2 className="text-base font-semibold">Report Results</h2>
                  <span className="text-[11px] text-slate-200">
                    Loaded {data.length.toLocaleString()}
                    {totalRecords > data.length &&
                      ` / ${totalRecords.toLocaleString()}`}
                    {filteredData.length !== data.length &&
                      ` · Filtered ${filteredData.length.toLocaleString()}`}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={refreshData}
                    disabled={isLoadingData}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white ring-1 ring-white/15 hover:bg-white/15 disabled:opacity-50"
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
            </div>

            <div className="bg-white">
              <DataTable
                columns={columns}
                data={filteredData}
                compact
                useBackendSearch={true}
                onColumnFilterChange={handleColumnFilterChange}
              />
            </div>

            {/* Classic Pagination Controls */}
            {data.length > 0 && totalRecords > 0 && (
              <div className="flex items-center justify-center gap-2 py-4 bg-slate-50 border-t border-slate-100">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1 || isLoadingData}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm font-medium">
                  Page {currentPage} of {Math.ceil(totalRecords / pageSize)}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(Math.ceil(totalRecords / pageSize), prev + 1),
                    )
                  }
                  disabled={
                    currentPage === Math.ceil(totalRecords / pageSize) ||
                    isLoadingData
                  }
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {filteredData.length === 0 && data.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/10 p-8 text-center text-slate-100 shadow-xl shadow-black/30 backdrop-blur">
            <p className="text-lg font-semibold">
              No records match the current filters
            </p>
            <p className="text-sm text-slate-200/80 mt-2">
              Try widening the date range or clearing column filters.
            </p>
          </div>
        )}

        {data.length === 0 && !isLoadingData && !error && (
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
