import React, { useState } from "react";
import { DataTable, LoadingSpinner, ErrorNotification } from "../components";
import { apiClient } from "../services/api";

const BRANCHES = [
  { code: "WI A", name: "WI A" },
  { code: "SG", name: "SG" },
  { code: "BR001", name: "Branch 1" },
  { code: "BR002", name: "Branch 2" },
  { code: "BR003", name: "Branch 3" },
];

const REPORTS = [
  "Sales Report",
  "Inventory Report",
  "Customer Report",
  "Debtors Report",
];

export const DemoBranchReportPage: React.FC = () => {
  const [branch, setBranch] = useState(BRANCHES[0].code);
  const [reportName, setReportName] = useState(REPORTS[0]);
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(1000);

  const fetchReport = async (page = 1) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await apiClient.get("/reports/data-by-branch/", {
        params: {
          report_name: reportName,
          branch_code: branch,
          page,
          page_size: pageSize,
        },
      });
      // Try to extract data from common properties or use the whole response if it's an array
      let extracted =
        response.data.results ||
        response.data.data ||
        response.data.rows ||
        response.data.items ||
        (Array.isArray(response.data) ? response.data : []);
      setData(extracted);
      setTotalPages(response.data.total_pages || 1);
      setCurrentPage(page);
    } catch (err: any) {
      let backendMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        JSON.stringify(err?.response?.data) ||
        err?.message;
      setError(backendMsg || "Failed to load report data");
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Remove this useEffect to prevent auto-fetching on mount or dropdown change
  // React.useEffect(() => {
  //   fetchReport(1);
  //   // eslint-disable-next-line
  // }, [branch, reportName]);

  const columns =
    data.length > 0
      ? Object.keys(data[0]).map((key) => ({
          key,
          label: key.replace(/_/g, " ").toUpperCase(),
        }))
      : [];

  return (
    <div className="min-h-[calc(100vh-64px)] px-2 py-3">
      <div className="w-full max-w-4xl mx-auto space-y-4">
        <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-xl shadow">
          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1">
              Branch
            </label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="rounded px-3 py-2 bg-gray-100 text-gray-900 border border-gray-300 focus:ring-2 focus:ring-emerald-400"
              disabled={isLoading}
            >
              {BRANCHES.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1">
              Report
            </label>
            <select
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              className="rounded px-3 py-2 bg-gray-100 text-gray-900 border border-gray-300 focus:ring-2 focus:ring-emerald-400"
              disabled={isLoading}
            >
              {REPORTS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => fetchReport(1)}
            className="rounded bg-emerald-600 text-white px-4 py-2 font-semibold hover:bg-emerald-700"
            disabled={isLoading}
          >
            View Report
          </button>
        </div>

        {error && (
          <ErrorNotification message={error} onClose={() => setError("")} />
        )}
        {isLoading && <LoadingSpinner message="Loading report data..." />}

        {data.length > 0 && (
          <div className="bg-white rounded-xl shadow p-4">
            <DataTable columns={columns} data={data} compact />
            <div className="flex justify-center items-center gap-2 mt-4">
              <button
                onClick={() => fetchReport(currentPage - 1)}
                disabled={currentPage === 1 || isLoading}
                className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => fetchReport(currentPage + 1)}
                disabled={currentPage === totalPages || isLoading}
                className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DemoBranchReportPage;
