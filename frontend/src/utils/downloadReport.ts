import { reportsAPI } from "../services/api";

interface DownloadOptions {
  reportId: number;
  reportName: string;
  pageSize?: number;
  filterValues?: Record<string, any>;
  format?: "csv" | "json";
  onProgress?: (currentPage: number, totalPages: number, rowsDownloaded: number) => void;
}

/**
 * Downloads all report data using paginated endpoint
 * Efficiently handles large datasets by fetching in chunks
 * 
 * @param options Download configuration
 * @returns Promise that resolves when download completes
 */
export const downloadReportData = async (options: DownloadOptions): Promise<void> => {
  const {
    reportId,
    reportName,
    pageSize = 50000, // Use larger page size for downloads
    filterValues = {},
    format = "csv",
    onProgress,
  } = options;

  try {
    // First, get the first page to determine total pages
    const firstPageResponse = await reportsAPI.getPaginatedData(reportId, {
      page: 1,
      page_size: pageSize,
      filter_values: filterValues,
    });

    const firstPageData = firstPageResponse.data;
    const totalPages = firstPageData.total_pages || 1;
    const totalRows = firstPageData.count || 0;

    if (totalRows === 0) {
      throw new Error("No data available to download");
    }

    // Collect all data
    const allData: Record<string, any>[] = [...(firstPageData.results || [])];
    let rowsDownloaded = allData.length;

    // Report progress for first page
    if (onProgress) {
      onProgress(1, totalPages, rowsDownloaded);
    }

    // Fetch remaining pages
    for (let page = 2; page <= totalPages; page++) {
      const response = await reportsAPI.getPaginatedData(reportId, {
        page,
        page_size: pageSize,
        filter_values: filterValues,
      });

      const pageData = response.data.results || [];
      allData.push(...pageData);
      rowsDownloaded += pageData.length;

      // Report progress
      if (onProgress) {
        onProgress(page, totalPages, rowsDownloaded);
      }

      // Small delay to avoid overwhelming the server
      if (page < totalPages) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Convert to desired format and download
    if (format === "csv") {
      downloadAsCSV(allData, reportName);
    } else if (format === "json") {
      downloadAsJSON(allData, reportName);
    }

    return Promise.resolve();
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.error ||
        error?.response?.data?.detail ||
        error?.message ||
        "Failed to download report data"
    );
  }
};

/**
 * Converts data array to CSV format and triggers download
 */
const downloadAsCSV = (data: Record<string, any>[], filename: string): void => {
  if (data.length === 0) {
    throw new Error("No data to export");
  }

  // Get headers from first row
  const headers = Object.keys(data[0]);

  // Create CSV content
  const csvRows: string[] = [];

  // Add header row
  csvRows.push(headers.map((h) => escapeCSVValue(h)).join(","));

  // Add data rows
  data.forEach((row) => {
    const values = headers.map((header) => {
      const value = row[header];
      return escapeCSVValue(value);
    });
    csvRows.push(values.join(","));
  });

  const csvContent = csvRows.join("\n");

  // Add BOM for Excel compatibility with special characters
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });

  // Trigger download
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${sanitizeFilename(filename)}_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Converts data array to JSON format and triggers download
 */
const downloadAsJSON = (data: Record<string, any>[], filename: string): void => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${sanitizeFilename(filename)}_${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Escapes CSV values to handle commas, quotes, and newlines
 */
const escapeCSVValue = (value: any): string => {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

/**
 * Sanitizes filename to remove invalid characters
 */
const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, "_")
    .substring(0, 100); // Limit length
};


