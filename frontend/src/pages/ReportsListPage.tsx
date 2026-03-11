import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable, LoadingSpinner, ErrorNotification } from "../components";
import { reportsAPI } from "../services/api";

interface Report {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

export const ReportsListPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setIsLoading(true);
        const { data } = await reportsAPI.listReports();
        setReports(
          Array.isArray(data?.results)
            ? data.results
            : Array.isArray(data)
              ? data
              : [],
        );
      } catch (err: any) {
        setError(err?.message || "Failed to load reports");
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, []);

  const handleReportClick = (report: Report) => {
    navigate(`/report/${report.id}`, { state: { report } });
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading reports..." />;
  }

  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Report Name" },
    { key: "description", label: "Description" },
    { key: "created_at", label: "Created At" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Reports</h1>
          <p className="text-gray-600 mt-2">
            Browse and execute available reports
          </p>
        </div>

        {error && (
          <div className="mb-6">
            <ErrorNotification message={error} onClose={() => setError("")} />
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <DataTable
            columns={columns}
            data={reports}
            isLoading={isLoading}
            onRowClick={handleReportClick}
          />
        </div>

        {reports.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No reports available</p>
          </div>
        )}
      </div>
    </div>
  );
};
