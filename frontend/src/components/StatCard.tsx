import React, { useEffect, useRef, useState } from "react";
import { reportsAPI } from "../services/api";

interface StatCardProps {
  reportId: number;
  metric: string;
  label: string;
  format?: "number" | "currency";
  aggregate?: "sum" | "max" | "min" | "count";
  currency?: string;
  locale?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  reportId,
  metric,
  label,
  format = "number",
  aggregate = "sum",
  currency = "ZAR",
  locale = "en-ZA",
}) => {
  const [value, setValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    reportsAPI
      .getPaginatedData(reportId, { page: 1, page_size: 9999 })
      .then((res) => {
        const json = res.data as {
          data?: Record<string, any>[];
          results?: Record<string, any>[];
          error?: string;
        };
        if (json.error) {
          setError(json.error);
          return;
        }
        const rows: Record<string, any>[] =
          Array.isArray(json.data) ? json.data :
          Array.isArray(json.results) ? json.results : [];

        const vals = rows
          .map((r) => Number(r[metric]))
          .filter((v) => !isNaN(v));

        if (vals.length === 0) {
          setValue(0);
          return;
        }

        let result: number;
        switch (aggregate) {
          case "max":   result = Math.max(...vals); break;
          case "min":   result = Math.min(...vals); break;
          case "count": result = vals.length;       break;
          default:      result = vals.reduce((a, b) => a + b, 0);
        }
        setValue(result);
      })
      .catch((e: any) => {
        setError(e?.response?.data?.detail || e?.message || "Failed to load");
      })
      .finally(() => setLoading(false));
  }, [reportId, metric, aggregate]);

  const display =
    loading ? "…"
    : error ? "—"
    : value === null ? "—"
    : format === "currency"
      ? value.toLocaleString(locale, {
          style: "currency",
          currency,
          maximumFractionDigits: 0,
        })
      : value.toLocaleString(locale);

  return (
    <div className="flex-1 bg-[#1a5276] text-white rounded-lg p-5 min-w-[160px]">
      <p className="text-xs uppercase tracking-widest opacity-70 mb-1">{label}</p>
      <p className="text-3xl font-bold leading-tight">
        {loading ? (
          <span className="inline-block w-16 h-7 bg-white/20 rounded animate-pulse" />
        ) : (
          display
        )}
      </p>
      {error && (
        <p className="text-xs text-red-300 mt-1">⚠ {error}</p>
      )}
    </div>
  );
};

export default StatCard;
