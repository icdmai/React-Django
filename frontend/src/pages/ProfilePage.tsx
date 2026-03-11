import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  LoadingSpinner,
  ErrorNotification,
  SuccessNotification,
} from "../components";

export const ProfilePage: React.FC = () => {
  const { user, logout, isLoading } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setSuccessMessage("You have been logged out successfully");
    setTimeout(() => {
      navigate("/login");
    }, 1500);
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading profile..." />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <ErrorNotification message="User profile not found" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Profile</h1>
          <p className="text-gray-600 mt-2">Manage your account settings</p>
        </div>

        {successMessage && (
          <div className="mb-6">
            <SuccessNotification message={successMessage} />
          </div>
        )}

        {/* User Info Card */}
        <div className="bg-white rounded-lg shadow p-8 mb-6">
          <div className="flex items-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {user.first_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </div>
            <div className="ml-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {user.first_name || "User"}
              </h2>
              <p className="text-gray-600">{user.email}</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Account Information
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600">User ID</span>
                <span className="font-medium text-gray-800">{user.id}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600">Email</span>
                <span className="font-medium text-gray-800">{user.email}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600">First Name</span>
                <span className="font-medium text-gray-800">
                  {user.first_name || "—"}
                </span>
              </div>

              <div className="flex justify-between items-center py-3">
                <span className="text-gray-600">Last Name</span>
                <span className="font-medium text-gray-800">
                  {user.last_name || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Minimal Logout Section */}
        <div className="bg-white rounded-lg shadow p-8">
          {!showLogoutConfirm ? (
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition font-medium"
            >
              Logout
            </button>
          ) : (
            <div className="flex gap-4">
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition font-medium"
              >
                Confirm Logout
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="bg-gray-300 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-400 transition font-medium"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
