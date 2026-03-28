import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { reportsAPI } from "../services/api";

interface ReportWidgetProps {
  reportId: number;
  title: string;
  pageSize?: number;
}

interface WidgetMeta {
  totalRows?: number;
  syncStatus?: string;
}

export const ReportWidget: React.FC<ReportWidgetProps> = ({
  reportId,
  title,
  pageSize = 10,
}) => {
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [meta, setMeta] = useState<WidgetMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    reportsAPI
      .getPaginatedData(reportId, { page: 1, page_size: pageSize })
      .then((res) => {
        if (cancelled) return;
        const json = res.data as {
          error?: string;
          columns?: string[];
          data?: Record<string, any>[];
          results?: Record<string, any>[];
          total_rows?: number;
          total_rows_count?: number;
          count?: number;
          sync_status?: string;
        };
        if (json.error) {
          setError(json.error);
          return;
        }
        const colList = Array.isArray(json.columns) ? json.columns : [];
        const rowData =
          Array.isArray(json.data) ? json.data : Array.isArray(json.results) ? json.results : [];
        if (colList.length === 0 && rowData.length > 0) {
          setColumns(Object.keys(rowData[0]));
        } else {
          setColumns(colList);
        }
        setData(rowData);
        setMeta({
          totalRows: json.total_rows ?? json.total_rows_count ?? json.count,
          syncStatus: json.sync_status,
        });
        setError(null);
      })
      .catch((e: any) => {
        if (!cancelled) {
          setError(e?.response?.data?.detail || e?.message || "Failed to load widget");
          setData([]);
          setColumns([]);
          setMeta(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reportId, pageSize]);

  if (loading) {
    return (
      <div className="py-6 text-center text-slate-500 text-sm">Loading…</div>
    );
  }

  if (error) {
    return (
      <div className="py-4 px-3 text-rose-600 text-sm" role="alert">
        ⚠ {error}
      </div>
    );
  }

  return (
    <div
      className="rounded-lg overflow-hidden border border-slate-200"
      style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}
    >
      <div
        className="flex justify-between items-center px-3 py-2 text-white"
        style={{
          padding: "8px 12px",
          background: "#1a5276",
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <strong>{title}</strong>
        <span className="text-xs opacity-80" style={{ fontSize: "0.75rem", opacity: 0.8 }}>
          {meta?.totalRows != null ? meta.totalRows.toLocaleString() : "—"} rows
          {meta?.syncStatus != null ? ` · ${meta.syncStatus}` : ""}
        </span>
        <Link
          to={`/report/${reportId}`}
          className="text-white/90 hover:text-white text-xs font-medium ml-2"
        >
          View full →
        </Link>
      </div>
      <div className="overflow-x-auto max-h-[300px]" style={{ overflowX: "auto", maxHeight: 300 }}>
        <table
          className="w-full border-collapse text-[0.82rem]"
          style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}
        >
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c}
                  className="bg-slate-100 px-2 py-1 text-left font-medium text-slate-700"
                  style={{ background: "#eee", padding: "4px 8px", textAlign: "left" }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td
                    key={c}
                    className="px-2 py-0.5 border-b border-slate-100"
                    style={{
                      padding: "3px 8px",
                      borderBottom: "1px solid #f0f0f0",
                    }}
                  >
                    {row[c] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
