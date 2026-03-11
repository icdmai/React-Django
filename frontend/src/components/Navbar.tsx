import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  const isReportView = location.pathname.startsWith("/report/");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav
      className={
        isReportView
          ? "bg-slate-900/70 border-b border-white/10 backdrop-blur"
          : "bg-white shadow-lg"
      }
    >
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <div
          className={
            isReportView
              ? "text-2xl font-bold text-white drop-shadow-sm"
              : "text-2xl font-bold text-blue-600"
          }
        >
          BI Dashboard
        </div>

        {user && (
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                isReportView
                  ? "text-white hover:bg-white/10 ring-1 ring-white/10"
                  : "hover:bg-gray-100 text-gray-800"
              }`}
            >
              <span className="font-medium text-gray-800">
                <span className={isReportView ? "text-white" : "text-gray-800"}>
                  {user.first_name || user.email}
                </span>
              </span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {isDropdownOpen && (
              <div
                className={`absolute right-0 mt-2 w-48 rounded-lg py-2 z-50 shadow-lg ${
                  isReportView ? "bg-slate-900/90 border border-white/10" : "bg-white"
                }`}
              >
                <div
                  className={`px-4 py-2 border-b ${
                    isReportView ? "border-white/10 text-white" : "border-gray-200 text-gray-800"
                  }`}
                >
                  <p className="text-sm font-medium">{user.email}</p>
                </div>
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    navigate("/profile");
                  }}
                  className={`w-full text-left px-4 py-2 text-sm ${
                    isReportView
                      ? "hover:bg-white/10 text-slate-100"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className={`w-full text-left px-4 py-2 text-sm ${
                    isReportView
                      ? "hover:bg-white/10 text-rose-200"
                      : "hover:bg-gray-100 text-red-600"
                  }`}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};
