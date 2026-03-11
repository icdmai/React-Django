import React from "react";
import { Link, useLocation } from "react-router-dom";

export const Sidebar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="w-64 bg-gray-900 text-white h-screen overflow-y-auto">
      <div className="p-6">
        <div className="text-xl font-bold mb-8">Navigation</div>

        <nav className="space-y-4">
          <Link
            to="/dashboard"
            className={`block px-4 py-3 rounded-lg transition ${
              isActive("/dashboard")
                ? "bg-blue-600 text-white"
                : "hover:bg-gray-800 text-gray-300"
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" />
                <path
                  fillRule="evenodd"
                  d="M3 10a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6z"
                  clipRule="evenodd"
                />
              </svg>
              Dashboard
            </span>
          </Link>

          <Link
            to="/reports"
            className={`block px-4 py-3 rounded-lg transition ${
              isActive("/reports")
                ? "bg-blue-600 text-white"
                : "hover:bg-gray-800 text-gray-300"
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path
                  fillRule="evenodd"
                  d="M4 5a2 2 0 012-2 1 1 0 000-2H6a4 4 0 014 4v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm2 3a1 1 0 000 2h2a1 1 0 100-2H6z"
                  clipRule="evenodd"
                />
              </svg>
              Reports
            </span>
          </Link>

          <Link
            to="/profile"
            className={`block px-4 py-3 rounded-lg transition ${
              isActive("/profile")
                ? "bg-blue-600 text-white"
                : "hover:bg-gray-800 text-gray-300"
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
              Profile
            </span>
          </Link>
        </nav>
      </div>
    </div>
  );
};
