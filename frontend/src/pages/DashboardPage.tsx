import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LoadingSpinner, ErrorNotification, ReportWidget } from "../components";
import { ChartWidget } from "../components/ChartWidget";
import { StatCard } from "../components/StatCard";
import { reportsAPI } from "../services/api";

interface DashboardWidget {
  report_id: number;
  title?: string;
  page_size?: number;
  col_span?: number;
  widget_type?: "bar_chart" | "pie_chart" | "line_chart" | "table";
  x_axis?: string;
  y_axis?: string;
}

interface DashboardStatCard {
  report_id: number;
  metric: string;
  label: string;
  aggregate?: "sum" | "max" | "min" | "count";
  format?: "number" | "currency";
}

export const DashboardPage: React.FC = () => {
  const { dashboardId } = useParams<{ dashboardId?: string }>();
  const { user, isLoading } = useAuth();
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [statCards, setStatCards] = useState<DashboardStatCard[]>([]);
  const [title, setTitle] = useState("");
  const [dashboardError, setDashboardError] = useState("");
  const [stats, setStats] = useState({
    totalReports: 0,
    recentReports: 0,
  });
  const [error, setError] = useState("");

  // Widget-based dashboard when dashboardId is in the URL
  useEffect(() => {
    if (!dashboardId) return;
    const id = Number(dashboardId);
    if (!id) return;

    const token = localStorage.getItem("access_token");
    if (!token) return;

    reportsAPI
      .getDashboard(id)
      .then((res) => {
        const data = res.data as { name?: string; dashboard_widgets?: DashboardWidget[]; stat_cards?: DashboardStatCard[] };
        setTitle(data.name || "Dashboard");
        setWidgets(data.dashboard_widgets || []);
        setStatCards(data.stat_cards || []);
        setDashboardError("");
      })
      .catch(() => {
        setDashboardError("Failed to load dashboard");
        setWidgets([]);
        setTitle("");
      });
  }, [dashboardId]);

  // Welcome/stats when no dashboardId
  useEffect(() => {
    if (dashboardId) return;
    const fetchStats = async () => {
      try {
        const { data } = await reportsAPI.listReports();
        const items = data?.results ?? data ?? [];
        setStats({
          totalReports: Array.isArray(items) ? items.length : 0,
          recentReports: Math.min(Array.isArray(items) ? items.length : 0, 5),
        });
      } catch (err) {
        setError("Failed to load dashboard data");
      }
    };

    if (user) {
      fetchStats();
    }
  }, [user, dashboardId]);

  if (isLoading && !dashboardId) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  // Widget dashboard view (when dashboardId is set)
  if (dashboardId) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">{title || "Dashboard"}</h1>
          {dashboardError && (
            <div className="mb-6">
              <ErrorNotification message={dashboardError} onClose={() => setDashboardError("")} />
            </div>
          )}
          {statCards.length > 0 && (
            <div className="flex gap-4 mb-6 flex-wrap">
              {statCards.map((sc, i) => (
                <StatCard
                  key={i}
                  reportId={sc.report_id}
                  metric={sc.metric}
                  label={sc.label}
                  aggregate={sc.aggregate}
                  format={sc.format}
                />
              ))}
            </div>
          )}
          <div
            className="grid gap-4"
            style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)" }}
          >
            {widgets.map((w) => (
              <div
                key={w.report_id}
                style={{ gridColumn: `span ${w.col_span ?? 6}` }}
              >
                {w.widget_type && w.widget_type !== "table" ? (
                  <ChartWidget
                    reportId={w.report_id}
                    title={w.title ?? `Report ${w.report_id}`}
                    pageSize={w.page_size ?? 20}
                    widgetType={w.widget_type}
                    xAxis={w.x_axis}
                    yAxis={w.y_axis}
                  />
                ) : (
                  <ReportWidget
                    reportId={w.report_id}
                    title={w.title ?? `Report ${w.report_id}`}
                    pageSize={w.page_size ?? 10}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Default welcome view (no dashboardId)
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800">
            Welcome, {user?.first_name || user?.email}!
          </h1>
          <p className="text-gray-600 mt-2">
            Here's a summary of your BI Dashboard activity
          </p>
        </div>

        {error && (
          <div className="mb-6">
            <ErrorNotification message={error} onClose={() => setError("")} />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Reports</p>
                <p className="text-3xl font-bold text-gray-800">
                  {stats.totalReports}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Recent Reports</p>
                <p className="text-3xl font-bold text-gray-800">
                  {stats.recentReports}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Account Status</p>
                <p className="text-3xl font-bold text-green-600">Active</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/reports"
              className="block p-4 border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition text-center"
            >
              <p className="text-lg font-semibold text-blue-600">Browse Reports</p>
              <p className="text-sm text-gray-600">View and execute available reports</p>
            </a>
            <a
              href="/profile"
              className="block p-4 border-2 border-purple-200 rounded-lg hover:bg-purple-50 transition text-center"
            >
              <p className="text-lg font-semibold text-purple-600">View Profile</p>
              <p className="text-sm text-gray-600">Manage your account settings</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
