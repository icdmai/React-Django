import React, { useState, useMemo } from "react";

interface ColumnFilter {
  type: "text" | "number" | "date";
  value: string;
  operator?:
    | "equals"
    | "contains"
    | "startswith"
    | "gt"
    | "lt"
    | "gte"
    | "lte"
    | "between";
  value2?: string; // For between operator
}

interface TableProps {
  columns: { key: string; label: string }[];
  data: any[];
  loadedChunk?: any[]; // Full loaded chunk for client-side filtering (optional)
  isLoading?: boolean;
  onRowClick?: (row: any) => void;
  pageSize?: number;
  compact?: boolean;
  onColumnFilterChange?: (column: string, filter: ColumnFilter | null) => void;
  useBackendSearch?: boolean; // If true, disable client-side filtering and use backend search
  useClientSideFiltering?: boolean; // If true, enable client-side filtering on loadedChunk
  onLoadMoreChunk?: () => Promise<void>; // Callback to load next chunk when needed
  onBackendSearchFallback?: (
    filters: Record<string, ColumnFilter>,
  ) => Promise<void>; // Callback when no results found client-side
  chunkInfo?: {
    loadedRows: number;
    chunkSize: number;
    hasMoreChunks: boolean;
  };
  onFiltersChange?: (filters: Record<string, ColumnFilter>) => void; // Notify parent when filters change
}

type SortDirection = "asc" | "desc" | null;

export const DataTable: React.FC<TableProps> = ({
  columns,
  data,
  loadedChunk,
  isLoading = false,
  onRowClick,
  pageSize = 50,
  compact = false,
  onColumnFilterChange,
  useBackendSearch = false,
  useClientSideFiltering = false,
  onLoadMoreChunk,
  onBackendSearchFallback,
  chunkInfo,
  onFiltersChange,
}) => {
  const [noResultsInChunk, setNoResultsInChunk] = useState(false);
  const [isSearchingBackend, setIsSearchingBackend] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [columnFilters, setColumnFilters] = useState<
    Record<string, ColumnFilter>
  >({});
  const [showFilterMenu, setShowFilterMenu] = useState<string | null>(null);
  const [filterMenuPos, setFilterMenuPos] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });

  // Close filter menu on outside click, ESC, or scroll
  React.useEffect(() => {
    if (!showFilterMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowFilterMenu(null);
    };
    const onMouseDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      const inMenu = el.closest("[data-filter-menu]");
      const inButton = el.closest("[data-filter-button]");
      if (!inMenu && !inButton) setShowFilterMenu(null);
    };
    const onScroll = () => setShowFilterMenu(null);
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onMouseDown, true);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [showFilterMenu]);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>(
    columns.map((c) => c.key),
  );
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    () => {
      // Initialize with default width for each column
      const initial: Record<string, number> = {};
      columns.forEach((col) => {
        initial[col.key] = 150; // Default 150px width
      });
      return initial;
    },
  );
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const resizeXRef = React.useRef<number | null>(null);

  // Keep column order and widths in sync when columns prop changes (e.g., new report schema)
  React.useEffect(() => {
    setColumnOrder((prev) => {
      const incomingKeys = columns.map((c) => c.key);
      const preserved = prev.filter((key) => incomingKeys.includes(key));
      const appended = incomingKeys.filter((key) => !preserved.includes(key));
      return [...preserved, ...appended];
    });

    setColumnWidths((prev) => {
      const next: Record<string, number> = { ...prev };
      columns.forEach((col) => {
        if (next[col.key] == null) {
          next[col.key] = 150;
        }
      });
      Object.keys(next).forEach((key) => {
        if (!columns.find((col) => col.key === key)) {
          delete next[key];
        }
      });
      return next;
    });
  }, [columns]);

  const toggleColumnVisibility = (key: string) => {
    setHiddenColumns((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key],
    );
  };

  const visibleColumns = useMemo(() => {
    const ordered = columnOrder.filter((key) => !hiddenColumns.includes(key));
    return ordered
      .map((key) => columns.find((c) => c.key === key))
      .filter((c) => c !== undefined) as typeof columns;
  }, [columnOrder, columns, hiddenColumns]);

  // Handle drag and drop for column reordering
  const handleDragStart = (e: React.DragEvent, columnKey: string) => {
    // Prevent drag-reorder while actively resizing
    if (resizingColumn) {
      e.preventDefault();
      return;
    }
    setDraggedColumn(columnKey);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetKey) {
      setDraggedColumn(null);
      return;
    }
    const newOrder = [...columnOrder];
    const draggedIndex = newOrder.indexOf(draggedColumn);
    const targetIndex = newOrder.indexOf(targetKey);
    [newOrder[draggedIndex], newOrder[targetIndex]] = [
      newOrder[targetIndex],
      newOrder[draggedIndex],
    ];
    setColumnOrder(newOrder);
    setDraggedColumn(null);
  };

  // Handle column resize
  const handleResizeStart = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    resizeXRef.current = (e as React.MouseEvent<HTMLDivElement>).clientX;
    setResizingColumn(columnKey);
    document.body.style.cursor = "col-resize";
    (document.body.style as any).userSelect = "none";
  };

  React.useEffect(() => {
    if (!resizingColumn) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (resizeXRef.current == null) {
        resizeXRef.current = e.clientX;
        return;
      }
      const delta = e.clientX - resizeXRef.current;
      resizeXRef.current = e.clientX;
      setColumnWidths((prev) => ({
        ...prev,
        [resizingColumn]: Math.max(60, (prev[resizingColumn] || 150) + delta),
      }));
    };
    const handleMouseUp = () => {
      setResizingColumn(null);
      resizeXRef.current = null;
      document.body.style.cursor = "";
      (document.body.style as any).userSelect = "";
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizingColumn]);

  // Detect column data type
  const getColumnType = (
    key: string,
  ): "text" | "number" | "date" | "boolean" => {
    if (data.length === 0) return "text";
    const sample = data.find((row) => row[key] != null);
    if (!sample) return "text";
    const value = sample[key];
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "boolean";
    // Check if it looks like a date
    if (typeof value === "string" && !isNaN(Date.parse(value))) {
      const date = new Date(value);
      if (date.getFullYear() > 1900 && date.getFullYear() < 2100) {
        return "date";
      }
    }
    return "text";
  };

  // Apply filtering
  const filteredData = useMemo(() => {
    // Determine data source: use loadedChunk for client-side filtering, otherwise use data
    const sourceData =
      useClientSideFiltering && loadedChunk ? loadedChunk : data;

    // If backend search is enabled and NOT using client-side filtering, don't filter
    if (useBackendSearch && !useClientSideFiltering) {
      return data;
    }

    // If no filters, return source data
    if (Object.keys(columnFilters).length === 0) {
      return sourceData;
    }

    let result = [...sourceData];

    Object.entries(columnFilters).forEach(([key, filter]) => {
      if (!filter.value && filter.operator !== "between") return;

      result = result.filter((row) => {
        const cellValue = row[key];
        if (cellValue == null) return false;

        switch (filter.type) {
          case "text":
            const cellStr = String(cellValue).toLowerCase();
            const filterStr = filter.value.toLowerCase();
            const operator = filter.operator || "contains";

            switch (operator) {
              case "equals":
                return cellStr === filterStr;
              case "contains":
                return cellStr.includes(filterStr);
              case "startswith":
                return cellStr.startsWith(filterStr);
              default:
                return cellStr.includes(filterStr);
            }

          case "number": {
            const numValue = Number(cellValue);
            const filterNum = Number(filter.value);
            if (isNaN(numValue) || isNaN(filterNum)) return false;

            switch (filter.operator) {
              case "equals":
                return numValue === filterNum;
              case "gt":
                return numValue > filterNum;
              case "lt":
                return numValue < filterNum;
              case "gte":
                return numValue >= filterNum;
              case "lte":
                return numValue <= filterNum;
              case "between": {
                const filterNum2 = Number(filter.value2);
                if (isNaN(filterNum2)) return false;
                return numValue >= filterNum && numValue <= filterNum2;
              }
              default:
                return true;
            }
          }

          case "date": {
            const dateValue = new Date(cellValue);
            const filterDate = new Date(filter.value);
            if (isNaN(dateValue.getTime()) || isNaN(filterDate.getTime()))
              return false;

            switch (filter.operator) {
              case "equals":
                return dateValue.toDateString() === filterDate.toDateString();
              case "gt":
                return dateValue > filterDate;
              case "lt":
                return dateValue < filterDate;
              case "gte":
                return dateValue >= filterDate;
              case "lte":
                return dateValue <= filterDate;
              case "between": {
                if (!filter.value2) return false;
                const filterDate2 = new Date(filter.value2);
                if (isNaN(filterDate2.getTime())) return false;
                return dateValue >= filterDate && dateValue <= filterDate2;
              }
              default:
                return true;
            }
          }

          default:
            return true;
        }
      });
    });

    // Check if client-side filtering returned no results
    if (
      useClientSideFiltering &&
      result.length === 0 &&
      Object.keys(columnFilters).length > 0
    ) {
      // Mark that no results found in loaded chunk
      setNoResultsInChunk(true);
    } else {
      setNoResultsInChunk(false);
    }

    return result;
  }, [
    data,
    loadedChunk,
    columnFilters,
    useBackendSearch,
    useClientSideFiltering,
  ]);

  // Apply sorting
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDirection === "asc" ? 1 : -1;
      if (bVal == null) return sortDirection === "asc" ? -1 : 1;

      const aNum = Number(aVal);
      const bNum = Number(bVal);

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
      }

      const aStr = String(aVal);
      const bStr = String(bVal);
      const comparison = aStr.localeCompare(bStr);

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  // Early return if no visible columns
  if (visibleColumns.length === 0) {
    return (
      <div className="text-center py-6 text-gray-600 text-sm">
        All columns are hidden. Use the Columns menu to show at least one
        column.
      </div>
    );
  }

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
    setCurrentPage(1); // Reset to first page on sort
  };

  // Auto-trigger backend search if no results found in chunk (with debounce)
  React.useEffect(() => {
    if (
      useClientSideFiltering &&
      noResultsInChunk &&
      Object.keys(columnFilters).length > 0 &&
      onBackendSearchFallback &&
      !isSearchingBackend
    ) {
      // Wait 1.5 seconds after last filter change to avoid too many API calls
      const timeoutId = setTimeout(async () => {
        // Check again if still no results (re-check filteredData)
        const hasActiveFilters = Object.values(columnFilters).some(
          (f) => f.value && f.value !== "" && f.value !== null,
        );
        if (hasActiveFilters) {
          // Re-check if filteredData is still empty
          const sourceData = loadedChunk || data;
          if (sourceData && sourceData.length > 0) {
            // Apply filters again to check
            let testResult = [...sourceData];
            Object.entries(columnFilters).forEach(([key, filter]) => {
              if (!filter.value && filter.operator !== "between") return;
              testResult = testResult.filter((row) => {
                const cellValue = row[key];
                if (cellValue == null) return false;
                // Simple check - if it's a text filter
                if (filter.type === "text") {
                  const cellStr = String(cellValue).toLowerCase();
                  const filterStr = filter.value.toLowerCase();
                  const operator = filter.operator || "contains";
                  if (operator === "equals") return cellStr === filterStr;
                  if (operator === "contains")
                    return cellStr.includes(filterStr);
                  if (operator === "startswith")
                    return cellStr.startsWith(filterStr);
                }
                return true; // For other types, assume match for now
              });
            });

            // If still no results, trigger backend search
            if (testResult.length === 0) {
              setIsSearchingBackend(true);
              try {
                await onBackendSearchFallback(columnFilters);
              } catch (err) {
                console.error("Backend search fallback failed:", err);
              } finally {
                setIsSearchingBackend(false);
              }
            }
          }
        }
      }, 1500); // Wait 1.5 seconds after last filter change

      return () => clearTimeout(timeoutId);
    } else {
      setIsSearchingBackend(false);
    }
  }, [
    noResultsInChunk,
    columnFilters,
    useClientSideFiltering,
    onBackendSearchFallback,
    isSearchingBackend,
    loadedChunk,
    data,
  ]);

  const handleFilterChange = (
    columnKey: string,
    filterData: Partial<ColumnFilter>,
  ) => {
    const newFilter: ColumnFilter = {
      ...(columnFilters[columnKey] || {
        type: getColumnType(columnKey),
        value: "",
      }),
      ...filterData,
    };

    setColumnFilters((prev) => {
      const nextFilters: Record<string, ColumnFilter> = {
        ...prev,
        [columnKey]: newFilter,
      };

      // If value is effectively cleared, remove the filter entry
      const current = nextFilters[columnKey];
      const isEmptyValue =
        (current.value === "" || current.value == null) &&
        (current.operator !== "between" ||
          current.value2 === "" ||
          current.value2 == null);
      if (isEmptyValue) {
        delete nextFilters[columnKey];
      }

      // Notify parent about updated filters (for downloads, etc.)
      if (onFiltersChange) {
        onFiltersChange(nextFilters);
      }

      return nextFilters;
    });
    setCurrentPage(1); // Reset to first page on filter
    setNoResultsInChunk(false); // Reset no results flag
  };

  const clearFilter = (columnKey: string) => {
    setColumnFilters((prev) => {
      const updated = { ...prev };
      delete updated[columnKey];

      if (onFiltersChange) {
        onFiltersChange(updated);
      }

      return updated;
    });
    setCurrentPage(1);

    // Notify parent if backend search is enabled
    if (useBackendSearch && onColumnFilterChange) {
      onColumnFilterChange(columnKey, null);
    }
  };

  const clearAllFilters = () => {
    // Notify parent about all cleared filters if backend search is enabled (not client-side)
    if (useBackendSearch && !useClientSideFiltering && onColumnFilterChange) {
      Object.keys(columnFilters).forEach((key) => {
        onColumnFilterChange(key, null);
      });
    }

    setColumnFilters({});
    if (onFiltersChange) {
      onFiltersChange({});
    }
    setCurrentPage(1);
  };

  // Explicitly apply backend filter (used on Enter key / Apply)
  const applyBackendFilter = (columnKey: string) => {
    if (!useBackendSearch || !onColumnFilterChange) return;
    const filter = columnFilters[columnKey];
    if (!filter || !filter.value) {
      onColumnFilterChange(columnKey, null);
      return;
    }
    onColumnFilterChange(columnKey, filter);
  };

  // Reset page when data changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (data.length === 0 && !isLoading) {
    // Show message if no results found in loaded chunk
    if (
      useClientSideFiltering &&
      noResultsInChunk &&
      Object.keys(columnFilters).length > 0
    ) {
      return (
        <div className="text-center py-8">
          <div className="text-gray-500 mb-4">
            <p className="text-lg font-semibold mb-2">
              No results found in loaded{" "}
              {chunkInfo?.loadedRows.toLocaleString() || "data"} rows
            </p>
            <p className="text-sm text-gray-400">
              The data you're looking for might be in the rest of the dataset
            </p>
          </div>
          {onBackendSearchFallback && (
            <div className="space-y-3 mt-4">
              {isSearchingBackend ? (
                <div className="flex items-center justify-center gap-2 text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Searching in full dataset...</span>
                </div>
              ) : (
                <>
                  <button
                    onClick={async () => {
                      setIsSearchingBackend(true);
                      try {
                        await onBackendSearchFallback(columnFilters);
                      } catch (err) {
                        console.error("Backend search failed:", err);
                      } finally {
                        setIsSearchingBackend(false);
                      }
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Search in Full Dataset
                  </button>
                  {chunkInfo && chunkInfo.hasMoreChunks && onLoadMoreChunk && (
                    <div className="text-sm text-gray-500 mt-2">
                      or{" "}
                      <button
                        onClick={onLoadMoreChunk}
                        className="text-blue-600 hover:underline"
                      >
                        load next {chunkInfo.chunkSize.toLocaleString()} rows
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="text-center py-8 text-gray-500">No data available</div>
    );
  }

  return (
    <div className="space-y-3">
      {Object.keys(columnFilters).length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-blue-900">
                Active Filters{" "}
                {useClientSideFiltering ? "(Client-side)" : "(Backend)"}:
              </span>
              {Object.entries(columnFilters).map(([key, filter]) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                >
                  <span className="font-medium">{key}:</span>
                  <span>
                    {filter.operator === "between"
                      ? `${filter.value} - ${filter.value2}`
                      : `${filter.operator || "contains"} "${filter.value}"`}
                  </span>
                  <button
                    onClick={() => clearFilter(key)}
                    className="hover:text-blue-600 ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
              {useClientSideFiltering && chunkInfo && (
                <span className="text-xs text-blue-700">
                  ({filteredData.length} of{" "}
                  {chunkInfo.loadedRows.toLocaleString()} loaded rows)
                  {chunkInfo.hasMoreChunks && " • More data available"}
                </span>
              )}
              {noResultsInChunk && useClientSideFiltering && (
                <span className="text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded">
                  {isSearchingBackend
                    ? "Searching full dataset..."
                    : "Not found in loaded chunk"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {useClientSideFiltering &&
                chunkInfo &&
                chunkInfo.hasMoreChunks &&
                onLoadMoreChunk && (
                  <button
                    onClick={onLoadMoreChunk}
                    disabled={isLoading}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 border border-blue-300 rounded"
                  >
                    {isLoading
                      ? "Loading..."
                      : `Load Next ${(chunkInfo.chunkSize / 1000).toFixed(0)}K Rows`}
                  </button>
                )}
              <button
                onClick={clearAllFilters}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 px-1">
        <div className="relative">
          <button
            onClick={() => setShowColumnMenu((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-200"
          >
            Columns
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showColumnMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg z-50 p-3 text-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-700">Columns</span>
                <button
                  onClick={() => setShowColumnMenu(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <div className="max-h-60 overflow-auto space-y-2">
                {columns.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={!hiddenColumns.includes(col.key)}
                      onChange={() => toggleColumnVisibility(col.key)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">{col.label}</span>
                  </label>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-xs text-blue-600">
                <button
                  onClick={() => setHiddenColumns([])}
                  className="hover:underline"
                >
                  Show all
                </button>
                <button
                  onClick={() => setHiddenColumns(columns.map((c) => c.key))}
                  className="hover:underline"
                >
                  Hide all
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-auto max-h-[calc(100vh-300px)]">
        <table
          className={`border-collapse ${compact ? "text-sm" : "text-base"}`}
          style={{
            tableLayout: "fixed",
            width: "max-content",
            minWidth: "100%",
          }}
        >
          <colgroup>
            {visibleColumns.map((column) => (
              <col
                key={column.key}
                style={{
                  width: `${columnWidths[column.key]}px`,
                  minWidth: `${columnWidths[column.key]}px`,
                }}
              />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-20 bg-gray-50">
            <tr
              className={`sticky top-0 ${compact ? "bg-gray-100" : "bg-gray-50"} border-b border-gray-200`}
            >
              {visibleColumns.map((column) => {
                const colType = getColumnType(column.key);
                const hasFilter = columnFilters[column.key];
                const isSorted = sortColumn === column.key;

                return (
                  <th
                    key={column.key}
                    className={`${compact ? "px-3 py-2.5" : "px-4 py-3"} text-left text-sm font-semibold text-gray-700 relative select-none ${
                      draggedColumn === column.key ? "opacity-50" : ""
                    } overflow-visible`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, column.key)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, column.key)}
                    style={{
                      width: `${columnWidths[column.key]}px`,
                      minWidth: `${columnWidths[column.key]}px`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleSort(column.key)}
                        className="flex items-center gap-2 hover:text-blue-600 transition flex-1 cursor-move"
                      >
                        <svg
                          className="w-3 h-3 opacity-60 hover:opacity-100 text-gray-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M2 5a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H3a1 1 0 01-1-1V5zM15 5a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V5zM2 12a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H3a1 1 0 01-1-1v-2zM15 12a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2z" />
                        </svg>
                        <span>{column.label}</span>
                        {isSorted && (
                          <span className="text-blue-600">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </button>

                      <div className="flex items-center">
                        <div className="relative">
                          <button
                            data-filter-button
                            data-key={column.key}
                            onClick={(e) => {
                              const rect = (
                                e.currentTarget as HTMLElement
                              ).getBoundingClientRect();
                              // Align menu to the right edge of the button, below header
                              const menuWidth = 288; // w-72
                              setFilterMenuPos({
                                top: rect.bottom + 8,
                                left: Math.max(8, rect.right - menuWidth),
                              });
                              setShowFilterMenu(
                                showFilterMenu === column.key
                                  ? null
                                  : column.key,
                              );
                            }}
                            className={`p-1 rounded hover:bg-gray-200 transition ${
                              hasFilter ? "text-blue-600" : "text-gray-500"
                            }`}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>

                          {showFilterMenu === column.key && (
                            <div
                              data-filter-menu
                              className="w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-4"
                              style={{
                                position: "fixed",
                                top: filterMenuPos.top,
                                left: filterMenuPos.left,
                                zIndex: 50,
                              }}
                            >
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-semibold text-gray-700">
                                    Filter {column.label}
                                  </span>
                                  <button
                                    onClick={() => setShowFilterMenu(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    ×
                                  </button>
                                </div>

                                {colType === "text" && (
                                  <>
                                    <select
                                      value={
                                        columnFilters[column.key]?.operator ||
                                        "contains"
                                      }
                                      onChange={(e) =>
                                        handleFilterChange(column.key, {
                                          operator: e.target.value as any,
                                        })
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-2"
                                    >
                                      <option value="contains">Contains</option>
                                      <option value="equals">
                                        Exact Match
                                      </option>
                                      <option value="startswith">
                                        Starts With
                                      </option>
                                    </select>
                                    <input
                                      type="text"
                                      placeholder="Search..."
                                      value={
                                        columnFilters[column.key]?.value || ""
                                      }
                                      onChange={(e) =>
                                        handleFilterChange(column.key, {
                                          type: "text",
                                          value: e.target.value,
                                        })
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          applyBackendFilter(column.key);
                                        }
                                      }}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                  </>
                                )}

                                {colType === "number" && (
                                  <>
                                    <select
                                      value={
                                        columnFilters[column.key]?.operator ||
                                        "equals"
                                      }
                                      onChange={(e) =>
                                        handleFilterChange(column.key, {
                                          operator: e.target.value as any,
                                        })
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="equals">Equals</option>
                                      <option value="gt">Greater Than</option>
                                      <option value="gte">
                                        Greater Than or Equal
                                      </option>
                                      <option value="lt">Less Than</option>
                                      <option value="lte">
                                        Less Than or Equal
                                      </option>
                                      <option value="between">Between</option>
                                    </select>
                                    <input
                                      type="number"
                                      placeholder="Value"
                                      value={
                                        columnFilters[column.key]?.value || ""
                                      }
                                      onChange={(e) =>
                                        handleFilterChange(column.key, {
                                          type: "number",
                                          value: e.target.value,
                                        })
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          applyBackendFilter(column.key);
                                        }
                                      }}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                    {columnFilters[column.key]?.operator ===
                                      "between" && (
                                      <input
                                        type="number"
                                        placeholder="To"
                                        value={
                                          columnFilters[column.key]?.value2 ||
                                          ""
                                        }
                                        onChange={(e) =>
                                          handleFilterChange(column.key, {
                                            value2: e.target.value,
                                          })
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            applyBackendFilter(column.key);
                                          }
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                      />
                                    )}
                                  </>
                                )}

                                {colType === "date" && (
                                  <>
                                    <select
                                      value={
                                        columnFilters[column.key]?.operator ||
                                        "equals"
                                      }
                                      onChange={(e) =>
                                        handleFilterChange(column.key, {
                                          operator: e.target.value as any,
                                        })
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="equals">On</option>
                                      <option value="gt">After</option>
                                      <option value="gte">On or After</option>
                                      <option value="lt">Before</option>
                                      <option value="lte">On or Before</option>
                                      <option value="between">Between</option>
                                    </select>
                                    <input
                                      type="date"
                                      value={
                                        columnFilters[column.key]?.value || ""
                                      }
                                      onChange={(e) =>
                                        handleFilterChange(column.key, {
                                          type: "date",
                                          value: e.target.value,
                                        })
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          applyBackendFilter(column.key);
                                        }
                                      }}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                    {columnFilters[column.key]?.operator ===
                                      "between" && (
                                      <input
                                        type="date"
                                        value={
                                          columnFilters[column.key]?.value2 ||
                                          ""
                                        }
                                        onChange={(e) =>
                                          handleFilterChange(column.key, {
                                            value2: e.target.value,
                                          })
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            applyBackendFilter(column.key);
                                          }
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                      />
                                    )}
                                  </>
                                )}

                                {hasFilter && (
                                  <button
                                    onClick={() => {
                                      clearFilter(column.key);
                                      setShowFilterMenu(null);
                                    }}
                                    className="w-full px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm font-medium"
                                  >
                                    Clear Filter
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        {/* Visible right-edge resizer handle */}
                        <div
                          className={`absolute top-0 right-0 h-full w-1.5 cursor-col-resize ${
                            resizingColumn === column.key
                              ? "bg-blue-600"
                              : "bg-blue-400 hover:bg-blue-500"
                          }`}
                          onMouseDown={(e) => handleResizeStart(e, column.key)}
                          title="Drag to resize"
                          aria-label="Resize column"
                        />
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, index) => (
              <tr
                key={index}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-gray-100 ${
                  onRowClick ? "cursor-pointer hover:bg-gray-50" : ""
                } ${compact ? "text-sm" : "text-base"}`}
              >
                {visibleColumns.map((column) => {
                  const colType = getColumnType(column.key);
                  let cellValue = row[column.key];
                  let displayValue = "";
                  if (colType === "date" && cellValue) {
                    const dateObj = new Date(cellValue);
                    if (!isNaN(dateObj.getTime())) {
                      const dd = String(dateObj.getDate()).padStart(2, "0");
                      const mm = String(dateObj.getMonth() + 1).padStart(
                        2,
                        "0",
                      );
                      const yy = String(dateObj.getFullYear()).slice(-2);
                      displayValue = `${dd}-${mm}-${yy}`;
                    } else {
                      displayValue = String(cellValue);
                    }
                  } else {
                    displayValue = String(cellValue || "");
                  }
                  return (
                    <td
                      key={`${index}-${column.key}`}
                      className={`${compact ? "px-3 py-2.5" : "px-4 py-3"} text-gray-800 whitespace-nowrap`}
                      style={{
                        width: `${columnWidths[column.key]}px`,
                        minWidth: `${columnWidths[column.key]}px`,
                      }}
                    >
                      {displayValue}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm">
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, sortedData.length)} of{" "}
            {sortedData.length} records
            {useClientSideFiltering && chunkInfo && (
              <span className="text-emerald-600 font-medium">
                {" "}
                (filtered from {chunkInfo.loadedRows.toLocaleString()} loaded)
                {chunkInfo.hasMoreChunks && " • More available"}
              </span>
            )}
            {!useClientSideFiltering && sortedData.length !== data.length && (
              <span className="text-blue-600 font-medium">
                {" "}
                (filtered from {data.length})
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="flex items-center px-4 py-2 text-sm font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
