import React from "react";
import { useNavigate } from "react-router-dom";
import ChangePasswordForm from "../components/ChangePasswordForm";
import { useAuth } from "../contexts/AuthContext";

export const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { fetchUser } = useAuth();

  return (
    <div className="min-h-[calc(100vh-64px)] px-4 py-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow p-6">
        <h1 className="text-xl font-bold text-gray-900">Change Password</h1>
        <p className="text-sm text-gray-600 mt-1">
          For security reasons, you must change your password before continuing.
        </p>

        <div className="mt-6">
          <ChangePasswordForm
            onSuccess={async () => {
              await fetchUser();
              navigate("/dashboard", { replace: true });
            }}
          />
        </div>
      </div>
    </div>
  );
};

