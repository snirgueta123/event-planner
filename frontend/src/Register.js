// src/Register.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from './contexts/ToastContext';

function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    addToast('מבצע הרשמה...', 'info');

    if (password !== password2) {
      addToast("הסיסמאות אינן תואמות.", 'error');
      return;
    }
    if (!username || !email || !password || !password2) {
      addToast("אנא מלא את כל השדות הנדרשים.", 'error');
      return;
    }

    try {
      const response = await fetch('https://event-planner-backend-kssg.onrender.com/api/users/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          email,
          first_name: firstName,
          last_name: lastName,
          password,
          password2,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = 'ההרשמה נכשלה.';
        if (errorData) {
          errorMessage = Object.entries(errorData)
            .map(([field, messages]) => Array.isArray(messages) ? `${field}: ${messages.join(', ')}` : `${field}: ${messages}`)
            .join('; ');
        }
        addToast(errorMessage, 'error'); // הצגת הודעת שגיאה בטוסט
        throw new Error(errorMessage); // זרוק שגיאה כדי להפעיל את ה-catch
      }

      // const data = await response.json(); // לא נחוץ אם אין צורך בנתוני התגובה
      addToast('ההרשמה בוצעה בהצלחה! אנא התחבר.', 'success'); // הצגת הודעת הצלחה בטוסט

      // אופציונלי: נווט לדף ההתחברות לאחר הרשמה מוצלחת
      setTimeout(() => {
        navigate('/login');
      }, 2000); // נווט לאחר 2 שניות

    } catch (err) {
      console.error("שגיאה בהרשמה:", err);
      //setError(err.message || 'אירעה שגיאה בלתי צפויה.'); // אין צורך בזה יותר
      if (!err.message.includes('ההרשמה נכשלה')) { // אם השגיאה כבר הוצגה בטוסט מה-if (!response.ok)
        addToast(err.message || 'אירעה שגיאה בלתי צפויה.', 'error'); // הצג שגיאה גנרית אם לא הוגדרה ספציפית
      }
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-8rem)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-lg shadow-xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            הירשם למערכת
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* הסר את שורות הודעות השגיאה/הצלחה הישנות: */}
          {/* {message && <p className="text-green-600 bg-green-100 p-3 rounded-md text-center">{message}</p>} */}
          {/* {error && <p className="text-red-600 bg-red-100 p-3 rounded-md text-center">{error}</p>} */}

          <div className="rounded-md shadow-sm -space-y-px">
            {/* שדה שם משתמש */}
            <div>
              <label htmlFor="username" className="sr-only">שם משתמש</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="שם משתמש"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            {/* שדה אימייל */}
            <div>
              <label htmlFor="email" className="sr-only">אימייל</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="אימייל"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {/* שדה שם פרטי */}
            <div>
              <label htmlFor="first-name" className="sr-only">שם פרטי</label>
              <input
                id="first-name"
                name="first-name"
                type="text"
                autoComplete="given-name"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="שם פרטי (אופציונלי)"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            {/* שדה שם משפחה */}
            <div>
              <label htmlFor="last-name" className="sr-only">שם משפחה</label>
              <input
                id="last-name"
                name="last-name"
                type="text"
                autoComplete="family-name"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="שם משפחה (אופציונלי)"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            {/* שדה סיסמה */}
            <div>
              <label htmlFor="password" className="sr-only">סיסמה</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="סיסמה"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {/* שדה אימות סיסמה */}
            <div>
              <label htmlFor="password2" className="sr-only">אמת סיסמה</label>
              <input
                id="password2"
                name="password2"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="אמת סיסמה"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out"
            >
              הירשם
            </button>
          </div>
        </form>
        <div className="text-center text-sm">
          <p className="text-gray-600">
            כבר יש לך חשבון?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              התחבר כאן
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
