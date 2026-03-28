import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from "recharts";
import { reportsAPI } from "../services/api";

interface ChartWidgetProps {
  reportId: number;
  title: string;
  pageSize?: number;
  widgetType: "bar_chart" | "pie_chart" | "line_chart" | "table";
  xAxis?: string;
  yAxis?: string;
}

const COLORS = ["#1a5276", "#2e86c1", "#27ae60", "#e67e22", "#e74c3c", "#8e44ad", "#16a085"];

export const ChartWidget: React.FC<ChartWidgetProps> = ({
  reportId, title, pageSize = 20, widgetType, xAxis, yAxis,
}) => {
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    reportsAPI
      .getPaginatedData(reportId, { page: 1, page_size: pageSize })
      .then((res) => {
        if (cancelled) return;
        const json = res.data as any;
        if (json.error) { setError(json.error); return; }
        const rows = Array.isArray(json.data) ? json.data : Array.isArray(json.results) ? json.results : [];
        const cols = Array.isArray(json.columns) ? json.columns : rows.length > 0 ? Object.keys(rows[0]) : [];
        setData(rows);
        setColumns(cols);
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.response?.data?.detail || e?.message || "Failed to load");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reportId, pageSize]);

  const header = (
    <div style={{ padding: "8px 12px", background: "#1a5276", color: "#fff", display: "flex", justifyContent: "space-between" }}>
      <strong>{title}</strong>
      <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>{data.length} rows</span>
    </div>
  );

  if (loading) return <div style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>{header}<div style={{ padding: 40, textAlign: "center", color: "#888" }}>Loading…</div></div>;
  if (error)   return <div style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>{header}<div style={{ padding: 16, color: "#e74c3c" }}>⚠ {error}</div></div>;

  const xKey = xAxis || columns[0] || "";
  const yKey = yAxis || columns[1] || "";

  const chartContent = () => {
    if (widgetType === "bar_chart") {
      return (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} angle={-35} textAnchor="end" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey={yKey} fill="#1a5276" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (widgetType === "line_chart") {
      return (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} angle={-35} textAnchor="end" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey={yKey} stroke="#1a5276" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (widgetType === "pie_chart") {
      return (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={data} dataKey={yKey} nameKey={xKey} cx="50%" cy="50%" outerRadius={100} label>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    // table fallback
    return (
      <div style={{ overflowX: "auto", maxHeight: 300 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead>
            <tr>{columns.map(c => <th key={c} style={{ background: "#eee", padding: "4px 8px", textAlign: "left" }}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>{columns.map(c => <td key={c} style={{ padding: "3px 8px", borderBottom: "1px solid #f0f0f0" }}>{row[c] ?? ""}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
      {header}
      <div style={{ padding: "12px 8px" }}>
        {chartContent()}
      </div>
    </div>
  );
};
