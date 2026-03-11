import React from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient as axios } from "../services/api";
import { DataTable, LoadingSpinner, ErrorNotification } from "../components";

const MultiBranchReportViewerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const branchCodes = searchParams.get("branch_codes") || "";
  const reportName = searchParams.get("report_name") || "Debtors Report";
  const [reportData, setReportData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [tableData, setTableData] = React.useState<any[]>([]);
  const [columns, setColumns] = React.useState<{ key: string; label: string }[]>([]);

  React.useEffect(() => {
    if (!branchCodes) return;
    setLoading(true);
    setError("");
    axios
      .get("/reports/data-by-branches", {
        params: {
          report_name: reportName,
          branch_codes: branchCodes,
          page: 1,
          page_size: 1000,
        },
      })
      .then((res) => {
        setReportData(res.data);
        // Extract table data and columns
        if (res.data && res.data.columns && res.data.data) {
          // If backend provides columns in correct format, use them; otherwise, map
          if (Array.isArray(res.data.columns) && typeof res.data.columns[0] === 'string') {
            setColumns(res.data.columns.map((col: string) => ({ key: col, label: col })));
          } else {
            setColumns(res.data.columns);
          }
          setTableData(res.data.data);
        } else if (res.data && Array.isArray(res.data)) {
          // Fallback for array response
          setTableData(res.data);
          setColumns(res.data.length > 0 ? Object.keys(res.data[0]).map((col) => ({ key: col, label: col })) : []);
        } else if (typeof res.data === "object" && res.data !== null) {
          // Single object response
          setTableData([res.data]);
          setColumns(Object.keys(res.data).map((col) => ({ key: col, label: col })));
        }
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || "Error loading report");
      })
      .finally(() => setLoading(false));
  }, [branchCodes, reportName]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <h2 className="text-xl font-bold mb-4">Multi-Branch Debtors Report Viewer</h2>
      {loading && <LoadingSpinner />}
      {error && <ErrorNotification message={error} />}
      {!branchCodes && <div className="text-gray-500">No branch codes provided.</div>}
      {!loading && !error && tableData.length > 0 && (
        <div className="bg-white w-full">
          <DataTable columns={columns} data={tableData} compact />
        </div>
      )}
    </div>
  );
};

export default MultiBranchReportViewerPage;
