// src/Login.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from './contexts/ToastContext';
import { useAuth } from './contexts/AuthContext';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { login } = useAuth();


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    addToast('מתחבר...', 'info');

    try {
      const response = await fetch('https://event-planner-backend-kssg.onrender.com/api/users/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = 'התחברות נכשלה. אנא בדוק את שם המשתמש והסיסמה.';
        if (errorData.non_field_errors) {
          errorMessage = errorData.non_field_errors.join(', ');
        } else if (errorData.username) {
            errorMessage = `שם משתמש: ${errorData.username.join(', ')}`;
        } else if (errorData.password) {
            errorMessage = `סיסמה: ${errorData.password.join(', ')}`;
        }
        addToast(errorMessage, 'error');
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("Login.js: Calling AuthContext login with data:", data);
      login(data.token, { id: data.user_id, username: data.username, email: data.email });

      navigate('/', { state: { refreshEvents: true } });
    } catch (err) {
      console.error("Login.js: שגיאה בהתחברות:", err);
      if (!err.message.includes('התחברות נכשלה')) {
        addToast(err.message || 'אירעה שגיאה בלתי צפויה.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-8rem)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-lg shadow-xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            התחבר לחשבונך
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
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
            <div>
              <label htmlFor="password" className="sr-only">סיסמה</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="סיסמה"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out`}
            >
              {loading ? 'מתחבר...' : 'התחבר'} {}
            </button>
          </div>
        </form>
        <div className="text-center text-sm space-y-2"> {}
          <p className="text-gray-600">
            עדיין אין לך חשבון?{' '}
            <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
              הירשם כאן
            </Link>
          </p>
          <p className="text-gray-600">
            <Link to="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
              שכחתי סיסמה?
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
