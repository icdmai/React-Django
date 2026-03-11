import React, { useEffect, useState } from "react";
import {
  DataTable,
  LoadingSpinner,
  ErrorNotification,
  DownloadButton,
  Navbar,
} from "../components";
import { apiClient } from "../services/api";

function useQuery() {
  return new URLSearchParams(window.location.search);
}

const PublicReportViewerPage: React.FC = () => {
  const query = useQuery();
  const reportName = query.get("report_name") || "";
  const branchCode = query.get("branch_code") || "";
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(1000);
  // Dynamically infer columns from data
  const columns = React.useMemo(() => {
    const nonEmpty = data.find(
      (row: any) => row && Object.keys(row).length > 0,
    );
    if (!nonEmpty) return [];
    return Object.keys(nonEmpty).map((key) => ({
      key,
      label: key.replace(/_/g, " ").toUpperCase(),
    }));
  }, [data]);

  useEffect(() => {
    if (!reportName || !branchCode) return;
    setIsLoading(true);
    setError("");
    apiClient
      .get("/reports/data-by-branch/", {
        params: {
          report_name: reportName,
          branch_code: branchCode,
          page: currentPage,
          page_size: pageSize,
        },
      })
      .then((response) => {
        let extracted =
          response.data.results ||
          response.data.data ||
          response.data.rows ||
          response.data.items ||
          (Array.isArray(response.data) ? response.data : []);
        setData(extracted);
        setTotalPages(response.data.total_pages || 1);
      })
      .catch((err) => {
        let backendMsg =
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          JSON.stringify(err?.response?.data) ||
          err?.message;
        setError(backendMsg || "Failed to load report data");
        setData([]);
      })
      .finally(() => setIsLoading(false));
  }, [reportName, branchCode, currentPage, pageSize]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white">
      <Navbar />
      <main className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-start p-4">
        <div className="w-full max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-1">
            <div className="space-y-0.5">
              <h1 className="text-2xl font-semibold text-white drop-shadow-sm leading-tight">
                {reportName}
              </h1>
              <span className="text-slate-200/80 text-xs leading-snug max-w-3xl">
                Branch: {branchCode}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-white/80">
              <span className="rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15 flex items-center gap-1">
                Page {currentPage} of {totalPages}
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15">
                Showing {data.length.toLocaleString()} of{" "}
                {totalPages * pageSize}
              </span>
              <DownloadButton
                reportId={0}
                reportName={reportName}
                filterValues={{ branch_code: branchCode }}
                disabled={isLoading || data.length === 0}
                variant="outline"
              />
              <button
                onClick={() => setCurrentPage(1)}
                disabled={isLoading}
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
              <ErrorNotification message={error} />
            </div>
          )}

          {isLoading && <LoadingSpinner message="Loading report data..." />}

          {data.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-white/10 bg-white shadow-lg shadow-black/10">
              <div className="bg-slate-900 px-4 py-3 text-white">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-0.5">
                    <h2 className="text-base font-semibold">Report Results</h2>
                    <span className="text-[11px] text-slate-200">
                      Showing {data.length.toLocaleString()} records
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-white">
                <DataTable data={data} columns={columns} compact />
              </div>
              <div className="flex items-center justify-center gap-2 py-4 bg-slate-50 border-t border-slate-100">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || isLoading}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm font-medium">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages || isLoading}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {data.length === 0 && !isLoading && !error && (
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
      </main>
    </div>
  );
};

export default PublicReportViewerPage;
