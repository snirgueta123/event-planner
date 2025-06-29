// src/ResetPassword.js
import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useToast } from './contexts/ToastContext'; // וודא שהנתיב נכון

function ResetPassword() {
  // קבלת UIDB64 ו-TOKEN מה-URL
  const { uidb64, token } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  // בדיקה ראשונית של הפרמטרים מה-URL
  useEffect(() => {
    if (!uidb64 || !token) {
      addToast('קישור איפוס הסיסמה אינו תקין. חסרים פרמטרים.', 'error');
      navigate('/forgot-password'); // הפנה חזרה לדף שכחתי סיסמה
    }
  }, [uidb64, token, navigate, addToast]);

  const validateForm = () => {
    if (!password || !password2) {
      setValidationError('אנא מלא את כל השדות.');
      return false;
    }
    if (password !== password2) {
      setValidationError('הסיסמאות אינן תואמות.');
      return false;
    }
    if (password.length < 6) { // בהתאם לדרישות ה-Backend שלך (MinimumLengthValidator)
      setValidationError('הסיסמה חייבת להכיל לפחות 6 תווים.');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    addToast('מאפס סיסמה...', 'info');

    try {
      const response = await fetch('https://event-planner-backend-kssg.onrender.com/api/users/set-new-password/', { // נקודת קצה ב-Backend
        method: 'POST', // Backend מוגדר כ-POST עבור SetNewPasswordView
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uidb64,
          token,
          password,
          password2,
        }),
      });

      if (response.ok) {
        addToast('הסיסמה אופסה בהצלחה! כעת תוכל להתחבר.', 'success');
        navigate('/login'); // הפנה לדף ההתחברות לאחר איפוס מוצלח
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.message || errorData.detail || errorData.password?.[0] || 'אירעה שגיאה באיפוס הסיסמה.';
        addToast(errorMessage, 'error');
        setValidationError(errorMessage); // הצג שגיאה בתוך הטופס גם כן
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
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-6">איפוס סיסמה</h2>
        <p className="text-center text-gray-600 mb-6">
          הזן סיסמה חדשה עבור חשבונך.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label htmlFor="password" className="block text-gray-700 text-sm font-semibold mb-2">
              סיסמה חדשה
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="הכנס סיסמה חדשה"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
            />
          </div>
          <div className="mb-5">
            <label htmlFor="password2" className="block text-gray-700 text-sm font-semibold mb-2">
              אשר סיסמה חדשה
            </label>
            <input
              type="password"
              id="password2"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder="אשר סיסמה חדשה"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
            />
          </div>
          {validationError && (
            <p className="text-red-500 text-sm mb-4 text-center">{validationError}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 rounded-md text-white font-bold transition duration-200 ${
              loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }`}
          >
            {loading ? 'מאפס...' : 'אפס סיסמה'}
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

export default ResetPassword;
