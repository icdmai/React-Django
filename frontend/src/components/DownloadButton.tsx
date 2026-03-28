import React, { useState } from "react";

interface DownloadButtonProps {
  reportId: number;
  reportName: string;
  filterValues?: Record<string, any>;
  disabled?: boolean;
  className?: string;
  variant?: "primary" | "secondary" | "outline";
}

/**
 * DownloadButton - Downloads report data as CSV using paginated endpoint
 * 
 * Efficiently handles large datasets by fetching data in chunks
 */
export const DownloadButton: React.FC<DownloadButtonProps> = ({
  reportId,
  reportName,
  filterValues = {},
  disabled = false,
  className = "",
  variant = "primary",
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<{
    currentPage: number;
    totalPages: number;
    rowsDownloaded: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (isDownloading || disabled) return;

    setIsDownloading(true);
    setError(null);
    setProgress(null);

    // Debug logging
    console.log("DownloadButton: reportId", reportId);
    console.log("DownloadButton: filterValues", filterValues);
    // Log the full filterValues object for inspection
    console.log("DownloadButton: filterValues (full)", JSON.stringify(filterValues, null, 2));
    try {
      const { downloadReportData } = await import("../utils/downloadReport");

      await downloadReportData({
        reportId,
        reportName,
        pageSize: 1000, // Use larger page size for downloads
        filterValues,
        format: "csv",
        onProgress: (currentPage, totalPages, rowsDownloaded) => {
          setProgress({ currentPage, totalPages, rowsDownloaded });
        },
      });

      // Reset progress after a short delay
      setTimeout(() => {
        setProgress(null);
        setIsDownloading(false);
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Download failed");
      setIsDownloading(false);
      setProgress(null);
    }
  };

  const baseClasses =
    "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed";

  const variantClasses = {
    primary:
      "bg-emerald-600 text-white ring-1 ring-emerald-500 hover:bg-emerald-700",
    secondary:
      "bg-slate-600 text-white ring-1 ring-slate-500 hover:bg-slate-700",
    outline:
      "bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15",
  };

  return (
    <div className="relative">
      <button
        onClick={handleDownload}
        disabled={isDownloading || disabled}
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        title={isDownloading ? "Downloading..." : "Download as CSV"}
      >
        {isDownloading ? (
          <>
            <svg
              className="animate-spin h-3.5 w-3.5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Downloading...
          </>
        ) : (
          <>
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download CSV
          </>
        )}
      </button>

      {/* Progress indicator */}
      {progress && (
        <div className="absolute top-full left-0 mt-2 w-64 rounded-lg bg-slate-900 text-white p-3 text-xs shadow-lg z-50">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Downloading...</span>
            <span>
              {progress.currentPage} / {progress.totalPages}
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5 mb-1">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all"
              style={{
                width: `${(progress.currentPage / progress.totalPages) * 100}%`,
              }}
            ></div>
          </div>
          <div className="text-slate-300">
            {progress.rowsDownloaded.toLocaleString()} rows downloaded
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute top-full left-0 mt-2 w-64 rounded-lg bg-rose-900 text-white p-3 text-xs shadow-lg z-50">
          <div className="font-semibold text-rose-200 mb-1">Download Failed</div>
          <div className="text-rose-300">{error}</div>
        </div>
      )}
    </div>
  );
};


