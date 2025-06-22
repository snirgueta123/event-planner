// src/ForgotPassword.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from './contexts/ToastContext'; // וודא שהנתיב נכון

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // קריאה ל-API של ה-Backend לבקשת איפוס סיסמה
      // הנחתי נקודת קצה כזו, ייתכן שתצטרך להתאים אותה ל-Backend שלך
      const response = await fetch('http://127.0.0.1:8000/api/users/request-password-reset/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        addToast('אם כתובת האימייל קיימת במערכת, יישלח אליה קישור לאיפוס סיסמה.', 'success');
        setEmail(''); // נקה את השדה לאחר שליחה
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.detail || errorData.email?.[0] || 'אירעה שגיאה בבקשת איפוס הסיסמה.';
        addToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('שגיאה בשליחת בקשת איפוס סיסמה:', error);
      addToast('שגיאה ברשת או בשרת. אנא נסה שוב מאוחר יותר.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 font-sans antialiased">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-6">שכחתי סיסמה</h2>
        <p className="text-center text-gray-600 mb-6">
          הזן את כתובת האימייל שלך ונשלח לך קישור לאיפוס הסיסמה.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label htmlFor="email" className="block text-gray-700 text-sm font-semibold mb-2">
              כתובת אימייל
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="הכנס כתובת אימייל"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 rounded-md text-white font-bold transition duration-200 ${
              loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }`}
          >
            {loading ? 'שולח...' : 'שלח קישור לאיפוס סיסמה'}
          </button>
        </form>
        <div className="mt-6 text-center">
          <Link to="/login" className="text-blue-600 hover:text-blue-800 text-sm font-medium transition duration-200">
            חזור לדף ההתחברות
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
