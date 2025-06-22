// src/components/ToastNotification.js
import React, { useEffect, useState } from 'react';

function ToastNotification({ id, message, type, onClose }) {
  // קביעת צבעי רקע וטקסט לפי סוג ההודעה
  const typeClasses = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    info: 'bg-blue-500 text-white',
  };

  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false); // הפוך את ההודעה לבלתי נראית
    }, 5000);

    const removeTimer = setTimeout(() => {
      onClose(id);
    }, 5500); // קצת יותר זמן מהטיימר הראשי כדי לאפשר אנימציית ירידה

    return () => {
      clearTimeout(timer);
      clearTimeout(removeTimer);
    };
  }, [id, onClose]);

  const animationClasses = isVisible
    ? 'animate-fade-in-down' // אנימציית כניסה: נכנס מלמעלה
    : 'animate-fade-out-up';   // אנימציית יציאה: יוצא כלפי מעלה

  return (
    <div
      className={`
        ${typeClasses[type] || 'bg-gray-700 text-white'}
        p-4 rounded-lg shadow-lg mb-4 flex items-center justify-between
        transform transition-all duration-500 ease-out
        ${animationClasses}
      `}
      role="alert" // לנגישות
    >
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={() => setIsVisible(false)} // סמן לנסתר בעת לחיצה על כפתור הסגירה
        className="ml-4 p-1 rounded-full hover:bg-opacity-75 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
        aria-label="Close" // לנגישות
      >
        {/* אייקון X באמצעות SVG */}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  );
}

export default ToastNotification;
