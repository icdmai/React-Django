import React from "react";

interface ErrorNotificationProps {
  message: string;
  onClose?: () => void;
}

export const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  message,
  onClose,
}) => {
  return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center">
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="text-red-700 hover:text-red-900 font-bold"
        >
          ✕
        </button>
      )}
    </div>
  );
};

interface SuccessNotificationProps {
  message: string;
  onClose?: () => void;
}

export const SuccessNotification: React.FC<SuccessNotificationProps> = ({
  message,
  onClose,
}) => {
  return (
    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg flex justify-between items-center">
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="text-green-700 hover:text-green-900 font-bold"
        >
          ✕
        </button>
      )}
    </div>
  );
};
