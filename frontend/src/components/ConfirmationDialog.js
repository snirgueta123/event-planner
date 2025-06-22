// src/components/ConfirmationDialog.js
import React from 'react';

function ConfirmationDialog({ isOpen, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null; // אם הדיאלוג לא פתוח, אל תציג כלום

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-auto">
        {/* כותרת הדיאלוג */}
        <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
          {title}
        </h3>
        {/* הודעת הדיאלוג */}
        <p className="text-gray-700 mb-6 text-center">
          {message}
        </p>
        {/* כפתורי פעולה */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-150 ease-in-out"
          >
            ביטול
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-red-600 text-white font-bold rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-150 ease-in-out"
          >
            אישור
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationDialog;
