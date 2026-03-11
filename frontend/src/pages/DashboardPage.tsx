import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { LoadingSpinner, ErrorNotification } from "../components";
import { reportsAPI } from "../services/api";
import DemoBranchReportPage from "./DemoBranchReportPage";

export const DashboardPage: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [stats, setStats] = useState({
    totalReports: 0,
    recentReports: 0,
  });
  const [error, setError] = useState("");

  useEffect(() => {
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
  }, [user]);

  if (isLoading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Reports</p>
                <p className="text-3xl font-bold text-gray-800">
                  {stats.totalReports}
                </p>
              </div>
              {/* Icon removed for production-safe UI */}
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
              {/* Icon removed for production-safe UI */}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Account Status</p>
                <p className="text-3xl font-bold text-green-600">Active</p>
              </div>
              {/* Icon removed for production-safe UI */}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/reports"
              className="block p-4 border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition text-center"
            >
              <p className="text-lg font-semibold text-blue-600">
                Browse Reports
              </p>
              <p className="text-sm text-gray-600">
                View and execute available reports
              </p>
            </a>
            <a
              href="/profile"
              className="block p-4 border-2 border-purple-200 rounded-lg hover:bg-purple-50 transition text-center"
            >
              <p className="text-lg font-semibold text-purple-600">
                View Profile
              </p>
              <p className="text-sm text-gray-600">
                Manage your account settings
              </p>
            </a>
          </div>
        </div>

        {/* Demo Branch Report section removed for production UI */}
      </div>
    </div>
  );
};
